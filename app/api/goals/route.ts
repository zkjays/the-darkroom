import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { convertXPToPoints } from "@/app/lib/xp-system";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";

function today() {
  return new Date().toISOString().split("T")[0];
}

function sessionHandle(session: object | null): string | undefined {
  return (session as any)?.handle as string | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// GET /api/goals?handle=X                    — fetch today's goals for handle
// GET /api/goals?handle=X&all=true           — fetch all goals (no date filter), newest first
// GET /api/goals?handle=X&completed=true     — filter to completed only
// GET /api/goals?handle=X&public_only=true   — only public goals today
// GET /api/goals?templates=true&limit=10     — trending public goal templates
export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  const templatesMode = req.nextUrl.searchParams.get("templates") === "true";
  const publicOnly = req.nextUrl.searchParams.get("public_only") === "true";
  const allMode = req.nextUrl.searchParams.get("all") === "true";
  const completedOnly = req.nextUrl.searchParams.get("completed") === "true";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "10", 10);

  const db = getServiceSupabase();

  if (templatesMode) {
    const { data, error } = await db
      .from("daily_goals")
      .select("id, handle, goal_text, target_stat, proof_type, copy_count, created_at")
      .eq("is_public", true)
      .order("copy_count", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Templates fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
    }
    return NextResponse.json({ templates: data ?? [] });
  }

  if (!handle) return NextResponse.json({ error: "Missing handle" }, { status: 400 });

  let query = db
    .from("daily_goals")
    .select("*")
    .eq("handle", handle)
    .order("created_at", { ascending: allMode ? false : true });

  if (!allMode) query = query.eq("goal_date", today());
  if (publicOnly) query = query.eq("is_public", true);
  if (completedOnly) query = query.eq("status", "completed");

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  return NextResponse.json({ goals: data ?? [] });
}

// POST /api/goals — create a new goal
// If proof_value is provided the goal is created as immediately completed (Work tab submission).
// Direct completions bypass the 3-goal daily limit.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { handle, goal_text, proof_type, proof_value, target_stat, is_public, template_id } = await req.json();

  if (!handle || !goal_text || !proof_type || !target_stat) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (sessionHandle(session) !== handle) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceSupabase();

  // Check handle exists
  const { data: user, error: userError } = await db
    .from("darkroom_ids")
    .select("handle")
    .eq("handle", handle)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "Handle not found" }, { status: 404 });
  }

  const isDirectComplete = !!proof_value;

  // Enforce 3-goal daily limit only for pending goals (not direct-complete Work submissions)
  if (!isDirectComplete) {
    const { count } = await db
      .from("daily_goals")
      .select("*", { count: "exact", head: true })
      .eq("handle", handle)
      .eq("goal_date", today());

    if ((count ?? 0) >= 3) {
      return NextResponse.json({ error: "max_goals_reached" }, { status: 400 });
    }
  }

  const now = new Date().toISOString();

  const { data: goal, error: insertError } = await db
    .from("daily_goals")
    .insert({
      handle,
      goal_text,
      proof_type,
      proof_value: proof_value ?? null,
      target_stat,
      status: isDirectComplete ? "completed" : "pending",
      completed_at: isDirectComplete ? now : null,
      xp_reward: 1,
      goal_date: today(),
      is_public: is_public ?? false,
      template_id: template_id ?? null,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });

  // If direct-complete (Work submission), run XP logic immediately
  if (isDirectComplete && goal) {
    const xpResult = await convertXPToPoints(db, handle, target_stat, 1);
    try {
      await db.from("xp_earnings").insert({
        handle,
        source: "goal_complete",
        amount: 1,
        meta: { goal_id: goal.id, stat: target_stat, points_gained: xpResult.points_gained },
      });
    } catch (e) {
      console.error("xp_earnings insert failed:", e);
    }
    return NextResponse.json({ goal, xp: xpResult });
  }

  // If copied from a template, increment that template's copy_count and award XP to creator
  if (template_id) {
    const { data: templateRow } = await db
      .from("daily_goals")
      .select("handle, copy_count")
      .eq("id", template_id)
      .single();

    if (templateRow) {
      await db
        .from("daily_goals")
        .update({ copy_count: (templateRow.copy_count ?? 0) + 1 })
        .eq("id", template_id);

      const { data: creatorRow } = await db
        .from("darkroom_ids")
        .select("bonus_points")
        .eq("handle", templateRow.handle)
        .single();

      await db
        .from("darkroom_ids")
        .update({ bonus_points: (creatorRow?.bonus_points ?? 0) + 1 })
        .eq("handle", templateRow.handle);

      await db.from("xp_earnings").insert({
        handle: templateRow.handle,
        source: "template_copy",
        amount: 1,
        meta: { copied_by: handle, goal_id: template_id },
      });
    }
  }

  return NextResponse.json({ goal });
}

// PATCH /api/goals — complete a goal with proof
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { handle: authHandle, goal_id, proof_value } = await req.json();
  if (!goal_id || !proof_value) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db = getServiceSupabase();
  const todayStr = today();

  // Fetch the goal to get handle
  const { data: goal, error: getError } = await db
    .from("daily_goals")
    .select("*")
    .eq("id", goal_id)
    .single();

  if (getError || !goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  // Verify the session user owns this goal
  if (sessionHandle(session) !== goal.handle) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Mark completed
  const { data: updated, error: updateError } = await db
    .from("daily_goals")
    .update({ status: "completed", completed_at: new Date().toISOString(), proof_value })
    .eq("id", goal_id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });

  const goalHandle: string = goal.handle;
  const targetStat: string = goal.target_stat ?? "focus";

  // Convert XP → score points via the XP system
  const xpResult = await convertXPToPoints(db, goalHandle, targetStat, 1);

  // Log XP earning (non-critical — don't fail the response if this errors)
  try {
    await db.from("xp_earnings").insert({
      handle: goalHandle,
      source: "goal_complete",
      amount: 1,
      meta: { goal_id, stat: targetStat, points_gained: xpResult.points_gained },
    });
  } catch (e) {
    console.error("xp_earnings insert failed:", e);
  }

  // Update streak only if this is the first goal completed today
  const { count: completedToday } = await db
    .from("daily_goals")
    .select("*", { count: "exact", head: true })
    .eq("handle", goalHandle)
    .eq("goal_date", todayStr)
    .eq("status", "completed");

  if ((completedToday ?? 0) === 1) {
    const { data: streakRow } = await db
      .from("user_streaks")
      .select("*")
      .eq("handle", goalHandle)
      .single();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const lastActive = streakRow?.last_active ?? "";
    const isToday = lastActive === todayStr;

    if (!isToday) {
      const newStreak = lastActive === yesterdayStr ? (streakRow?.current_streak ?? 0) + 1 : 1;
      const newLongest = Math.max(streakRow?.longest_streak ?? 0, newStreak);
      await db.from("user_streaks").upsert(
        {
          handle: goalHandle,
          current_streak: newStreak,
          longest_streak: newLongest,
          last_active: todayStr,
          total_visits: (streakRow?.total_visits ?? 0) + 1,
        },
        { onConflict: "handle" }
      );
    }
  }

  void authHandle; // unused after session-based auth
  return NextResponse.json({ goal: updated, xp: xpResult });
}

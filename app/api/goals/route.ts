import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { convertXPToPoints } from "@/app/lib/xp-system";
import { getAuthToken, verifyAuth } from "@/app/lib/auth";

function today() {
  return new Date().toISOString().split("T")[0];
}

// GET /api/goals?handle=X            — fetch today's goals for handle
// GET /api/goals?handle=X&public_only=true — only public goals today
// GET /api/goals?templates=true&limit=10   — trending public goal templates
export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  const templatesMode = req.nextUrl.searchParams.get("templates") === "true";
  const publicOnly = req.nextUrl.searchParams.get("public_only") === "true";
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
    .eq("goal_date", today())
    .order("created_at", { ascending: true });

  if (publicOnly) {
    query = query.eq("is_public", true);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  return NextResponse.json({ goals: data ?? [] });
}

// POST /api/goals — create a new goal
export async function POST(req: NextRequest) {
  const { handle, goal_text, proof_type, target_stat, is_public, template_id } = await req.json();

  if (!handle || !goal_text || !proof_type || !target_stat) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const token = getAuthToken(req);
  if (!(await verifyAuth(handle, token))) {
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

  // Check max 3 goals today
  const { count } = await db
    .from("daily_goals")
    .select("*", { count: "exact", head: true })
    .eq("handle", handle)
    .eq("goal_date", today());

  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: "max_goals_reached" }, { status: 400 });
  }

  const { data: goal, error: insertError } = await db
    .from("daily_goals")
    .insert({
      handle,
      goal_text,
      proof_type,
      target_stat,
      status: "pending",
      xp_reward: 1,
      goal_date: today(),
      is_public: is_public ?? false,
      template_id: template_id ?? null,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });

  // If copied from a template, increment that template's copy_count and award XP to creator
  if (template_id) {
    // Increment copy_count
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

      // Award 1 XP to template creator
      const { data: creatorRow } = await db
        .from("darkroom_ids")
        .select("bonus_points")
        .eq("handle", templateRow.handle)
        .single();

      await db
        .from("darkroom_ids")
        .update({ bonus_points: (creatorRow?.bonus_points ?? 0) + 1 })
        .eq("handle", templateRow.handle);

      // Log XP earning
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
  const { handle: authHandle, goal_id, proof_value } = await req.json();
  if (!goal_id || !proof_value) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (authHandle) {
    const token = getAuthToken(req);
    if (!(await verifyAuth(authHandle, token))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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

  // Mark completed
  const { data: updated, error: updateError } = await db
    .from("daily_goals")
    .update({ status: "completed", completed_at: new Date().toISOString(), proof_value })
    .eq("id", goal_id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });

  const handle: string = goal.handle;
  const targetStat: string = goal.target_stat ?? "focus";

  // Convert XP → score points via the XP system
  const xpResult = await convertXPToPoints(db, handle, targetStat, 1);

  // Log XP earning (non-critical — don't fail the response if this errors)
  try {
    await db.from("xp_earnings").insert({
      handle,
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
    .eq("handle", handle)
    .eq("goal_date", todayStr)
    .eq("status", "completed");

  if ((completedToday ?? 0) === 1) {
    const { data: streakRow } = await db
      .from("user_streaks")
      .select("*")
      .eq("handle", handle)
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
          handle,
          current_streak: newStreak,
          longest_streak: newLongest,
          last_active: todayStr,
          total_visits: (streakRow?.total_visits ?? 0) + 1,
        },
        { onConflict: "handle" }
      );
    }
  }

  return NextResponse.json({ goal: updated, xp: xpResult });
}

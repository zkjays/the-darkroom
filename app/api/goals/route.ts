import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { convertXPToPoints } from "@/app/lib/xp-system";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";
import { sanitizeHandle } from "@/app/lib/sanitize";

const PROOF_POINTS: Record<string, number> = {
  // v2 categories
  Ship: 8, Code: 8, Publish: 5, Release: 5, Design: 5,
  // legacy — keep for existing score recompute
  Project: 8, OSS: 8, Article: 5, Video: 5, Thread: 3, Other: 3,
};

function today() {
  return new Date().toISOString().split("T")[0];
}

function sessionHandle(session: object | null): string | undefined {
  return (session as import("next-auth").Session | null)?.handle;
}

// GET /api/goals?handle=X                    — fetch today's goals for handle
// GET /api/goals?handle=X&all=true           — fetch all goals (no date filter), newest first
// GET /api/goals?handle=X&completed=true     — filter to completed only
// GET /api/goals?handle=X&public_only=true   — only public goals today
// GET /api/goals?templates=true&limit=10     — trending public goal templates
export async function GET(req: NextRequest) {
  const handle = sanitizeHandle(req.nextUrl.searchParams.get("handle") ?? "") || null;
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

  const goals = data ?? [];

  // Enrich each goal with a live endorsement count from goal_endorsements
  if (goals.length > 0) {
    const goalIds = goals.map((g) => g.id);
    const { data: endorsements } = await db
      .from("goal_endorsements")
      .select("goal_id")
      .in("goal_id", goalIds);

    const endorsementCounts: Record<string, number> = {};
    endorsements?.forEach((e) => {
      endorsementCounts[e.goal_id] = (endorsementCounts[e.goal_id] ?? 0) + 1;
    });

    const goalsWithCounts = goals.map((g) => ({
      ...g,
      endorsement_count: endorsementCounts[g.id] ?? g.endorsement_count ?? 0,
    }));

    return NextResponse.json({ goals: goalsWithCounts });
  }

  return NextResponse.json({ goals });
}

// POST /api/goals — create a new goal
// If proof_value is provided the goal is created as immediately completed (Work tab submission).
// Direct completions bypass the 3-goal daily limit.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const {
    handle: rawHandle, goal_text, proof_type, proof_value,
    target_stat, is_public, template_id,
    image_url, description, completed_at, xp_reward,
  } = body;
  const handle = sanitizeHandle(rawHandle ?? "");

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

  const insertPayload = {
    handle,
    goal_text,
    proof_type,
    proof_value: proof_value ?? null,
    target_stat: target_stat ?? "work_proof",
    status: isDirectComplete ? "completed" : "active",
    completed_at: isDirectComplete ? (completed_at ?? now) : null,
    xp_reward: xp_reward ?? 5,
    goal_date: today(),
    is_public: is_public ?? true,
    template_id: template_id ?? null,
    image_url: image_url ?? null,
    description: description ?? null,
    original_proof_value: proof_value ?? null,
    original_goal_text: goal_text ?? null,
    original_description: description ?? null,
    original_image_url: image_url ?? null,
    copy_count: 0,
  };

  const { data: goal, error: insertError } = await db
    .from("daily_goals")
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    console.error("Goal insert error:", JSON.stringify(insertError));
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }

  // If direct-complete (Work submission), run XP logic + update work_proof immediately
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

    // Recalculate work_proof score from all completed proofs (including the new one)
    let newWorkProof = 0;
    try {
      const { data: allProofs } = await db
        .from("daily_goals")
        .select("proof_type, endorsement_count")
        .eq("handle", handle)
        .eq("status", "completed")
        .not("proof_value", "is", null);

      const totalPoints = (allProofs ?? []).reduce((sum: number, p: { proof_type: string; endorsement_count: number | null }) => {
        const base = PROOF_POINTS[p.proof_type] ?? 3;
        const count = p.endorsement_count ?? 0;
        const multiplier = count >= 3 ? 1.5 : count >= 1 ? 1.0 : 0.5;
        return sum + Math.round(base * multiplier);
      }, 0);

      newWorkProof = Math.min(100, Math.round((totalPoints / 50) * 100));

      const { data: idRow } = await db
        .from("darkroom_ids")
        .select("social_proof, builder_proof, bonus_points")
        .eq("handle", handle)
        .single();

      if (idRow) {
        const newRoomScore = Math.round(
          (idRow.social_proof ?? 0) * 0.35 +
          (idRow.builder_proof ?? 0) * 0.35 +
          newWorkProof * 0.30
        );
        await db
          .from("darkroom_ids")
          .update({ work_proof: newWorkProof, score: newRoomScore })
          .eq("handle", handle);
      }
    } catch (e) {
      console.error("work_proof recalculation failed (non-critical):", e);
    }

    return NextResponse.json({ goal, xp: xpResult, work_proof: newWorkProof });
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

// PATCH /api/goals — complete a goal with proof, OR recalculate work_proof
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // ── RECALCULATE branch: { recalculate: true } ─────────────────────────────
  if (body.recalculate) {
    const handle = sessionHandle(session);
    if (!handle) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = getServiceSupabase();

    const { data: allProofs } = await db
      .from("daily_goals")
      .select("proof_type, endorsement_count")
      .eq("handle", handle)
      .eq("status", "completed")
      .not("proof_value", "is", null);

    const totalPoints = (allProofs ?? []).reduce((sum: number, p: { proof_type: string; endorsement_count: number | null }) => {
      const base = PROOF_POINTS[p.proof_type] ?? 3;
      const count = p.endorsement_count ?? 0;
      const multiplier = count >= 3 ? 1.5 : count >= 1 ? 1.0 : 0.5;
      return sum + Math.round(base * multiplier);
    }, 0);

    const newWorkProof = Math.min(100, Math.round((totalPoints / 50) * 100));

    const { data: idRow } = await db
      .from("darkroom_ids")
      .select("social_proof, builder_proof, bonus_points")
      .eq("handle", handle)
      .single();

    if (idRow) {
      const newRoomScore = Math.round(
        (idRow.social_proof ?? 0) * 0.35 +
        (idRow.builder_proof ?? 0) * 0.35 +
        newWorkProof * 0.30
      );
      await db
        .from("darkroom_ids")
        .update({ work_proof: newWorkProof, score: newRoomScore })
        .eq("handle", handle);
    }

    return NextResponse.json({ work_proof: newWorkProof });
  }

  const { handle: authHandle, goal_id, proof_value } = body;
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

// DELETE /api/goals — delete a work proof
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { goal_id } = await req.json();
  if (!goal_id) return NextResponse.json({ error: "Missing goal_id" }, { status: 400 });

  const db = getServiceSupabase();

  const { data: goal, error: getError } = await db
    .from("daily_goals")
    .select("handle, proof_value")
    .eq("id", goal_id)
    .single();

  if (getError || !goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  if (sessionHandle(session) !== goal.handle) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!goal.proof_value) return NextResponse.json({ error: "Not a work proof" }, { status: 400 });

  const handle = goal.handle;

  await db.from("goal_endorsements").delete().eq("goal_id", goal_id);
  await db.from("daily_goals").delete().eq("id", goal_id);

  // Recalculate work_proof after deletion
  const { data: allProofs } = await db
    .from("daily_goals")
    .select("proof_type, endorsement_count")
    .eq("handle", handle)
    .eq("status", "completed")
    .not("proof_value", "is", null);

  const totalPoints = (allProofs ?? []).reduce((sum: number, p: { proof_type: string; endorsement_count: number | null }) => {
    const base = PROOF_POINTS[p.proof_type] ?? 3;
    const count = p.endorsement_count ?? 0;
    const multiplier = count >= 3 ? 1.5 : count >= 1 ? 1.0 : 0.5;
    return sum + Math.round(base * multiplier);
  }, 0);

  const newWorkProof = Math.min(100, Math.round((totalPoints / 50) * 100));

  const { data: idRow } = await db
    .from("darkroom_ids")
    .select("social_proof, builder_proof, bonus_points")
    .eq("handle", handle)
    .single();

  if (idRow) {
    const newRoomScore = Math.round(
      (idRow.social_proof ?? 0) * 0.35 +
      (idRow.builder_proof ?? 0) * 0.35 +
      newWorkProof * 0.30
    );
    await db
      .from("darkroom_ids")
      .update({ work_proof: newWorkProof, score: newRoomScore })
      .eq("handle", handle);
  }

  return NextResponse.json({ deleted: true, work_proof: newWorkProof });
}

// PUT /api/goals — endorse a proof OR edit a proof
// SQL: ALTER TABLE daily_goals ADD COLUMN IF NOT EXISTS edited boolean DEFAULT false;
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // ── ENDORSEMENT BRANCH ──────────────────────────────────────────────────
  if ("goal_id" in body) {
    const { goal_id } = body;
    const endorser_handle = sessionHandle(session);

    if (!goal_id || !endorser_handle) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const db = getServiceSupabase();

    const { data: goal, error: getError } = await db
      .from("daily_goals")
      .select("*")
      .eq("id", goal_id)
      .single();

    if (getError || !goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

    if (goal.handle === endorser_handle) {
      console.warn(`security: self-endorsement attempt by handle=${endorser_handle} on goal=${goal_id}`);
      return NextResponse.json({ error: "Cannot endorse your own proof" }, { status: 403 });
    }

    // Dedup — un seul endorsement par handle
    const { data: existing } = await db
      .from("goal_endorsements")
      .select("id")
      .eq("goal_id", goal_id)
      .eq("endorser_handle", endorser_handle)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Already endorsed" }, { status: 409 });
    }

    // Insert dans goal_endorsements (source of truth)
    const { error: insertError } = await db
      .from("goal_endorsements")
      .insert({ goal_id, endorser_handle, type: "endorse" });

    if (insertError) return NextResponse.json({ error: "Failed to record endorsement" }, { status: 500 });

    // Count réel depuis goal_endorsements
    const { data: endorsementRows } = await db
      .from("goal_endorsements")
      .select("id")
      .eq("goal_id", goal_id);

    const newCount = endorsementRows?.length ?? 1;

    const { error: updateError } = await db
      .from("daily_goals")
      .update({ endorsement_count: newCount })
      .eq("id", goal_id);

    if (updateError) return NextResponse.json({ error: "Failed to endorse" }, { status: 500 });

    if (newCount === 1 || newCount === 3) {
      const handle = goal.handle;

      const { data: allProofs } = await db
        .from("daily_goals")
        .select("proof_type, endorsement_count")
        .eq("handle", handle)
        .eq("status", "completed")
        .not("proof_value", "is", null);

      const totalPoints = (allProofs ?? []).reduce((sum, p) => {
        const base = PROOF_POINTS[p.proof_type] ?? 3;
        const count = p.endorsement_count ?? 0;
        const multiplier = count >= 3 ? 1.5 : count >= 1 ? 1.0 : 0.5;
        return sum + Math.round(base * multiplier);
      }, 0);

      const newWorkProof = Math.min(100, Math.round((totalPoints / 50) * 100));

      const { data: idRow } = await db
        .from("darkroom_ids")
        .select("social_proof, builder_proof, bonus_points")
        .eq("handle", handle)
        .single();

      if (idRow) {
        const newRoomScore = Math.round(
          (idRow.social_proof ?? 0) * 0.35 +
          (idRow.builder_proof ?? 0) * 0.35 +
          newWorkProof * 0.30
        );

        await db
          .from("darkroom_ids")
          .update({ work_proof: newWorkProof, score: newRoomScore })
          .eq("handle", handle);

        try {
          await db.from("xp_earnings").insert({
            handle,
            source: "proof_validated",
            amount: 10,
            meta: { goal_id, endorsement_count: newCount },
          });
        } catch { /* non-critical */ }
      }
    }

    return NextResponse.json({ endorsement_count: newCount });
  }

  // ── EDIT BRANCH ─────────────────────────────────────────────────────────
  const { id, goal_text, description, image_url, proof_type, completed_at, proof_value } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = getServiceSupabase();

  const { data: goal, error: getError } = await db
    .from("daily_goals")
    .select("*")
    .eq("id", id)
    .single();

  if (getError || !goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  if (sessionHandle(session) !== goal.handle) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Lock: validated (≥3 endorsements) AND created more than 7 days ago
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if ((goal.endorsement_count ?? 0) >= 3 && new Date(goal.created_at) < sevenDaysAgo) {
    return NextResponse.json({ error: "Proof is locked" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if ((goal.endorsement_count ?? 0) >= 1) updates.edited = true;
  if (goal_text !== undefined) updates.goal_text = goal_text;
  if (description !== undefined) updates.description = description;
  if (image_url !== undefined) updates.image_url = image_url;
  if (proof_type !== undefined) updates.proof_type = proof_type;
  if (completed_at !== undefined) updates.completed_at = completed_at;

  // URL may only change when nobody has endorsed yet; never touch original_proof_value
  if (proof_value !== undefined && proof_value !== goal.proof_value && (goal.endorsement_count ?? 0) === 0) {
    updates.proof_value = proof_value;
    updates.endorsement_count = 0;
    await db.from("goal_endorsements").delete().eq("goal_id", id);
  }

  const { data: updated, error: updateError } = await db
    .from("daily_goals")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("Goal update error:", JSON.stringify(updateError));
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }

  return NextResponse.json({ goal: updated });
}

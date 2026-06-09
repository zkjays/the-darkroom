import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";

// GET /api/endorsements?goal_id=X
export async function GET(req: NextRequest) {
  const goal_id = req.nextUrl.searchParams.get("goal_id");
  const viewer = req.nextUrl.searchParams.get("viewer"); // viewer's handle to check their action
  if (!goal_id) return NextResponse.json({ error: "Missing goal_id" }, { status: 400 });

  const db = getServiceSupabase();
  const { data, error } = await db
    .from("goal_endorsements")
    .select("type, endorser_handle")
    .eq("goal_id", goal_id);

  if (error) return NextResponse.json({ error: "Failed to fetch endorsements" }, { status: 500 });

  const endorses = (data ?? []).filter((e) => e.type === "endorse").length;
  const challenges = (data ?? []).filter((e) => e.type === "challenge").length;
  const user_action = viewer
    ? ((data ?? []).find((e) => e.endorser_handle === viewer)?.type ?? null)
    : null;

  return NextResponse.json({ endorses, challenges, user_action });
}

// POST /api/endorsements
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionHandle = (session as { handle?: string }).handle;
  if (!sessionHandle) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { goal_id, endorser_handle, type, reason } = await req.json();

  if (!goal_id || !endorser_handle || !type) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Security: endorser_handle must match authenticated session
  if (sessionHandle !== endorser_handle) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (type !== "endorse" && type !== "challenge") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const db = getServiceSupabase();

  // Fetch goal — verify it exists and get owner
  const { data: goal, error: goalError } = await db
    .from("daily_goals")
    .select("handle, status, xp_reward")
    .eq("id", goal_id)
    .single();

  if (goalError || !goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  // Can't endorse your own goal
  if (goal.handle === endorser_handle) {
    return NextResponse.json({ error: "Cannot endorse your own goal" }, { status: 400 });
  }

  // Insert endorsement (UNIQUE on goal_id + endorser_handle will reject duplicates)
  const { data: endorsement, error: insertError } = await db
    .from("goal_endorsements")
    .insert({ goal_id, endorser_handle, type, reason: reason ?? null })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "Already endorsed this goal" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to save endorsement" }, { status: 500 });
  }

  // Count endorsements/challenges after insert
  const { data: allEndorsements } = await db
    .from("goal_endorsements")
    .select("type")
    .eq("goal_id", goal_id);

  const endorseCount = (allEndorsements ?? []).filter((e) => e.type === "endorse").length;
  const challengeCount = (allEndorsements ?? []).filter((e) => e.type === "challenge").length;

  // Sync endorsement_count on the goal + recalculate work_proof score at milestones
  if (type === "endorse") {
    await db
      .from("daily_goals")
      .update({ endorsement_count: endorseCount })
      .eq("id", goal_id);

    if (endorseCount === 1 || endorseCount === 3) {
      const PROOF_POINTS: Record<string, number> = {
        Project: 8, OSS: 8, Article: 5, Video: 5, Design: 5, Thread: 3, Other: 3,
      };

      const { data: allProofs } = await db
        .from("daily_goals")
        .select("proof_type, endorsement_count")
        .eq("handle", goal.handle)
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
        .eq("handle", goal.handle)
        .single();

      if (idRow) {
        const newRoomScore = Math.round(
          (idRow.social_proof ?? 0) * 0.35 +
          (idRow.builder_proof ?? 0) * 0.35 +
          newWorkProof * 0.30
        );
        const newTotalScore = Math.min(100, newRoomScore + (idRow.bonus_points ?? 0));

        await db
          .from("darkroom_ids")
          .update({ work_proof: newWorkProof, score: newRoomScore, total_score: newTotalScore })
          .eq("handle", goal.handle);

        try {
          await db.from("xp_earnings").insert({
            handle: goal.handle,
            source: "proof_validated",
            amount: 10,
            meta: { goal_id, endorsement_count: endorseCount },
          });
        } catch { /* non-critical */ }
      }
    }
  }

  // 3+ challenges → deduct goal's XP from owner's bonus_points
  if (type === "challenge" && challengeCount >= 3) {
    const { data: ownerRow } = await db
      .from("darkroom_ids")
      .select("bonus_points")
      .eq("handle", goal.handle)
      .single();

    const deduction = goal.xp_reward ?? 1;
    const newPoints = Math.max(0, (ownerRow?.bonus_points ?? 0) - deduction);
    await db
      .from("darkroom_ids")
      .update({ bonus_points: newPoints })
      .eq("handle", goal.handle);
  }

  return NextResponse.json({
    success: true,
    endorsement,
    counts: { endorses: endorseCount, challenges: challengeCount },
  });
}

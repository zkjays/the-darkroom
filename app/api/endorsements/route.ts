import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";

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
  const { goal_id, endorser_handle, type, reason } = await req.json();

  if (!goal_id || !endorser_handle || !type) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
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

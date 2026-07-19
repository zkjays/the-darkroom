import { getServiceSupabase } from "@/app/lib/supabase";
import { WORK_PROOF_POINTS } from "@/app/dashboard/_work-constants";

// ── Single source of truth for Room Score math ─────────────────────────────
// Previously duplicated inline in app/api/goals/route.ts (4x) and
// app/api/endorsements/route.ts (1x, with a stale local PROOF_POINTS table
// missing current proof_type keys — silently fell back to 3pts/proof for
// Ship/Code/Release/Design/Client/Post/Publish). Any endpoint that recomputes
// work_proof/score/total_score must go through recalcAndPersistScore() below.

type Db = ReturnType<typeof getServiceSupabase>;

export function calcRoomScore(social: number, builder: number, work: number): number {
  return Math.round(social * 0.35 + builder * 0.35 + work * 0.30);
}

export function calcTotalScore(roomScore: number, bonusPoints: number): number {
  return Math.min(100, roomScore + bonusPoints);
}

export function proofBasePoints(proofType: string): number {
  return WORK_PROOF_POINTS[proofType] ?? 3;
}

export function proofMultiplier(endorsementCount: number): number {
  return endorsementCount >= 3 ? 1.5 : endorsementCount >= 1 ? 1.0 : 0.5;
}

export function proofPoints(proofType: string, endorsementCount: number): number {
  return Math.round(proofBasePoints(proofType) * proofMultiplier(endorsementCount));
}

export async function calcWorkProof(db: Db, handle: string): Promise<number> {
  const { data: proofs } = await db
    .from("daily_goals")
    .select("id, proof_type")
    .eq("handle", handle)
    .eq("status", "completed")
    .filter("proof_value", "not.is", null);

  if (!proofs || proofs.length === 0) return 0;

  const proofIds = proofs.map((p: { id: string }) => p.id);
  const { data: endorsements } = await db
    .from("goal_endorsements")
    .select("goal_id")
    .in("goal_id", proofIds);

  const counts: Record<string, number> = {};
  endorsements?.forEach((e: { goal_id: string }) => {
    counts[e.goal_id] = (counts[e.goal_id] ?? 0) + 1;
  });

  const totalPoints = proofs.reduce((sum: number, p: { id: string; proof_type: string }) => {
    return sum + proofPoints(p.proof_type, counts[p.id] ?? 0);
  }, 0);

  return Math.min(100, Math.round((totalPoints / 50) * 100));
}

// Fetches social_proof/builder_proof/bonus_points, recomputes score + total_score
// from the given work_proof, persists both columns, and returns the new values.
// Returns null if the darkroom_ids row doesn't exist (non-critical caller should no-op).
export async function recalcAndPersistScore(
  db: Db,
  handle: string,
  newWorkProof: number
): Promise<{ score: number; total_score: number } | null> {
  const { data: idRow } = await db
    .from("darkroom_ids")
    .select("social_proof, builder_proof, bonus_points")
    .eq("handle", handle)
    .single();

  if (!idRow) return null;

  const score = calcRoomScore(idRow.social_proof ?? 0, idRow.builder_proof ?? 0, newWorkProof);
  const total_score = calcTotalScore(score, idRow.bonus_points ?? 0);

  await db
    .from("darkroom_ids")
    .update({ work_proof: newWorkProof, score, total_score })
    .eq("handle", handle);

  return { score, total_score };
}

import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { proofPoints } from "@/app/lib/room-score";

// Peer benchmark: ranks a handle's Room Score dimensions + per-proof_type points
// against every other public profile. Additive, read-only, no schema change.
// Cached 1h — at current user volume the pool barely moves hour to hour, and this
// is a comparison feature, not a live leaderboard, so staleness is cheap here.
export const revalidate = 3600;

const MIN_SAMPLE = 0; // temporarily lowered while the pool is small — raise back to 10 once enough builders have joined

type RankResult = { available: boolean; n: number; rank?: number; top_percent?: number; points?: number };

// rank 1 = best. topPercent = "you're in the top X%".
function rankOf(sortedDesc: number[], value: number): { rank: number; top_percent: number } {
  const rank = sortedDesc.findIndex((v) => v <= value) + 1 || sortedDesc.length;
  const top_percent = Math.max(1, Math.round((rank / sortedDesc.length) * 100));
  return { rank, top_percent };
}

// GET /api/score-benchmark?handle=X
export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) return NextResponse.json({ error: "Missing handle" }, { status: 400 });

  const db = getServiceSupabase();

  // 1. Aggregate rings pool — every public profile's Social/Builder/Work proof.
  const { data: ids, error: idsError } = await db
    .from("darkroom_ids")
    .select("handle, social_proof, builder_proof, work_proof")
    .eq("profile_public", true);

  if (idsError) return NextResponse.json({ error: "Failed to fetch benchmark pool" }, { status: 500 });
  if (!ids || ids.length === 0) return NextResponse.json({ error: "No public profiles yet" }, { status: 404 });

  const self = ids.find((r) => r.handle === handle);
  if (!self) return NextResponse.json({ error: "Handle not found or not public" }, { status: 404 });

  const rankDimension = (values: (number | null | undefined)[], selfValue: number | null | undefined): RankResult => {
    const clean = values.map((v) => v ?? 0).sort((a, b) => b - a);
    const n = clean.length;
    if (n < MIN_SAMPLE) return { available: false, n };
    const { rank, top_percent } = rankOf(clean, selfValue ?? 0);
    return { available: true, n, rank, top_percent };
  };

  const aggregate = {
    social_proof: rankDimension(ids.map((r) => r.social_proof), self.social_proof),
    builder_proof: rankDimension(ids.map((r) => r.builder_proof), self.builder_proof),
    work_proof: rankDimension(ids.map((r) => r.work_proof), self.work_proof),
  };

  // 2. Per proof_type pool — points per handle per type, computed with the same
  // deterministic formula the score itself uses (app/lib/room-score.ts). Endorsement
  // counts come from a live goal_endorsements query, not the daily_goals.endorsement_count
  // denormalized cache — that column isn't guaranteed to exist (see calcWorkProof).
  const publicHandles = new Set(ids.map((r) => r.handle));
  const { data: proofs, error: proofsError } = await db
    .from("daily_goals")
    .select("id, handle, proof_type")
    .eq("status", "completed")
    .eq("is_public", true)
    .not("proof_value", "is", null);

  if (proofsError) return NextResponse.json({ error: "Failed to fetch proof pool" }, { status: 500 });

  const proofIds = (proofs ?? []).map((p) => p.id);
  const { data: endorsements } = await db
    .from("goal_endorsements")
    .select("goal_id")
    .in("goal_id", proofIds.length ? proofIds : ["__none__"]);

  const endorsementCounts: Record<string, number> = {};
  (endorsements ?? []).forEach((e) => {
    endorsementCounts[e.goal_id] = (endorsementCounts[e.goal_id] ?? 0) + 1;
  });

  // handle -> proof_type -> total points
  const pointsByHandleType: Record<string, Record<string, number>> = {};
  (proofs ?? []).forEach((p) => {
    if (!publicHandles.has(p.handle)) return; // keep the pool consistent with the aggregate one
    const byType = (pointsByHandleType[p.handle] ??= {});
    byType[p.proof_type] = (byType[p.proof_type] ?? 0) + proofPoints(p.proof_type, endorsementCounts[p.id] ?? 0);
  });

  const allTypes = new Set<string>();
  Object.values(pointsByHandleType).forEach((byType) => Object.keys(byType).forEach((t) => allTypes.add(t)));

  const proofTypes: Record<string, RankResult> = {};
  allTypes.forEach((proofType) => {
    const entries = Object.entries(pointsByHandleType)
      .filter(([, byType]) => byType[proofType] !== undefined)
      .map(([h, byType]) => ({ handle: h, points: byType[proofType] }));

    const n = entries.length;
    if (n < MIN_SAMPLE) {
      proofTypes[proofType] = { available: false, n };
      return;
    }
    const selfPoints = pointsByHandleType[handle]?.[proofType] ?? 0;
    const clean = entries.map((e) => e.points).sort((a, b) => b - a);
    const { rank, top_percent } = rankOf(clean, selfPoints);
    proofTypes[proofType] = { available: true, n, rank, top_percent, points: selfPoints };
  });

  return NextResponse.json({ handle, aggregate, proof_types: proofTypes });
}

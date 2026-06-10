import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) return NextResponse.json({ error: "Missing handle" }, { status: 400 });

  const db = getServiceSupabase();
  const { data, error } = await db
    .from("darkroom_ids")
    .select("updated_at, claim_count, social_proof, builder_proof, auth_token")
    .eq("handle", handle)
    .single();

  if (error || !data) {
    return NextResponse.json({ already_claimed: false, days_until_reclaim: 0 });
  }

  // Only truly claimed if auth_token is set (by /api/claim, not just /api/generate upsert)
  const hasClaimed = data.auth_token != null;
  if (!hasClaimed) {
    return NextResponse.json({ already_claimed: false, days_until_reclaim: 0 });
  }

  const claimCount = data.claim_count ?? 1;
  const daysSince = (Date.now() - new Date(data.updated_at).getTime()) / (1000 * 60 * 60 * 24);
  const scoresAreZero = (data.social_proof ?? 0) === 0 && (data.builder_proof ?? 0) === 0;

  const daysUntilReclaim = (claimCount === 1 || scoresAreZero)
    ? 0
    : Math.max(0, Math.ceil(30 - daysSince));

  return NextResponse.json({
    already_claimed: true,
    days_until_reclaim: daysUntilReclaim,
    claim_count: claimCount,
  });
}

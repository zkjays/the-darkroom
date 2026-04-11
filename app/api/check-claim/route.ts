import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) return NextResponse.json({ error: "Missing handle" }, { status: 400 });

  const db = getServiceSupabase();
  const { data, error } = await db
    .from("darkroom_ids")
    .select("updated_at, claim_count")
    .eq("handle", handle)
    .single();

  if (error || !data) {
    return NextResponse.json({ already_claimed: false, days_until_reclaim: 0 });
  }

  const daysSince = (Date.now() - new Date(data.updated_at).getTime()) / (1000 * 60 * 60 * 24);
  const daysUntilReclaim = Math.max(0, Math.ceil(30 - daysSince));

  return NextResponse.json({
    already_claimed: true,
    days_until_reclaim: daysUntilReclaim,
    claim_count: data.claim_count ?? 1,
  });
}

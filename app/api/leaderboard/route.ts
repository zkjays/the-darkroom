import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";

export const revalidate = 3600;

export async function GET() {
  const db = getServiceSupabase();

  const { data, error } = await db
    .from("darkroom_ids")
    .select("handle, total_score, social_proof, builder_proof, work_proof, profile_image_url, archetype, is_og")
    .eq("profile_public", true)
    .order("total_score", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }

  return NextResponse.json({ builders: data ?? [] });
}

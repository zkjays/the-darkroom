import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";
import { getServiceSupabase } from "@/app/lib/supabase";

const DAILY_LIMIT = 3;

// GET /api/plugs/quota — plugs the current user used today
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const handle = (session as { handle?: string }).handle;
  if (!handle) return NextResponse.json({ error: "No handle" }, { status: 401 });

  const db = getServiceSupabase();
  const today = new Date().toISOString().split("T")[0];

  const { data: rows } = await db
    .from("goal_endorsements")
    .select("goal_id, created_at")
    .eq("endorser_handle", handle)
    .eq("type", "endorse")
    .gte("created_at", today + "T00:00:00.000Z");

  const endorsedToday = (rows ?? []).map((r) => r.goal_id as string);

  return NextResponse.json({
    used: endorsedToday.length,
    limit: DAILY_LIMIT,
    endorsed_ids: endorsedToday,
  });
}

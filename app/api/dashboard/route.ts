import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");

  if (!handle) {
    return NextResponse.json({ error: "Missing handle" }, { status: 400 });
  }

  const db = getServiceSupabase();

  const [{ data, error }, { data: streak }] = await Promise.all([
    db.from("darkroom_ids").select("*").eq("handle", handle).single(),
    db.from("user_streaks").select("*").eq("handle", handle).single(),
  ]);

  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ...data, streak: streak ?? null });
}

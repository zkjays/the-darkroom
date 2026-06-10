import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const handle = (session as { handle?: string }).handle;
  if (!handle) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getServiceSupabase();
  const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();

  await db
    .from("darkroom_ids")
    .update({ updated_at: thirtyOneDaysAgo, claim_count: 1 })
    .eq("handle", handle);

  return NextResponse.json({ ok: true });
}

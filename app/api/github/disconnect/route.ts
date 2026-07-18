import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";

export async function POST() {
  const session = await getServerSession(authOptions);
  const sessionHandle = (session as { handle?: string } | null)?.handle;
  if (!sessionHandle) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceSupabase();
  const { error } = await db
    .from("darkroom_ids")
    .update({
      github_username: null,
      github_verified: false,
      github_verified_at: null,
    })
    .eq("handle", sessionHandle);

  if (error) {
    console.log("github disconnect: supabase update failed —", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

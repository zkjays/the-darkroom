import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { sanitizeHandle } from "@/app/lib/sanitize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";

// GET /api/darkcircle/search?q=xyz — autocomplete for the "add to DarkCircle"
// input. Only surfaces public profiles (private handles can still be added
// directly by exact handle in the POST /api/darkcircle route, but aren't
// discoverable through search/browse).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = sanitizeHandle(req.nextUrl.searchParams.get("q") ?? "");
  if (!q) return NextResponse.json({ results: [] });

  const db = getServiceSupabase();
  const { data, error } = await db
    .from("darkroom_ids")
    .select("handle, profile_image_url, archetype, total_score")
    .eq("profile_public", true)
    .ilike("handle", `${q}%`)
    .order("total_score", { ascending: false })
    .limit(8);

  if (error) {
    console.error("darkcircle search failed —", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  return NextResponse.json({ results: data ?? [] });
}

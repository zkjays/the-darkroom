import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { sanitizeHandle } from "@/app/lib/sanitize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const handle = sanitizeHandle(req.nextUrl.searchParams.get("handle") ?? "");

  if (!handle) {
    return NextResponse.json({ error: "Missing handle" }, { status: 400 });
  }

  const db = getServiceSupabase();

  // Explicit allowlist: this endpoint is public (called from /p/[handle]) and must
  // never leak the `auth_token` secret column (claim-ownership credential used in
  // app/lib/auth.ts and app/api/check-claim/route.ts). Only columns actually
  // consumed by the frontend (see app/dashboard/_types.ts DashboardData) are listed.
  // Kept as a single inline string literal so supabase-js can infer the row type.
  const [{ data, error }, { data: streak }] = await Promise.all([
    db
      .from("darkroom_ids")
      .select(
        "handle, score, bonus_points, total_score, total_xp, social_proof, builder_proof, work_proof, analyzed_posts, last_refresh_at, archetype, tagline, analysis, darkroom_line, profile_image_url, claim_count, claimed_at, updated_at, profile_public, goals_public, theme_accent, open_to_opportunities, is_og, bio, link_x, link_github, link_site, github_username, github_verified"
      )
      .eq("handle", handle)
      .single(),
    db.from("user_streaks").select("*").eq("handle", handle).single(),
  ]);

  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Privacy: a private profile (profile_public = false) is only visible to its
  // owner. Without this server-side check the /p/[handle] "private" screen was
  // purely cosmetic — anyone could read analysis/bio/links/scores by calling
  // this API directly. NULL profile_public is treated as public (legacy rows,
  // consistent with the RLS policy in app/lib/supabase.ts).
  if (data.profile_public === false) {
    const session = await getServerSession(authOptions);
    const requester = sanitizeHandle(
      (session as import("next-auth").Session | null)?.handle ?? ""
    );
    if (requester !== handle) {
      // Minimal stub: /p/[handle] uses profile_public to show its "This profile
      // is private." screen — keep that UX, leak nothing else.
      return NextResponse.json({ handle: data.handle, profile_public: false });
    }
  }

  return NextResponse.json({ ...data, streak: streak ?? null });
}

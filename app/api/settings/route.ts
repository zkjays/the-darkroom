import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) return NextResponse.json({ error: "Missing handle" }, { status: 400 });

  const db = getServiceSupabase();
  const { data, error } = await db
    .from("darkroom_ids")
    .select("profile_public, goals_public, theme_accent, open_to_opportunities, bio, link_x, link_github, link_site")
    .eq("handle", handle)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    profile_public: data.profile_public ?? false,
    goals_public: data.goals_public ?? false,
    theme_accent: data.theme_accent ?? "cyan",
    open_to_opportunities: data.open_to_opportunities ?? false,
    bio: data.bio ?? "",
    link_x: data.link_x ?? "",
    link_github: data.link_github ?? "",
    link_site: data.link_site ?? "",
  });
}

const BIO_MAX = 160;

// Normalize an optional link field to a trimmed string or null (empty = clear it)
function cleanLink(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t.slice(0, 200);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { handle, profile_public, goals_public, theme_accent, open_to_opportunities, bio, link_x, link_github, link_site } = body;

  if (!handle) return NextResponse.json({ error: "Missing handle" }, { status: 400 });

  const sessionHandle = session.handle;
  if (sessionHandle !== handle) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const updates: Record<string, unknown> = {};
  if (typeof profile_public === "boolean") updates.profile_public = profile_public;
  if (typeof goals_public === "boolean") updates.goals_public = goals_public;
  if (typeof theme_accent === "string") updates.theme_accent = theme_accent;
  if (typeof open_to_opportunities === "boolean") updates.open_to_opportunities = open_to_opportunities;
  if (typeof bio === "string") updates.bio = bio.trim().slice(0, BIO_MAX) || null;
  if (link_x !== undefined) updates.link_x = cleanLink(link_x);
  if (link_github !== undefined) updates.link_github = cleanLink(link_github);
  if (link_site !== undefined) updates.link_site = cleanLink(link_site);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const db = getServiceSupabase();
  const { data, error } = await db
    .from("darkroom_ids")
    .update(updates)
    .eq("handle", handle)
    .select("profile_public, goals_public, theme_accent, open_to_opportunities, bio, link_x, link_github, link_site")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  return NextResponse.json({
    success: true,
    profile_public: data.profile_public,
    goals_public: data.goals_public,
    theme_accent: data.theme_accent ?? "cyan",
    open_to_opportunities: data.open_to_opportunities ?? false,
    bio: data.bio ?? "",
    link_x: data.link_x ?? "",
    link_github: data.link_github ?? "",
    link_site: data.link_site ?? "",
  });
}

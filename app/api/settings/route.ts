import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { getAuthToken, verifyAuth } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) return NextResponse.json({ error: "Missing handle" }, { status: 400 });

  const db = getServiceSupabase();
  const { data, error } = await db
    .from("darkroom_ids")
    .select("profile_public, goals_public, theme_accent")
    .eq("handle", handle)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    profile_public: data.profile_public ?? false,
    goals_public: data.goals_public ?? false,
    theme_accent: data.theme_accent ?? "cyan",
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { handle, profile_public, goals_public, theme_accent } = body;

  if (!handle) return NextResponse.json({ error: "Missing handle" }, { status: 400 });

  const token = getAuthToken(req);
  if (!(await verifyAuth(handle, token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof profile_public === "boolean") updates.profile_public = profile_public;
  if (typeof goals_public === "boolean") updates.goals_public = goals_public;
  if (typeof theme_accent === "string") updates.theme_accent = theme_accent;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const db = getServiceSupabase();
  const { data, error } = await db
    .from("darkroom_ids")
    .update(updates)
    .eq("handle", handle)
    .select("profile_public, goals_public, theme_accent")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  return NextResponse.json({
    success: true,
    profile_public: data.profile_public,
    goals_public: data.goals_public,
    theme_accent: data.theme_accent ?? "cyan",
  });
}

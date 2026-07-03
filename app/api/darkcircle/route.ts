import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { sanitizeHandle, isValidHandle } from "@/app/lib/sanitize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";

/*
  ── REQUIRED MIGRATION (run once in Supabase SQL Editor) ──────────────────
  See supabase/migrations/20260703_darkcircle_watchlist.sql
  ────────────────────────────────────────────────────────────────────────────
*/

function sessionHandle(session: object | null): string | undefined {
  return (session as import("next-auth").Session | null)?.handle;
}

// DarkCircle is strictly private — a user's watchlist is never visible to
// anyone but themselves. Every verb below requires the session handle to
// match the owner_handle being read/written, not just the acting handle.

// GET /api/darkcircle?handle=X — list X's watchlist (only X, when logged in as X)
export async function GET(req: NextRequest) {
  const handle = sanitizeHandle(req.nextUrl.searchParams.get("handle") ?? "");
  if (!handle) return NextResponse.json({ error: "Missing handle" }, { status: 400 });

  const session = await getServerSession(authOptions);
  const authedHandle = sessionHandle(session) ? sanitizeHandle(sessionHandle(session)!) : undefined;

  if (!authedHandle || authedHandle !== handle) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceSupabase();

  const { data: rows, error } = await db
    .from("darkcircle_watchlist")
    .select("watched_handle, added_at")
    .eq("owner_handle", handle)
    .order("added_at", { ascending: false });

  if (error) {
    console.error("darkcircle: list fetch failed —", error);
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  }

  const watchedHandles = (rows ?? []).map((r) => r.watched_handle);
  if (watchedHandles.length === 0) {
    return NextResponse.json({ entries: [] });
  }

  // Enrich with a light snapshot of each watched profile.
  const { data: profiles } = await db
    .from("darkroom_ids")
    .select("handle, profile_image_url, archetype, total_score, score, bonus_points")
    .in("handle", watchedHandles);

  const profileByHandle = new Map((profiles ?? []).map((p) => [p.handle, p]));

  const entries = (rows ?? []).map((r) => {
    const p = profileByHandle.get(r.watched_handle);
    return {
      watched_handle: r.watched_handle,
      added_at: r.added_at,
      profile_image_url: p?.profile_image_url ?? undefined,
      archetype: p?.archetype ?? undefined,
      total_score: p ? (p.total_score ?? Math.min(100, (p.score ?? 0) + (p.bonus_points ?? 0))) : undefined,
    };
  });

  return NextResponse.json({ entries });
}

// POST /api/darkcircle — add a handle to the caller's own watchlist
// body: { owner_handle, watched_handle }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const authedHandle = sessionHandle(session);
  if (!authedHandle) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const owner_handle = sanitizeHandle((body as { owner_handle?: string }).owner_handle ?? "");
  const watched_handle = sanitizeHandle((body as { watched_handle?: string }).watched_handle ?? "");

  if (!owner_handle || !watched_handle) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!isValidHandle(watched_handle)) {
    return NextResponse.json({ error: "Invalid handle" }, { status: 400 });
  }

  // Security: only the authenticated owner can write to their own watchlist.
  if (sanitizeHandle(authedHandle) !== owner_handle) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (owner_handle === watched_handle) {
    return NextResponse.json({ error: "Cannot watch yourself" }, { status: 400 });
  }

  const db = getServiceSupabase();

  // Watched handle must be a real Darkroom profile.
  const { data: watchedProfile, error: watchedError } = await db
    .from("darkroom_ids")
    .select("handle")
    .eq("handle", watched_handle)
    .single();

  if (watchedError || !watchedProfile) {
    return NextResponse.json({ error: "Handle not found" }, { status: 404 });
  }

  const { data: inserted, error: insertError } = await db
    .from("darkcircle_watchlist")
    .insert({ owner_handle, watched_handle })
    .select("watched_handle, added_at")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "Already in your DarkCircle" }, { status: 409 });
    }
    console.error("darkcircle: insert failed —", insertError);
    return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
  }

  return NextResponse.json({ success: true, entry: inserted });
}

// DELETE /api/darkcircle — remove a handle from the caller's own watchlist
// body: { owner_handle, watched_handle }
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const authedHandle = sessionHandle(session);
  if (!authedHandle) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const owner_handle = sanitizeHandle((body as { owner_handle?: string }).owner_handle ?? "");
  const watched_handle = sanitizeHandle((body as { watched_handle?: string }).watched_handle ?? "");

  if (!owner_handle || !watched_handle) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Security: only the authenticated owner can write to their own watchlist.
  if (sanitizeHandle(authedHandle) !== owner_handle) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceSupabase();

  const { error } = await db
    .from("darkcircle_watchlist")
    .delete()
    .eq("owner_handle", owner_handle)
    .eq("watched_handle", watched_handle);

  if (error) {
    console.error("darkcircle: delete failed —", error);
    return NextResponse.json({ error: "Failed to remove from watchlist" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

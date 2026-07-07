import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";

// POST /api/referrals — record that referred_handle was brought in by referrer_handle
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionHandle = (session as { handle?: string }).handle;
  if (!sessionHandle) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { referrer_handle, referred_handle } = await req.json();
  if (!referrer_handle || !referred_handle) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Security: the referred user must be the authenticated session (you can only register
  // yourself as "referred by", not fabricate referrals for other users)
  if (sessionHandle !== referred_handle) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (referrer_handle === referred_handle) {
    return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
  }

  const db = getServiceSupabase();
  const { error } = await db
    .from("referrals")
    .insert({ referrer_handle, referred_handle });

  if (error) {
    // UNIQUE violation means already referred — silent success
    if (error.code === "23505") return NextResponse.json({ success: true, duplicate: true });
    return NextResponse.json({ error: "Failed to save referral" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// GET /api/referrals?handle=X — referral stats for a handle.
// count/xp_earned_total are harmless aggregates shown on public profiles, but
// `recent` names who was referred — only the owner gets that list (same IDOR
// pattern as /api/goals: a non-owner can't opt into seeing someone else's).
export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) return NextResponse.json({ error: "Missing handle" }, { status: 400 });

  const session = await getServerSession(authOptions);
  const isOwner = (session as { handle?: string } | null)?.handle === handle;

  const db = getServiceSupabase();

  const { data: referrals, error } = await db
    .from("referrals")
    .select("referred_handle, rewarded, created_at")
    .eq("referrer_handle", handle)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ count: 0, recent: [], xp_earned_total: 0 });

  const { data: xpRows } = await db
    .from("xp_earnings")
    .select("amount")
    .eq("handle", handle)
    .eq("source", "referral");

  const xp_earned_total = (xpRows ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0);

  return NextResponse.json({
    count: (referrals ?? []).length,
    recent: isOwner ? (referrals ?? []).slice(0, 5) : [],
    xp_earned_total,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";

async function upsertStreak(db: ReturnType<typeof getServiceSupabase>, handle: string) {
  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await db
    .from("user_streaks")
    .select("*")
    .eq("handle", handle)
    .single();

  if (!existing) {
    await db.from("user_streaks").insert({
      handle,
      current_streak: 1,
      longest_streak: 1,
      last_active: today,
      total_visits: 1,
    });
    return;
  }

  const lastActive = existing.last_active ?? "";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const isToday = lastActive === today;
  const wasYesterday = lastActive === yesterdayStr;

  const newStreak = isToday
    ? existing.current_streak
    : wasYesterday
    ? existing.current_streak + 1
    : 1;

  const newLongest = Math.max(existing.longest_streak ?? 1, newStreak);

  await db
    .from("user_streaks")
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_active: today,
      total_visits: (existing.total_visits ?? 0) + 1,
    })
    .eq("handle", handle);
}

async function awardReferralXp(
  db: ReturnType<typeof getServiceSupabase>,
  referred_handle: string
) {
  // Check if this handle was referred
  const { data: referral } = await db
    .from("referrals")
    .select("referrer_handle, rewarded")
    .eq("referred_handle", referred_handle)
    .single();

  if (!referral || referral.rewarded) return;

  const referrer = referral.referrer_handle;
  const todayStr = new Date().toISOString().split("T")[0];

  // Daily cap: max 25 XP from referrals per day
  const { data: todayEarnings } = await db
    .from("xp_earnings")
    .select("amount")
    .eq("handle", referrer)
    .eq("source", "referral")
    .gte("created_at", todayStr + "T00:00:00.000Z");

  const earnedToday = (todayEarnings ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
  if (earnedToday >= 25) return;

  const xpAmount = Math.min(5, 25 - earnedToday);

  // Award XP to referrer
  const { data: referrerRow } = await db
    .from("darkroom_ids")
    .select("bonus_points")
    .eq("handle", referrer)
    .single();

  await db
    .from("darkroom_ids")
    .update({ bonus_points: (referrerRow?.bonus_points ?? 0) + xpAmount })
    .eq("handle", referrer);

  // Log XP earning
  await db.from("xp_earnings").insert({
    handle: referrer,
    source: "referral",
    amount: xpAmount,
    meta: { referred_handle },
  });

  // Mark referral as rewarded
  await db
    .from("referrals")
    .update({ rewarded: true })
    .eq("referred_handle", referred_handle);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    handle,
    score,
    archetype,
    tagline,
    stats,
    analysis,
    darkroom_line,
    profile_image_url,
  } = body;

  if (!handle || !score || !archetype) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = getServiceSupabase();

  const { data: existing, error: fetchError } = await db
    .from("darkroom_ids")
    .select("*")
    .eq("handle", handle)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // New claim
  if (!existing) {
    const { error: insertError } = await db.from("darkroom_ids").insert({
      handle,
      score,
      archetype,
      tagline,
      stats,
      analysis,
      darkroom_line,
      profile_image_url: profile_image_url ?? null,
      claim_count: 1,
    });

    if (insertError) {
      return NextResponse.json({ error: "Failed to claim" }, { status: 500 });
    }

    await upsertStreak(db, handle);
    await awardReferralXp(db, handle);
    return NextResponse.json({ success: true, claimed: true });
  }

  // Existing — check cooldown
  const updatedAt = new Date(existing.updated_at);
  const daysSince = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSince < 30) {
    const daysRemaining = Math.ceil(30 - daysSince);
    return NextResponse.json({
      success: false,
      error: "reclaim_cooldown",
      days_remaining: daysRemaining,
    });
  }

  // Past cooldown — update
  const newCount = (existing.claim_count ?? 1) + 1;
  const { error: updateError } = await db
    .from("darkroom_ids")
    .update({
      score,
      archetype,
      tagline,
      stats,
      analysis,
      darkroom_line,
      profile_image_url: profile_image_url ?? null,
      claim_count: newCount,
      updated_at: new Date().toISOString(),
    })
    .eq("handle", handle);

  if (updateError) {
    return NextResponse.json({ error: "Failed to reclaim" }, { status: 500 });
  }

  await upsertStreak(db, handle);
  return NextResponse.json({ success: true, reclaimed: true, claim_count: newCount });
}

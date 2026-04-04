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

import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { sanitizeHandle } from "@/app/lib/sanitize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const refreshRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = refreshRateLimit.get(key);
  if (!entry || now > entry.resetAt) {
    refreshRateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const handle = sanitizeHandle((body as { handle?: string }).handle ?? "");

  if (!handle) {
    return NextResponse.json({ error: "Missing handle" }, { status: 400 });
  }

  // Security: only the authenticated owner of a handle can trigger its refresh.
  const session = await getServerSession(authOptions);
  const sessionHandle = (session as { handle?: string } | null)?.handle;
  if (!sessionHandle) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (sanitizeHandle(sessionHandle) !== handle) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(handle, 1, 60 * 1000)) {
    console.warn(`refresh: rate limit hit for handle=${handle}`);
    return NextResponse.json({ error: "Too many requests. Wait a minute." }, { status: 429 });
  }

  const db = getServiceSupabase();

  // Step 1: Fetch user record
  const { data: record, error: fetchError } = await db
    .from("darkroom_ids")
    .select("social_proof, builder_proof, work_proof, bonus_points, last_refresh_at")
    .eq("handle", handle)
    .single();

  if (fetchError || !record) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Step 2: Check 24h cooldown
  if (record.last_refresh_at) {
    const lastRefreshMs = new Date(record.last_refresh_at).getTime();
    const elapsed = Date.now() - lastRefreshMs;
    if (elapsed < TWENTY_FOUR_HOURS_MS) {
      const nextRefreshAt = new Date(lastRefreshMs + TWENTY_FOUR_HOURS_MS).toISOString();
      return NextResponse.json(
        { error: "Already refreshed today. Come back tomorrow.", next_refresh_at: nextRefreshAt },
        { status: 429 }
      );
    }
  }

  const bearerToken = process.env.BEARER_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!bearerToken) {
    return NextResponse.json({ error: "X API not configured" }, { status: 503 });
  }
  if (!anthropicKey) {
    return NextResponse.json({ error: "AI scoring not configured" }, { status: 503 });
  }

  // Step 3: Resolve X userId from handle
  let userId = "";
  const profileController = new AbortController();
  const profileTimeout = setTimeout(() => profileController.abort(), 10000);
  try {
    const profileRes = await fetch(
      `https://api.x.com/2/users/by/username/${encodeURIComponent(handle)}?user.fields=id`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
        next: { revalidate: 0 },
        signal: profileController.signal,
      }
    );
    clearTimeout(profileTimeout);
    if (!profileRes.ok) {
      const body = await profileRes.text().catch(() => "");
      console.log("refresh: profile fetch failed —", profileRes.status, body);
      return NextResponse.json({ error: "Failed to fetch X profile" }, { status: 502 });
    }
    const profileData = await profileRes.json();
    userId = profileData.data?.id ?? "";
  } catch (e) {
    clearTimeout(profileTimeout);
    const reason = e instanceof Error && e.name === "AbortError" ? "X profile request timed out" : "X API request failed";
    console.log("refresh:", reason, e);
    return NextResponse.json({ error: reason }, { status: 502 });
  }

  if (!userId) {
    return NextResponse.json({ error: "X user not found" }, { status: 404 });
  }

  // Step 4: Fetch last 50 tweets, keep original posts / self-threads only
  let recentTweets: { id: string; text: string }[] = [];
  const tweetsController = new AbortController();
  const tweetsTimeout = setTimeout(() => tweetsController.abort(), 10000);
  try {
    const tweetsRes = await fetch(
      `https://api.x.com/2/users/${userId}/tweets?max_results=50&tweet.fields=text,public_metrics,in_reply_to_user_id&exclude=retweets`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
        next: { revalidate: 0 },
        signal: tweetsController.signal,
      }
    );
    clearTimeout(tweetsTimeout);
    if (tweetsRes.ok) {
      const tweetsData = await tweetsRes.json();
      type TweetRaw = { id: string; text: string; in_reply_to_user_id?: string };
      // Keep original posts and self-threads; drop replies under other people's posts.
      recentTweets = (tweetsData.data ?? [])
        .filter((t: TweetRaw) => !t.in_reply_to_user_id || t.in_reply_to_user_id === userId)
        .map((t: TweetRaw) => ({ id: t.id, text: t.text.slice(0, 280) }));
    } else {
      const body = await tweetsRes.text().catch(() => "");
      console.log("refresh: tweets fetch failed —", tweetsRes.status, body);
      return NextResponse.json({ error: "Failed to fetch tweets" }, { status: 502 });
    }
  } catch (e) {
    clearTimeout(tweetsTimeout);
    const reason = e instanceof Error && e.name === "AbortError" ? "Tweets request timed out" : "X API request failed";
    console.log("refresh:", reason, e);
    return NextResponse.json({ error: reason }, { status: 502 });
  }

  // If every recent tweet turned out to be a reply (dropped by the filter above), there is
  // nothing original to score. Scoring against an empty prompt would let the AI guess/hallucinate
  // a number, which silently corrupts the profile's score. Keep the existing scores untouched
  // instead and flag it so the UI can say so honestly.
  const insufficientOriginalPosts = recentTweets.length === 0;

  type AnalyzedPost = { id: string; text: string; url: string };
  let newSocialProof: number;
  let newBuilderProof: number;
  let analyzedPosts: { social: AnalyzedPost[]; builder: AnalyzedPost[] } = { social: [], builder: [] };

  if (insufficientOriginalPosts) {
    newSocialProof = record.social_proof ?? 0;
    newBuilderProof = record.builder_proof ?? 0;
  } else {
    // Step 5: Call Claude
    const tweetsText = recentTweets.map((t, i) => `${i + 1}. ${t.text}`).join("\n");

    const claudeController = new AbortController();
    const claudeTimeout = setTimeout(() => claudeController.abort(), 15000);

    try {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          temperature: 0.3,
          system: `You are the Darkroom scoring engine. Analyze these recent tweets and return ONLY valid JSON, no markdown.
Handle: ${handle}
Recent tweets (numbered):
${tweetsText}

Score on 2 dimensions (0-100):
- social_proof: posting consistency, engagement quality, personal brand clarity
- builder_proof: technical content, projects mentioned, build-in-public signals

Then go through every tweet number (1-based) and decide which ONE dimension it primarily signals — social_proof or builder_proof, never both. A tweet that is clearly both (e.g. "shipped X, here's the thread") goes to whichever it signals more strongly, not to both lists. Skip tweets that signal neither (pure banter, one-word replies, no real content). List every tweet that does signal something — do not cap it to a top N, include all of them.

Return ONLY:
{
  "social_proof": number,
  "builder_proof": number,
  "social_indices": [array of tweet numbers, no overlap with builder_indices],
  "builder_indices": [array of tweet numbers, no overlap with social_indices]
}`,
          messages: [{ role: "user", content: "Score this profile." }],
        }),
        signal: claudeController.signal,
      });
      clearTimeout(claudeTimeout);

      if (!claudeRes.ok) {
        console.log("refresh: Claude failed —", claudeRes.status);
        return NextResponse.json({ error: "AI scoring failed" }, { status: 502 });
      }

      const claudeData = await claudeRes.json();
      const raw = claudeData.content?.[0]?.text ?? "";
      const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw;
      const parsed = JSON.parse(jsonText) as {
        social_proof: number;
        builder_proof: number;
        social_indices?: number[];
        builder_indices?: number[];
      };
      newSocialProof = Math.min(100, Math.max(0, Math.round(parsed.social_proof)));
      newBuilderProof = Math.min(100, Math.max(0, Math.round(parsed.builder_proof)));
      // Defensive dedup: the prompt asks for no overlap, but if the model lists a tweet
      // in both anyway, keep it in social and drop it from builder rather than showing
      // the same tweet twice across both dimensions.
      const socialIndexSet = new Set(parsed.social_indices ?? []);
      const builderIndicesDeduped = (parsed.builder_indices ?? []).filter((i) => !socialIndexSet.has(i));
      const toPosts = (indices: number[] | undefined): AnalyzedPost[] =>
        (indices ?? [])
          .map((i) => recentTweets[i - 1])
          .filter(Boolean)
          .map((t) => ({ id: t.id, text: t.text, url: `https://x.com/${handle}/status/${t.id}` }));
      analyzedPosts = {
        social: toPosts(parsed.social_indices),
        builder: toPosts(builderIndicesDeduped),
      };
    } catch (e) {
      clearTimeout(claudeTimeout);
      const reason = e instanceof Error && e.name === "AbortError" ? "AI scoring timed out" : "AI scoring failed";
      console.log("refresh:", reason, e);
      return NextResponse.json({ error: reason }, { status: 502 });
    }
  }

  // Step 6: Recalculate score
  const workProof = record.work_proof ?? 0;
  const newScore = Math.round((newSocialProof * 0.35) + (newBuilderProof * 0.35) + (workProof * 0.30));
  const totalScore = Math.min(100, newScore + (record.bonus_points ?? 0));
  const lastRefreshAt = new Date().toISOString();
  const nextRefreshAt = new Date(Date.now() + TWENTY_FOUR_HOURS_MS).toISOString();

  // Step 7: Persist
  // When there weren't enough original posts to rescore, don't overwrite analyzed_posts —
  // it would wipe out the last good breakdown with an empty one.
  const updatePayload: Record<string, unknown> = {
    social_proof: newSocialProof,
    builder_proof: newBuilderProof,
    score: newScore,
    last_refresh_at: lastRefreshAt,
  };
  if (!insufficientOriginalPosts) {
    updatePayload.analyzed_posts = analyzedPosts;
  }

  const { error: updateError } = await db
    .from("darkroom_ids")
    .update(updatePayload)
    .eq("handle", handle);

  if (updateError) {
    console.log("refresh: Supabase update failed —", updateError);
    return NextResponse.json({ error: "Failed to save refresh" }, { status: 500 });
  }

  return NextResponse.json({
    social_proof: newSocialProof,
    builder_proof: newBuilderProof,
    score: newScore,
    total_score: totalScore,
    last_refresh_at: lastRefreshAt,
    next_refresh_at: nextRefreshAt,
    insufficient_original_posts: insufficientOriginalPosts,
    ...(insufficientOriginalPosts ? {} : { analyzed_posts: analyzedPosts }),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { sanitizeHandle } from "@/app/lib/sanitize";

const generateRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = generateRateLimit.get(key);
  if (!entry || now > entry.resetAt) {
    generateRateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

export interface DarkroomResult {
  score: number;
  totalScore?: number;
  socialProof: number;
  builderProof: number;
  workProof: number;
  archetype: string;
  tagline: string;
  stats?: {
    focus: number;
    consistency: number;
    reliability: number;
    growth: number;
  };
  analysis: string;
  darkroom_line: string;
  profile_image_url?: string;
  profileImageUrl?: string;
  isFallback?: boolean;
  warnings?: string[];
}

function getArchetype(score: number): string {
  if (score >= 50) {
    if (score >= 62) return "Ghost Builder";
    if (score >= 56) return "Silent Architect";
    return "Shadow Operator";
  }
  if (score >= 32) {
    if (score >= 44) return "Half Built";
    if (score >= 38) return "Curious Lurker";
    return "Almost Based";
  }
  if (score >= 22) return "Main Character Loading";
  if (score >= 14) return "Fresh Compile";
  return "NPC (for now)";
}

function getFallbackResult(
  handle: string,
  goals: string[],
  warnings: string[] = []
): DarkroomResult {
  let socialProof = 35;
  let builderProof = 35;
  const workProof = 0;

  for (const goal of goals) {
    if (goal === "brand")     { socialProof += 5; }
    if (goal === "skills")    { builderProof += 8; }
    if (goal === "project")   { builderProof += 10; }
    if (goal === "community") { socialProof += 8; }
    if (goal === "freedom")   { builderProof += 4; }
    if (goal === "exploring") { builderProof += 5; }
  }

  if (/build|dev|ship|hack|code/i.test(handle)) {
    builderProof += 8;
  }

  socialProof  = Math.min(100, Math.max(0, socialProof));
  builderProof = Math.min(100, Math.max(0, builderProof));

  const score = Math.round((socialProof * 0.35) + (builderProof * 0.35) + (workProof * 0.30));
  const archetype = getArchetype(score);

  const taglines: Record<string, string> = {
    "Ghost Builder":          "ships in the dark, drops in the light",
    "Silent Architect":       "the blueprint speaks for itself",
    "Shadow Operator":        "you won't see me, but you'll see my work",
    "Half Built":             "foundation solid, still stacking floors",
    "Curious Lurker":         "reads everything, ships soon",
    "Almost Based":           "one commit away from greatness",
    "Main Character Loading": "the arc hasn't even started",
    "Fresh Compile":          "first build, first bugs, first glory",
    "NPC (for now)":          "everyone's origin story starts somewhere",
  };

  const lines: Record<string, string> = {
    "Ghost Builder":          "The Darkroom is where the real work happens.",
    "Silent Architect":       "In The Darkroom, your commits echo forever.",
    "Shadow Operator":        "The work speaks. You don't have to.",
    "Half Built":             "The foundation is solid. Keep stacking.",
    "Curious Lurker":         "The room is watching. Time to ship.",
    "Almost Based":           "One push away from legend status.",
    "Main Character Loading": "The origin story starts here.",
    "Fresh Compile":          "Every pro was once a beginner. Welcome.",
    "NPC (for now)":          "The Darkroom has a seat with your name on it.",
  };

  const goalLabels = goals.join(", ") || "something";

  return {
    score,
    totalScore: score,
    socialProof,
    builderProof,
    workProof,
    archetype,
    tagline: taglines[archetype] ?? "built different",
    analysis: `@${handle} — you're building toward ${goalLabels}. The profile tells a story of someone who hasn't stopped moving. The darkroom sees the pattern and it's early days in a long game.`,
    darkroom_line: lines[archetype] ?? "Welcome to the darkroom.",
    isFallback: true,
    warnings,
  };
}

export async function POST(req: NextRequest) {
  console.log("API ROUTE HIT", new Date().toISOString());
  const { handle: rawHandle, goals } = await req.json();
  const handle = sanitizeHandle(rawHandle ?? "");

  if (!handle || !goals || !Array.isArray(goals)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!checkRateLimit(handle, 3, 60 * 60 * 1000)) {
    console.warn(`generate: rate limit hit for handle=${handle}`);
    return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
  }

  const bearerToken = process.env.BEARER_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const warnings: string[] = [];

  // STEP 1 & 2: Fetch X profile + tweets
  let bio = "";
  let followersCount = 0;
  let followingCount = 0;
  let tweetCount = 0;
  let originalTweets: string[] = [];
  let replyTweets: string[] = [];
  let userId = "";
  let profileImageUrl = "";

  if (bearerToken) {
    console.log("Step 1: Fetching X profile for", handle);
    const profileController = new AbortController();
    const profileTimeout = setTimeout(() => profileController.abort(), 10000);
    try {
      const profileRes = await fetch(
        `https://api.x.com/2/users/by/username/${encodeURIComponent(handle)}?user.fields=description,public_metrics,profile_image_url`,
        {
          headers: { Authorization: `Bearer ${bearerToken}` },
          next: { revalidate: 0 },
          signal: profileController.signal,
        }
      );
      clearTimeout(profileTimeout);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const user = profileData.data;
        if (user) {
          userId = user.id ?? "";
          bio = user.description ?? "";
          followersCount = user.public_metrics?.followers_count ?? 0;
          followingCount = user.public_metrics?.following_count ?? 0;
          tweetCount = user.public_metrics?.tweet_count ?? 0;
          profileImageUrl = (user.profile_image_url ?? "").replace("_normal", "_400x400");
        } else {
          console.log("Step 1: profile response ok but data is empty:", JSON.stringify(profileData));
        }
      } else {
        const errorBody = await profileRes.text().catch(() => "(unreadable)");
        console.log("Step 1: profile fetch failed —", profileRes.status, errorBody);
        warnings.push(`x_api_failed: Could not fetch X profile (${profileRes.status})`);
      }
      console.log("Step 1 result:", JSON.stringify({ userId, bio, followers: followersCount, profileImageUrl }));
    } catch (e) {
      clearTimeout(profileTimeout);
      const reason = e instanceof Error && e.name === "AbortError" ? "X profile request timed out" : "Could not fetch X profile";
      console.log("Step 1: exception —", reason, e);
      warnings.push(`x_api_failed: ${reason}`);
    }

    if (userId) {
      type TweetRaw = { text: string; public_metrics?: { reply_count: number; retweet_count: number; like_count: number } };
      const formatTweet = (t: TweetRaw) => {
        const m = t.public_metrics;
        const e = m ? ` [❤${m.like_count} 🔁${m.retweet_count} 💬${m.reply_count}]` : "";
        return t.text.slice(0, 280) + e;
      };

      // Step 2a: original tweets only (no replies/retweets)
      console.log("Step 2a: Fetching original tweets for userId", userId);
      const origController = new AbortController();
      const origTimeout = setTimeout(() => origController.abort(), 10000);
      try {
        const origRes = await fetch(
          `https://api.x.com/2/users/${userId}/tweets?max_results=30&exclude=replies,retweets&tweet.fields=text,public_metrics`,
          { headers: { Authorization: `Bearer ${bearerToken}` }, next: { revalidate: 0 }, signal: origController.signal }
        );
        clearTimeout(origTimeout);
        if (origRes.ok) {
          const d = await origRes.json();
          originalTweets = (d.data ?? []).map(formatTweet);
          console.log("Step 2a result: got", originalTweets.length, "original tweets");
        } else {
          const errorBody = await origRes.text().catch(() => "(unreadable)");
          console.log("Step 2a: failed —", origRes.status, errorBody);
          warnings.push(`x_tweets_failed: Could not fetch original tweets (${origRes.status})`);
        }
      } catch (e) {
        clearTimeout(origTimeout);
        const reason = e instanceof Error && e.name === "AbortError" ? "Original tweets request timed out" : "Could not fetch original tweets";
        console.log("Step 2a: exception —", reason, e);
        warnings.push(`x_tweets_failed: ${reason}`);
      }

      // Step 2b: all tweets including replies (to isolate reply behavior)
      console.log("Step 2b: Fetching replies for userId", userId);
      const repliesController = new AbortController();
      const repliesTimeout = setTimeout(() => repliesController.abort(), 10000);
      try {
        const repliesRes = await fetch(
          `https://api.x.com/2/users/${userId}/tweets?max_results=30&tweet.fields=text,public_metrics`,
          { headers: { Authorization: `Bearer ${bearerToken}` }, next: { revalidate: 0 }, signal: repliesController.signal }
        );
        clearTimeout(repliesTimeout);
        if (repliesRes.ok) {
          const d = await repliesRes.json();
          const all: string[] = (d.data ?? []).map(formatTweet);
          // replies = full timeline minus originals
          const origSet = new Set(originalTweets);
          replyTweets = all.filter((t) => !origSet.has(t));
          console.log("Step 2b result: got", replyTweets.length, "replies");
        } else {
          const errorBody = await repliesRes.text().catch(() => "(unreadable)");
          console.log("Step 2b: failed —", repliesRes.status, errorBody);
          warnings.push(`x_replies_failed: Could not fetch replies (${repliesRes.status})`);
        }
      } catch (e) {
        clearTimeout(repliesTimeout);
        const reason = e instanceof Error && e.name === "AbortError" ? "Replies request timed out" : "Could not fetch replies";
        console.log("Step 2b: exception —", reason, e);
        warnings.push(`x_replies_failed: ${reason}`);
      }
    } else {
      console.log("Step 2: skipped — userId is empty (Step 1 likely failed)");
    }
  } else {
    warnings.push("x_api_failed: No bearer token configured");
  }

  // STEP 3: Call Claude
  if (!anthropicKey) {
    console.log("Fallback: using deterministic scoring (no API key)");
    warnings.push("claude_api_failed: No API key configured, using fallback scoring");
    const fallback = getFallbackResult(handle, goals, warnings);
    try {
      const supabase = getServiceSupabase();
      const { error: upsertErr } = await supabase.from("darkroom_ids").upsert(
        { handle, social_proof: fallback.socialProof, builder_proof: fallback.builderProof, work_proof: fallback.workProof, score: fallback.score, generate_at: new Date().toISOString() },
        { onConflict: "handle" }
      );
      if (upsertErr) console.error("Supabase upsert (no-key fallback) failed:", JSON.stringify(upsertErr));
    } catch (dbErr) { console.error("Supabase upsert (no-key fallback) exception:", dbErr); }
    return NextResponse.json({ ...fallback, profile_image_url: profileImageUrl || undefined });
  }

  console.log("Step 3: Calling Claude API");
  console.log("Sending to Claude:", JSON.stringify({ handle, goals, bio, followers: followersCount, originalTweets: originalTweets.length, replyTweets: replyTweets.length }));

  const userMessage = `
Handle: @${handle}
Selected goals: ${goals.join(", ")}
Bio: ${bio || "(not available)"}
Followers: ${followersCount} | Following: ${followingCount} | Total tweets: ${tweetCount}

--- ORIGINAL TWEETS (${originalTweets.length}, excludes replies/retweets) ---
${originalTweets.length > 0 ? originalTweets.map((t, i) => `${i + 1}. ${t}`).join("\n") : "(none available)"}

--- REPLIES (${replyTweets.length}, their engagement with others) ---
${replyTweets.length > 0 ? replyTweets.map((t, i) => `${i + 1}. ${t}`).join("\n") : "(none available)"}
`.trim();

  const claudeController = new AbortController();
  const claudeTimeout = setTimeout(() => claudeController.abort(), 10000);
  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        temperature: 0.3,
        system: `You are The Darkroom ID generator. Analyze the user's X profile data and their stated goals to produce a builder identity score across two dimensions.

The user selected their building goals from: brand, skills, project, community, freedom, exploring. They may have selected multiple.

You receive two sets of tweets: ORIGINAL TWEETS (what they post) and REPLIES (how they engage). Analyze SUBSTANCE, not volume.

--- DIMENSION 1: social_proof (0–100) ---
Evidence that this person has a real, engaged presence in a community.
High signals: meaningful follower count, thoughtful replies to others, mentions of community involvement, consistent engagement, people responding to their content.
Low signals: gm/lfg noise, one-way broadcast with no replies, brand-new accounts, fake-looking metrics.
Score 0-100. 50 = average active user. 80+ = clearly respected in their space.

--- DIMENSION 2: builder_proof (0–100) ---
Evidence that this person actually builds things.
High signals: tweets about shipping projects, technical insights, learning in public, sharing work/links, bio mentions of roles/tools/products, long-form thoughtful content about making things.
Low signals: generic motivation, shitposts, retweet-only behavior, no mention of projects or output in bio or tweets.
Score 0-100. 50 = someone who talks about building. 80+ = someone clearly shipping.

QUALITY OVER QUANTITY: 5 substantive build tweets > 50 gm tweets. Be calibrated — most users score 20–55. Reserve 70+ for genuinely impressive profiles.

YOUR TONE: A robot mentor that roasts with love. Sharp and observational, slightly ironic, always opening a door. The user should feel SEEN and READY — not deflated. Avoid: "fails", "lacks", "weak", "poor". Use: "potential", "could", "the gap is", "ready to".

GOAL SIGNALS (let selected goals inform but not override the tweet evidence):
- brand + project = expect higher builder_proof
- community = expect higher social_proof
- skills + exploring = early-stage builder, calibrate builder_proof accordingly
- freedom + project = high ambition signal, check if tweets back it up

ARCHETYPES (pick ONE based on combined score = (social_proof × 0.35) + (builder_proof × 0.35)):
High tier (50-70): 'Ghost Builder' (ships in the dark, drops in the light), 'Silent Architect' (the blueprint speaks for itself), 'Shadow Operator' (you won't see me, but you'll see my work)
Mid tier (32-49): 'Half Built' (foundation solid, still stacking floors), 'Curious Lurker' (reads everything, ships soon), 'Almost Based' (one commit away from greatness)
Low tier (0-31): 'Main Character Loading' (the arc hasn't even started), 'Fresh Compile' (first build, first bugs, first glory), 'NPC (for now)' (everyone's origin story starts somewhere)

TAGLINE RULES (max 8 words, specific to this profile):
- Sharp observation, NEVER cruel. Energy: "I see you and I'm rooting for you."
- Examples: 'more potential than tweets suggest', 'the receipts are coming, just not yet', 'shipping while they sleep', 'all signal, zero noise'
- NEVER mention privacy, ZK, proof, or crypto generically.

ANALYSIS RULES (exactly 3 sentences):
- Sentence 1: Warm, specific observation from their actual tweets or bio — something they might have missed about themselves.
- Sentence 2: The honest gap — frame as "the gap is X" not "you fail at X".
- Sentence 3: Clear actionable path forward — end on hope and a specific door they can open tomorrow.

Respond ONLY with JSON (no markdown, no backticks):
{"social_proof": <0-100>, "builder_proof": <0-100>, "archetype": "<exact name from list>", "tagline": "<max 8 words>", "analysis": "<3 sentences>", "darkroom_line": "<One Darkroom-themed line about building. Focus on builder mindset. Never mention privacy or ZK.>"}`,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: claudeController.signal,
    });
    clearTimeout(claudeTimeout);

    if (!claudeRes.ok) {
      console.log("Fallback: using deterministic scoring (Claude returned", claudeRes.status, ")");
      warnings.push(`claude_api_failed: AI generation failed (${claudeRes.status}), using fallback scoring`);
      const fallback = getFallbackResult(handle, goals, warnings);
      try {
        const supabase = getServiceSupabase();
        await supabase.from("darkroom_ids").upsert(
          { handle, social_proof: fallback.socialProof, builder_proof: fallback.builderProof, work_proof: fallback.workProof, score: fallback.score, generate_at: new Date().toISOString() },
          { onConflict: "handle" }
        );
      } catch (dbErr) { console.log("Supabase upsert (fallback) failed:", dbErr); }
      return NextResponse.json({ ...fallback, profile_image_url: profileImageUrl || undefined });
    }

    const claudeData = await claudeRes.json();
    const raw = claudeData.content?.[0]?.text ?? "";
    const parsed = JSON.parse(raw) as {
      social_proof: number;
      builder_proof: number;
      archetype: string;
      tagline: string;
      analysis: string;
      darkroom_line: string;
    };

    const socialProof  = Math.min(100, Math.max(0, Math.round(parsed.social_proof)));
    const builderProof = Math.min(100, Math.max(0, Math.round(parsed.builder_proof)));
    const workProof    = 0;
    const baseScore    = Math.round((socialProof * 0.35) + (builderProof * 0.35) + (workProof * 0.30));
    const totalScore   = baseScore;

    try {
      const supabase = getServiceSupabase();
      await supabase.from("darkroom_ids").upsert(
        { handle, social_proof: socialProof, builder_proof: builderProof, work_proof: workProof, score: baseScore, generate_at: new Date().toISOString() },
        { onConflict: "handle" }
      );
    } catch (dbErr) {
      console.error("Supabase upsert (claude success) failed:", JSON.stringify(dbErr));
    }

    return NextResponse.json({
      handle,
      score: baseScore,
      totalScore,
      socialProof,
      builderProof,
      workProof,
      archetype: parsed.archetype,
      tagline: parsed.tagline,
      analysis: parsed.analysis,
      darkroom_line: parsed.darkroom_line,
      profileImageUrl: profileImageUrl || undefined,
      profile_image_url: profileImageUrl || undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (e) {
    clearTimeout(claudeTimeout);
    const reason = e instanceof Error && e.name === "AbortError"
      ? "Claude request timed out"
      : e instanceof Error ? e.message : "AI generation failed";
    console.log("Fallback: using deterministic scoring —", reason);
    warnings.push(`claude_api_failed: ${reason}, using fallback scoring`);
    const fallback = getFallbackResult(handle, goals, warnings);
    try {
      const supabase = getServiceSupabase();
      await supabase.from("darkroom_ids").upsert(
        { handle, social_proof: fallback.socialProof, builder_proof: fallback.builderProof, work_proof: fallback.workProof, score: fallback.score, generate_at: new Date().toISOString() },
        { onConflict: "handle" }
      );
    } catch (dbErr) { console.log("Supabase upsert (fallback) failed:", dbErr); }
    return NextResponse.json({ ...fallback, profile_image_url: profileImageUrl || undefined });
  }
}

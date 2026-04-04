import { NextRequest, NextResponse } from "next/server";

export interface DarkroomResult {
  score: number;
  archetype: string;
  tagline: string;
  stats: {
    dedication: number;
    consistency: number;
    stealth: number;
    momentum: number;
  };
  analysis: string;
  darkroom_line: string;
  profile_image_url?: string;
  isFallback?: boolean;
  warnings?: string[];
}

function getArchetype(score: number): string {
  if (score >= 75) {
    if (score >= 88) return "Ghost Builder";
    if (score >= 82) return "Silent Architect";
    return "Shadow Operator";
  }
  if (score >= 50) {
    if (score >= 68) return "Half Built";
    if (score >= 58) return "Curious Lurker";
    return "Almost Based";
  }
  if (score >= 45) return "Main Character Loading";
  if (score >= 42) return "Fresh Compile";
  return "NPC (for now)";
}

function getFallbackResult(
  handle: string,
  q1: string,
  q2: string,
  q3: string,
  warnings: string[] = []
): DarkroomResult {
  const q1Score =
    q1 === "6plus" ? 30 : q1 === "3to5" ? 22 : q1 === "1to2" ? 14 : 6;

  const q2Score =
    q2 === "daily" ? 28 : q2 === "rhythm" ? 20 : q2 === "waves" ? 12 : 5;

  const q3Score =
    q3 === "silence" ? 20 : q3 === "document" ? 16 : q3 === "public" ? 14 : 8;

  const handleBonus =
    /build|dev|ship|hack|code/i.test(handle) ? 8 : 0;

  const rawScore = q1Score + q2Score + q3Score + handleBonus;
  const score = Math.min(98, Math.max(40, rawScore));
  const archetype = getArchetype(score);

  const dedicationStat = Math.min(98, q1Score * 3 + 8);
  const consistencyStat = Math.min(98, q2Score * 3 + 8);
  const stealthStat = Math.min(98, q3Score === 20 ? 85 : q3Score === 16 ? 55 : q3Score === 14 ? 30 : 50);
  const momentumStat = Math.min(98, Math.max(20, Math.round((dedicationStat + consistencyStat) / 2) + handleBonus));

  const taglines: Record<string, string> = {
    "Ghost Builder": "ships in the dark, drops in the light",
    "Silent Architect": "the blueprint speaks for itself",
    "Shadow Operator": "you won't see me, but you'll see my work",
    "Half Built": "foundation solid, still stacking floors",
    "Curious Lurker": "reads everything, ships soon",
    "Almost Based": "one commit away from greatness",
    "Main Character Loading": "the arc hasn't even started",
    "Fresh Compile": "first build, first bugs, first glory",
    "NPC (for now)": "everyone's origin story starts somewhere",
  };

  const lines: Record<string, string> = {
    "Ghost Builder": "The darkroom is your natural habitat.",
    "Silent Architect": "Plans built in the dark, revealed in the light.",
    "Shadow Operator": "The work speaks. You don't have to.",
    "Half Built": "The foundation is solid. Keep stacking.",
    "Curious Lurker": "The room is watching. Time to ship.",
    "Almost Based": "One push away from legend status.",
    "Main Character Loading": "The origin story starts here.",
    "Fresh Compile": "Every pro was once a beginner. Welcome.",
    "NPC (for now)": "The darkroom has a seat with your name on it.",
  };

  return {
    score,
    archetype,
    tagline: taglines[archetype] ?? "built different",
    stats: {
      dedication: dedicationStat,
      consistency: consistencyStat,
      stealth: stealthStat,
      momentum: momentumStat,
    },
    analysis: `@${handle} — the quiz answers tell a story. You're building with intention, keeping your cards close, and the profile checks out. The darkroom recognizes the pattern.`,
    darkroom_line: lines[archetype] ?? "Welcome to the darkroom.",
    isFallback: true,
    warnings,
  };
}

export async function POST(req: NextRequest) {
  console.log("API ROUTE HIT", new Date().toISOString());
  const { handle, q1, q2, q3 } = await req.json();

  if (!handle || !q1 || !q2 || !q3) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const bearerToken = process.env.BEARER_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const warnings: string[] = [];

  // STEP 1 & 2: Fetch X profile + tweets
  let bio = "";
  let followersCount = 0;
  let followingCount = 0;
  let tweetCount = 0;
  let recentTweets: string[] = [];
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
      console.log("Step 2: Fetching tweets for userId", userId);
      const tweetsController = new AbortController();
      const tweetsTimeout = setTimeout(() => tweetsController.abort(), 10000);
      try {
        const tweetsRes = await fetch(
          `https://api.x.com/2/users/${userId}/tweets?max_results=10&tweet.fields=text`,
          {
            headers: { Authorization: `Bearer ${bearerToken}` },
            next: { revalidate: 0 },
            signal: tweetsController.signal,
          }
        );
        clearTimeout(tweetsTimeout);

        if (tweetsRes.ok) {
          const tweetsData = await tweetsRes.json();
          recentTweets = (tweetsData.data ?? []).map(
            (t: { text: string }) => t.text
          );
          console.log("Step 2 result: got", recentTweets.length, "tweets");
        } else {
          const errorBody = await tweetsRes.text().catch(() => "(unreadable)");
          console.log("Step 2: tweets fetch failed —", tweetsRes.status, errorBody);
          warnings.push(`x_tweets_failed: Could not fetch recent tweets (${tweetsRes.status})`);
        }
      } catch (e) {
        clearTimeout(tweetsTimeout);
        const reason = e instanceof Error && e.name === "AbortError" ? "Tweets request timed out" : "Could not fetch recent tweets";
        console.log("Step 2: exception —", reason, e);
        warnings.push(`x_tweets_failed: ${reason}`);
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
    return NextResponse.json({ ...getFallbackResult(handle, q1, q2, q3, warnings), profile_image_url: profileImageUrl || undefined });
  }

  console.log("Step 3: Calling Claude API");
  console.log("Sending to Claude:", JSON.stringify({ handle, q1, q2, q3, bio, followers: followersCount, tweetCount: recentTweets.length }));

  const userMessage = `
Handle: @${handle}
Bio: ${bio || "(not available)"}
Followers: ${followersCount} | Following: ${followingCount} | Tweets: ${tweetCount}

Quiz answers:
- How many hours a day do you spend building or learning? → "${q1}"
- How consistent are you? → "${q2}"
- What's your relationship with sharing your work? → "${q3}"

Recent tweets (last 10):
${recentTweets.length > 0 ? recentTweets.map((t, i) => `${i + 1}. ${t}`).join("\n") : "(not available)"}
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
        system: `You are The Darkroom ID generator. Analyze the user's X profile and quiz answers to create a builder personality profile.

The quiz measures real builder habits:
- Q1: Daily time investment (6plus=max dedication, notenough=starting)
- Q2: Consistency (daily=iron discipline, motivation=sporadic)
- Q3: Sharing style (silence=stealth builder, public=open builder, absorbing=learner)

ARCHETYPES (pick ONE based on score):
High tier (75-98): 'Silent Architect' (the blueprint speaks for itself), 'Ghost Builder' (ships in the dark, drops in the light), 'Shadow Operator' (you won't see me, but you'll see my work)
Mid tier (50-74): 'Half Built' (foundation solid, still stacking floors), 'Curious Lurker' (reads everything, ships soon), 'Almost Based' (one commit away from greatness)
Low tier (40-49): 'Main Character Loading' (the arc hasn't even started), 'Fresh Compile' (first build, first bugs, first glory), 'NPC (for now)' (everyone's origin story starts somewhere)

STATS to generate (each 20-98):
- dedication: how much time they invest daily
- consistency: how regular they are
- stealth: how much they build in silence vs public (high = silent, low = public sharer)
- momentum: overall energy combining all signals + X profile activity

SCORING GUIDE:
- 6plus hours + daily + silence = highest scores (Silent Architect / Ghost Builder)
- 3to5 + rhythm + document = solid mid tier
- notenough + motivation + absorbing = lower tier but always encouraging
- X profile boosts: active tweeter = momentum boost, bio with build/ship/dev = dedication boost, high follower ratio = influence

Respond ONLY with JSON (no markdown, no backticks):
{"score": <40-98>, "archetype": "<exact name from list>", "tagline": "<max 8 words. Builder-focused. Reference something specific from their X bio or tweets. About their work ethic, building habits, or craft. NEVER mention privacy, ZK, proof, or crypto. Examples: 'building so hard sleep forgot you', 'commits speak louder than tweets', 'shipping while they sleep'. Must be personal and witty.>", "stats": {"dedication": <20-98>, "consistency": <20-98>, "stealth": <20-98>, "momentum": <20-98>}, "analysis": "<3 sentences. Fun, reference their handle and actual habits. Never mean, always encouraging.>", "darkroom_line": "<One Darkroom themed line about building. NEVER mention privacy or ZK. Focus on builder mindset, shipping, grinding, focus. Examples: 'The Darkroom is where the real work happens.', 'In The Darkroom, your commits echo forever.'>"}`,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: claudeController.signal,
    });
    clearTimeout(claudeTimeout);

    if (!claudeRes.ok) {
      console.log("Fallback: using deterministic scoring (Claude returned", claudeRes.status, ")");
      warnings.push(`claude_api_failed: AI generation failed (${claudeRes.status}), using fallback scoring`);
      return NextResponse.json({ ...getFallbackResult(handle, q1, q2, q3, warnings), profile_image_url: profileImageUrl || undefined });
    }

    const claudeData = await claudeRes.json();
    const raw = claudeData.content?.[0]?.text ?? "";
    const result: DarkroomResult = JSON.parse(raw);
    result.warnings = warnings.length > 0 ? warnings : undefined;
    result.profile_image_url = profileImageUrl || undefined;
    return NextResponse.json(result);
  } catch (e) {
    clearTimeout(claudeTimeout);
    const reason = e instanceof Error && e.name === "AbortError"
      ? "Claude request timed out"
      : e instanceof Error ? e.message : "AI generation failed";
    console.log("Fallback: using deterministic scoring —", reason);
    warnings.push(`claude_api_failed: ${reason}, using fallback scoring`);
    return NextResponse.json({ ...getFallbackResult(handle, q1, q2, q3, warnings), profile_image_url: profileImageUrl || undefined });
  }
}

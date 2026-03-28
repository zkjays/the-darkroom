import { NextRequest, NextResponse } from "next/server";

export interface DarkroomResult {
  score: number;
  archetype: string;
  tagline: string;
  stats: {
    builder: number;
    privacy: number;
    crypto: number;
    community: number;
  };
  analysis: string;
  darkroom_line: string;
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
    q1 === "Ship fast, fix later"
      ? 25
      : q1 === "Late nights, no announcements"
      ? 22
      : q1 === "Plan everything, then execute"
      ? 20
      : 10;

  const q2Score =
    q2 === "Close the tab instantly"
      ? 25
      : q2 === "Only if it's zero-knowledge"
      ? 20
      : q2 === "Depends on the upside"
      ? 12
      : 5;

  const q3Score =
    q3 === "Privacy wallets, own nodes, self-sovereign"
      ? 25
      : q3 === "DeFi, swaps, onchain daily"
      ? 18
      : q3 === "Hold and check prices sometimes"
      ? 10
      : 5;

  const handleBonus =
    /zk|anon|proof|dev|build|0x|eth|btc|hack/i.test(handle) ? 8 : 0;

  const score = Math.min(98, q1Score + q2Score + q3Score + handleBonus);
  const archetype = getArchetype(score);

  const builderStat = Math.min(98, q1Score * 3 + 20);
  const privacyStat = Math.min(98, q2Score * 3 + 20);
  const cryptoStat = Math.min(98, q3Score * 3 + 20);
  const communityStat = Math.min(98, Math.max(20, handleBonus * 5 + 30));

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
      builder: builderStat,
      privacy: privacyStat,
      crypto: cryptoStat,
      community: communityStat,
    },
    analysis: `@${handle} — the quiz answers tell a story. You're building with intention, keeping your cards close, and the profile checks out. The darkroom recognizes the pattern.`,
    darkroom_line: lines[archetype] ?? "Welcome to the darkroom.",
    isFallback: true,
    warnings,
  };
}

export async function POST(req: NextRequest) {
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
        }
      } else {
        warnings.push(`x_api_failed: Could not fetch X profile (${profileRes.status})`);
      }
    } catch (e) {
      clearTimeout(profileTimeout);
      warnings.push(`x_api_failed: ${e instanceof Error && e.name === "AbortError" ? "X profile request timed out" : "Could not fetch X profile"}`);
    }

    if (userId) {
      console.log("Step 2: Fetching tweets for user", userId);
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
        } else {
          warnings.push(`x_tweets_failed: Could not fetch recent tweets (${tweetsRes.status})`);
        }
      } catch (e) {
        clearTimeout(tweetsTimeout);
        warnings.push(`x_tweets_failed: ${e instanceof Error && e.name === "AbortError" ? "Tweets request timed out" : "Could not fetch recent tweets"}`);
      }
    }
  } else {
    warnings.push("x_api_failed: No bearer token configured");
  }

  // STEP 3: Call Claude
  if (!anthropicKey) {
    console.log("Fallback: using deterministic scoring (no API key)");
    warnings.push("claude_api_failed: No API key configured, using fallback scoring");
    return NextResponse.json(getFallbackResult(handle, q1, q2, q3, warnings));
  }

  console.log("Step 3: Calling Claude API");

  const userMessage = `
Handle: @${handle}
Bio: ${bio || "(not available)"}
Followers: ${followersCount} | Following: ${followingCount} | Tweets: ${tweetCount}

Quiz answers:
- How do you build? → "${q1}"
- A project asks for your identity. You... → "${q2}"
- How do you interact with crypto? → "${q3}"

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

ARCHETYPES (pick ONE based on score):
High tier (75-98): 'Silent Architect' (the blueprint speaks for itself), 'Ghost Builder' (ships in the dark, drops in the light), 'Shadow Operator' (you won't see me, but you'll see my work)
Mid tier (50-74): 'Half Built' (foundation solid, still stacking floors), 'Curious Lurker' (reads everything, ships soon), 'Almost Based' (one commit away from greatness)
Low tier (40-49): 'Main Character Loading' (the arc hasn't even started), 'Fresh Compile' (first build, first bugs, first glory), 'NPC (for now)' (everyone's origin story starts somewhere)

SCORING GUIDE:
- Builder mindset: 'ship fast' or 'late nights' = high builder, 'watching' = low
- Privacy: 'close tab' or 'zero-knowledge' = high privacy, 'no problem' = low
- Crypto: 'privacy wallets/self-sovereign' = highest, 'still figuring out' = lowest
- X profile: bio with builder/dev/founder keywords = boost. Active tweeter = community boost. Handle with zk/anon/proof = privacy boost.

Respond ONLY with JSON (no markdown, no backticks):
{
  "score": <number 40-98>,
  "archetype": "<exact name from list above>",
  "tagline": "<max 8 words, fun, builder-native>",
  "stats": { "builder": <20-98>, "privacy": <20-98>, "crypto": <20-98>, "community": <20-98> },
  "analysis": "<3 sentences max. Fun, witty, reference their actual handle and bio. Never mean, always encouraging.>",
  "darkroom_line": "<one Darkroom themed line based on tier>"
}`,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: claudeController.signal,
    });
    clearTimeout(claudeTimeout);

    if (!claudeRes.ok) {
      console.log("Fallback: using deterministic scoring (Claude returned", claudeRes.status, ")");
      warnings.push(`claude_api_failed: AI generation failed (${claudeRes.status}), using fallback scoring`);
      return NextResponse.json(getFallbackResult(handle, q1, q2, q3, warnings));
    }

    const claudeData = await claudeRes.json();
    const raw = claudeData.content?.[0]?.text ?? "";
    const result: DarkroomResult = JSON.parse(raw);
    result.warnings = warnings.length > 0 ? warnings : undefined;
    return NextResponse.json(result);
  } catch (e) {
    clearTimeout(claudeTimeout);
    const reason = e instanceof Error && e.name === "AbortError"
      ? "Claude request timed out"
      : e instanceof Error ? e.message : "AI generation failed";
    console.log("Fallback: using deterministic scoring —", reason);
    warnings.push(`claude_api_failed: ${reason}, using fallback scoring`);
    return NextResponse.json(getFallbackResult(handle, q1, q2, q3, warnings));
  }
}

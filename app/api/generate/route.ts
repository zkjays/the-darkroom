import { NextRequest, NextResponse } from "next/server";

export interface DarkroomResult {
  score: number;
  archetype: string;
  tagline: string;
  stats: {
    focus: number;
    consistency: number;
    reliability: number;
    growth: number;
  };
  analysis: string;
  darkroom_line: string;
  profile_image_url?: string;
  isFallback?: boolean;
  warnings?: string[];
}

function getArchetype(score: number): string {
  if (score >= 60) {
    if (score >= 72) return "Ghost Builder";
    if (score >= 66) return "Silent Architect";
    return "Shadow Operator";
  }
  if (score >= 45) {
    if (score >= 55) return "Half Built";
    if (score >= 50) return "Curious Lurker";
    return "Almost Based";
  }
  if (score >= 40) return "Main Character Loading";
  if (score >= 35) return "Fresh Compile";
  return "NPC (for now)";
}

function getFallbackResult(
  handle: string,
  goals: string[],
  warnings: string[] = []
): DarkroomResult {
  let focus = 25, consistency = 25, reliability = 25, growth = 25;

  for (const goal of goals) {
    if (goal === "brand")     { focus += 5;  consistency += 5; }
    if (goal === "skills")    { focus += 8;  growth += 5; }
    if (goal === "project")   { focus += 10; reliability += 5; }
    if (goal === "community") { reliability += 8; consistency += 5; }
    if (goal === "freedom")   { growth += 5; consistency += 3; }
    if (goal === "exploring") { growth += 8; }
  }

  if (/build|dev|ship|hack|code/i.test(handle)) {
    reliability += 5;
    focus += 5;
  }

  focus       = Math.min(75, Math.max(15, focus));
  consistency = Math.min(75, Math.max(15, consistency));
  reliability = Math.min(75, Math.max(15, reliability));
  growth      = Math.min(75, Math.max(15, growth));

  const score = Math.min(75, Math.max(30, Math.round((focus + consistency + reliability + growth) / 4)));
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
    archetype,
    tagline: taglines[archetype] ?? "built different",
    stats: { focus, consistency, reliability, growth },
    analysis: `@${handle} — you're building toward ${goalLabels}. The profile tells a story of someone who hasn't stopped moving. The darkroom sees the pattern and it's early days in a long game.`,
    darkroom_line: lines[archetype] ?? "Welcome to the darkroom.",
    isFallback: true,
    warnings,
  };
}

export async function POST(req: NextRequest) {
  console.log("API ROUTE HIT", new Date().toISOString());
  const { handle, goals } = await req.json();

  if (!handle || !goals || !Array.isArray(goals) || goals.length === 0) {
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
          recentTweets = (tweetsData.data ?? []).map((t: { text: string }) => t.text);
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
    return NextResponse.json({ ...getFallbackResult(handle, goals, warnings), profile_image_url: profileImageUrl || undefined });
  }

  console.log("Step 3: Calling Claude API");
  console.log("Sending to Claude:", JSON.stringify({ handle, goals, bio, followers: followersCount, tweetCount: recentTweets.length }));

  const userMessage = `
Handle: @${handle}
Selected goals: ${goals.join(", ")}
Bio: ${bio || "(not available)"}
Followers: ${followersCount} | Following: ${followingCount} | Tweets: ${tweetCount}

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
        system: `You are The Darkroom ID generator. Analyze the user's X profile data and their stated goals to create a builder personality profile.

The user selected their building goals from: brand, skills, project, community, freedom, exploring. They may have selected multiple.

You have their X profile data: bio, follower count, tweet count, recent tweets.

METRICS to score (each 15-75, this is a quiz-only score, bonus points from lessons/certs come later):
- focus: How deep and specialized is this person? Do their tweets and bio show expertise in specific areas or are they scattered? Consistent topics = high. Random everything = low.
- consistency: How regularly do they show up? Tweet frequency, account age vs activity ratio. Daily grinder = high. Ghost who tweets once a month = low.
- reliability: Could a project hire this person? Professional tone, constructive engagement, mentions of real work/roles in bio, transparent about their journey. Shill-only accounts = low.
- growth: Real growth potential, not vanity. Engagement quality over follower count. Learning-oriented content, helping others, improving over time = high. Stagnant or fake engagement = low.

GOAL SIGNALS (how their selected goals influence scoring):
- brand + project = high focus, high reliability
- skills + exploring = high growth
- community + brand = high reliability, high consistency
- freedom + skills = high growth, high focus
- project alone = highest focus
- exploring alone = honest, boost growth slightly
- Many goals selected = ambitious but possibly scattered, moderate focus

ARCHETYPES (pick ONE based on total score):
High tier (60-75): 'Silent Architect' (the blueprint speaks for itself), 'Ghost Builder' (ships in the dark, drops in the light), 'Shadow Operator' (you won't see me, but you'll see my work)
Mid tier (45-59): 'Half Built' (foundation solid, still stacking floors), 'Curious Lurker' (reads everything, ships soon), 'Almost Based' (one commit away from greatness)
Low tier (30-44): 'Main Character Loading' (the arc hasn't even started), 'Fresh Compile' (first build, first bugs, first glory), 'NPC (for now)' (everyone's origin story starts somewhere)

Respond ONLY with JSON (no markdown, no backticks):
{"score": <30-75>, "archetype": "<exact name from list>", "tagline": "<max 8 words. Builder-focused. Reference something from their X bio or tweets. NEVER mention privacy, ZK, proof, or crypto. About their work ethic or craft. Must be personal and witty.>", "stats": {"focus": <15-75>, "consistency": <15-75>, "reliability": <15-75>, "growth": <15-75>}, "analysis": "<3 sentences. Reference their handle, their actual tweets/bio content, and their selected goals. Fun, encouraging, never mean.>", "darkroom_line": "<One Darkroom themed line about building. NEVER mention privacy or ZK. Focus on builder mindset.>"}`,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: claudeController.signal,
    });
    clearTimeout(claudeTimeout);

    if (!claudeRes.ok) {
      console.log("Fallback: using deterministic scoring (Claude returned", claudeRes.status, ")");
      warnings.push(`claude_api_failed: AI generation failed (${claudeRes.status}), using fallback scoring`);
      return NextResponse.json({ ...getFallbackResult(handle, goals, warnings), profile_image_url: profileImageUrl || undefined });
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
    return NextResponse.json({ ...getFallbackResult(handle, goals, warnings), profile_image_url: profileImageUrl || undefined });
  }
}

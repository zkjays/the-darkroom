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
    return NextResponse.json({ ...getFallbackResult(handle, goals, warnings), profile_image_url: profileImageUrl || undefined });
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
        system: `You are The Darkroom ID generator. Analyze the user's X profile data and their stated goals to create a builder personality profile.

The user selected their building goals from: brand, skills, project, community, freedom, exploring. They may have selected multiple.

You receive two sets of tweets: ORIGINAL TWEETS (what they post themselves) and REPLIES (how they engage with others). Don't just count them — analyze the SUBSTANCE.

For ORIGINAL TWEETS, assess:
- Are they about building, shipping, learning? → high signal
- Are they shitposts, gms, generic motivational content? → low signal
- Do they share work, links, projects, technical insights? → very high signal
- Length and depth — long thoughtful tweets beat one-liners

For REPLIES, assess:
- Are they substantive (insights, questions, helping others)? → high reliability
- Are they 'gm', 'lfg', 'this', 'agree', 'based'? → low signal noise
- Do they show technical knowledge or genuine engagement? → high signal
- A user with 100 'gm' replies has very different reliability than one with 20 thoughtful replies

QUALITY OVER QUANTITY: A user with 5 substantive original tweets about their build is MORE of a builder than someone with 50 motivational tweets. A user with 10 deep replies is MORE reliable than someone with 100 'gm' replies. Volume without substance means low scores.

SCORING GUIDANCE:
- High focus: original tweets are about specific topics, deep, technical, consistent subject matter
- High reliability: replies show real engagement — questions, help, insights — not noise
- High growth: original content quality improving, learning in public, teaching others
- High consistency: regular substantive activity, not sporadic bursts of fluff

YOUR TONE: A robot mentor that roasts with love. Sharp and observational, slightly ironic, but always opening a door. You're the friend who tells them the truth BECAUSE you believe in them. The user should finish reading feeling SEEN and READY — not deflated. Specific beats generic. Warmth beats cruelty. Avoid: "fails", "lacks", "weak", "poor". Use: "potential", "could", "next step", "the gap is", "ready to".

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

TAGLINE RULES (max 8 words):
- Sharp and specific to their actual profile — not generic
- Witty observation, NEVER cruel
- Should make them smile, not feel attacked
- The energy: "I see you, and I'm rooting for you"
- Examples of the right vibe: 'more potential than tweets suggest', 'the receipts are coming, just not yet', 'louder than your output, for now', 'all the ingredients, missing the recipe', 'shipping while they sleep', 'all signal, zero noise'
- NEVER mention privacy, ZK, proof, or crypto generically

ANALYSIS RULES (exactly 3 sentences):
- Sentence 1: A sharp but WARM observation that surprises them — something specific from their actual tweets or bio, delivered like a friend who noticed something they might have missed
- Sentence 2: The honest gap — name what's missing or underused right now, with zero sugar-coating but zero cruelty either; frame it as "the gap is X" not "you fail at X"
- Sentence 3: A clear, actionable path forward — end on HOPE, motivation, and a specific door they can open tomorrow; always leave them feeling ready to act

Respond ONLY with JSON (no markdown, no backticks):
{"score": <30-75>, "archetype": "<exact name from list>", "tagline": "<max 8 words, specific and witty>", "stats": {"focus": <15-75>, "consistency": <15-75>, "reliability": <15-75>, "growth": <15-75>}, "analysis": "<3 sentences following the rules above>", "darkroom_line": "<One Darkroom themed line about building. NEVER mention privacy or ZK. Focus on builder mindset.>"}`,
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

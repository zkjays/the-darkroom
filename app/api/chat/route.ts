import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";
import { getServiceSupabase } from "@/app/lib/supabase";
import { sanitizeHandle } from "@/app/lib/sanitize";
import { matchSlashCommand } from "@/app/lib/chat-commands";

const chatRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = chatRateLimit.get(key);
  if (!entry || now > entry.resetAt) {
    chatRateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

// session_id is client-supplied and trivially rotated by an attacker, so it can't be
// trusted as a rate-limit key on its own — it's still recorded for logging, but the
// actual throttle below is keyed on the caller's IP (and, when logged in, their handle
// as an extra layer) since neither of those can be freely regenerated per-request.
function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

const DARKROOM_SYSTEM_PROMPT = `You are the Darkroom Assistant — the embedded helper for The Darkroom, a builder OS at thedarkroom.xyz.

The Darkroom gives builders a Room Score based on 3 dimensions:
- Social Proof (35%): X/Twitter presence, engagement quality, community signal
- Builder Proof (35%): evidence of actual building — technical content, projects shipped, public learning
- Work Proof (30%): submitted links to real work, validated by 3 community endorsements

Score formula: (social_proof × 0.35) + (builder_proof × 0.35) + (work_proof × 0.30)

The 9 archetypes:
- Ghost Builder (≥62): ships in the dark, drops in the light
- Silent Architect (≥56): the blueprint speaks for itself
- Shadow Operator (≥50): you won't see me, but you'll see my work
- Half Built (≥44): foundation solid, still stacking floors
- Curious Lurker (≥38): reads everything, ships soon
- Almost Based (≥32): one commit away from greatness
- Main Character Loading (≥22): the arc hasn't even started
- Fresh Compile (≥14): first build, first bugs, first glory
- NPC (for now) (<14): everyone's origin story starts somewhere

Key features:
- Daily Refresh: a manual "Refresh scores" button in the profile's action row (next to "Edit profile") — click it yourself to re-analyze your latest X activity (Claude re-scores Social + Builder). Limited to once every 24h per profile; the button shows a countdown when on cooldown.
- Work Tab: submit proof links — GitHub, deployed projects, articles, prototypes
- Plugs: 3 plugs validates a proof, grows Work Proof score
- Darkroom ID: public builder profile at thedarkroom.xyz/p/[handle]
- Darkroom Card: shareable image card with score and archetype

Tone: direct, sharp, builder-focused. No fluff.

Answer ONLY what was asked. Don't recap features, scoring, or archetypes the user didn't ask about — a question about one thing gets an answer about that thing, not a tour of the product. Default to 1-3 sentences; only go longer if the question is genuinely multi-part or asks for an explanation/comparison.`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, session_id, handle: rawHandle } = body as {
    message?: unknown;
    session_id?: unknown;
    handle?: unknown;
  };

  if (!message || typeof message !== "string" || !session_id || typeof session_id !== "string") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const trimmedMessage = message.trim().slice(0, 500);
  const sessionKey = session_id.slice(0, 64);

  if (!trimmedMessage) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  // Resolve the caller's identity up front so it can double as the rate-limit key —
  // fetched once here and reused below for the exchange log, instead of re-fetching.
  const session = await getServerSession(authOptions);
  const authedHandle = session?.handle
    ? sanitizeHandle(session.handle)
    : typeof rawHandle === "string" ? sanitizeHandle(rawHandle) : null;

  const clientIp = getClientIp(req);
  if (!checkRateLimit(`ip:${clientIp}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
  }
  // Extra layer for logged-in users: caps abuse from a single account even if it
  // ever shares an IP with many other legitimate callers (NAT / shared network).
  if (session?.handle && !checkRateLimit(`handle:${authedHandle}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
  }

  // Slash commands — zero Claude tokens
  const slashMatch = matchSlashCommand(trimmedMessage);
  let response: string;
  let commandMatched: string | null = null;
  let isFeedback = false;

  if (slashMatch) {
    response = slashMatch.response;
    commandMatched = slashMatch.command;
    isFeedback = slashMatch.command === "/feedback";
  } else {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      response = "The assistant is temporarily unavailable. Try /help for available commands.";
    } else {
      const isComplex =
        trimmedMessage.length > 120 ||
        /why|how|explain|compare|difference|analyze|strategy/i.test(trimmedMessage);
      const model = isComplex ? "claude-sonnet-4-6" : "claude-haiku-4-5-20251001";

      try {
        const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            max_tokens: 220,
            system: DARKROOM_SYSTEM_PROMPT,
            messages: [{ role: "user", content: trimmedMessage }],
          }),
        });

        if (claudeRes.ok) {
          const data = await claudeRes.json();
          response = data.content?.[0]?.text ?? "Couldn't generate a response. Try /help.";
        } else {
          response = "Something went wrong. Try /help for available commands.";
        }
      } catch {
        response = "Something went wrong. Try /help for available commands.";
      }
    }
  }

  // Log exchange (non-blocking, fire and forget)
  try {
    const supabase = getServiceSupabase();
    await supabase.from("agent_feedback").insert({
      handle: authedHandle,
      session_id: sessionKey,
      message: trimmedMessage,
      response,
      command: commandMatched,
      feedback_type: isFeedback ? "manual" : null,
    });
  } catch { /* non-blocking */ }

  return NextResponse.json({ response, command: commandMatched });
}

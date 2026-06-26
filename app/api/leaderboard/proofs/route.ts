import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/lib/supabase";
import { plugTier, pluggerWeight } from "@/app/lib/plug";

// Proof-level leaderboard: ranks individual proofs by weighted plugs.
// A "plug" = a goal_endorsement (type "endorse"); weighted by the plugger's power.
// Additive, read-only — no schema change. Cached 5 min.
export const revalidate = 300;

const RISING_WINDOW_DAYS = 14;

// GET /api/leaderboard/proofs?filter=all | rising | <proof_type>
export async function GET(req: NextRequest) {
  const filter = (req.nextUrl.searchParams.get("filter") ?? "all").trim();
  const db = getServiceSupabase();

  // 1. Public, completed proofs that carry an actual proof link
  const { data: proofs, error } = await db
    .from("daily_goals")
    .select("id, handle, goal_text, proof_type, proof_value, created_at")
    .eq("status", "completed")
    .eq("is_public", true)
    .not("proof_value", "is", null)
    .order("created_at", { ascending: false })
    .limit(400);

  if (error) return NextResponse.json({ error: "Failed to fetch proofs" }, { status: 500 });
  if (!proofs || proofs.length === 0) return NextResponse.json({ proofs: [], types: [] });

  const proofIds = proofs.map((p) => p.id);

  // 2. Plugs on those proofs
  const { data: plugs } = await db
    .from("goal_endorsements")
    .select("goal_id, endorser_handle")
    .in("goal_id", proofIds)
    .eq("type", "endorse");

  // 3. Power of each plugger + identity of each builder
  const endorserHandles = (plugs ?? []).map((p) => p.endorser_handle);
  const builderHandles = proofs.map((p) => p.handle);
  const allHandles = Array.from(new Set([...endorserHandles, ...builderHandles]));

  const { data: ids } = await db
    .from("darkroom_ids")
    .select("handle, total_score, profile_image_url, is_og")
    .in("handle", allHandles.length ? allHandles : ["__none__"]);

  const power: Record<string, number> = {};
  const pfp: Record<string, string | undefined> = {};
  const og: Record<string, boolean> = {};
  (ids ?? []).forEach((r) => {
    power[r.handle] = r.total_score ?? 0;
    pfp[r.handle] = r.profile_image_url ?? undefined;
    og[r.handle] = r.is_og ?? false;
  });

  // 4. Aggregate plugs per proof (raw count + weighted current + top pluggers)
  const agg: Record<string, { count: number; weighted: number; pluggers: string[] }> = {};
  (plugs ?? []).forEach((p) => {
    const a = (agg[p.goal_id] ??= { count: 0, weighted: 0, pluggers: [] });
    a.count += 1;
    a.weighted += pluggerWeight(power[p.endorser_handle]);
    if (a.pluggers.length < 3) a.pluggers.push(p.endorser_handle);
  });

  const now = Date.now();
  let rows = proofs.map((p) => {
    const a = agg[p.id] ?? { count: 0, weighted: 0, pluggers: [] };
    const ageDays = Math.max(0.5, (now - new Date(p.created_at).getTime()) / 86_400_000);
    const tier = plugTier(a.count);
    return {
      id: p.id,
      handle: p.handle,
      goal_text: p.goal_text,
      proof_type: p.proof_type,
      proof_value: p.proof_value,
      created_at: p.created_at,
      plugs: a.count,
      weighted: Math.round(a.weighted * 10) / 10,
      velocity: Math.round((a.weighted / ageDays) * 100) / 100,
      tier: tier.key,
      tier_label: tier.label,
      top_pluggers: a.pluggers,
      builder_pfp: pfp[p.handle],
      builder_og: og[p.handle] ?? false,
    };
  });

  // distinct proof types present → drive the filter chips
  const types = Array.from(new Set(rows.map((r) => r.proof_type).filter(Boolean)));

  // 5. Filter + rank
  if (filter === "rising") {
    // reward early traction: velocity of weighted plugs over a fresh window
    const cutoff = now - RISING_WINDOW_DAYS * 86_400_000;
    rows = rows
      .filter((r) => new Date(r.created_at).getTime() >= cutoff && r.plugs > 0)
      .sort((a, b) => b.velocity - a.velocity || b.weighted - a.weighted);
  } else if (filter && filter !== "all") {
    rows = rows
      .filter((r) => r.proof_type === filter)
      .sort((a, b) => b.weighted - a.weighted || b.plugs - a.plugs);
  } else {
    rows = rows.sort((a, b) => b.weighted - a.weighted || b.plugs - a.plugs);
  }

  return NextResponse.json({ proofs: rows.slice(0, 100), types });
}

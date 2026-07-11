import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";
import { getServiceSupabase } from "@/app/lib/supabase";
import { proofPoints } from "@/app/lib/room-score";

const MIN_SAMPLE = 10; // same reliability gate as /api/score-benchmark
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// No rank-history table exists (and we're not adding one — zero migration).
// Proxy for "someone just overtook you": the current #1 in a proof_type you
// participate in has submitted a proof within the last 7 days. This reads as
// "top performer trending right now", not a literal "you got overtaken today"
// — an honest tradeoff given there's nothing to diff against.
async function getPeerOvertakeAlerts(db: ReturnType<typeof getServiceSupabase>, handle: string) {
  const { data: ids } = await db
    .from("darkroom_ids")
    .select("handle, profile_image_url")
    .eq("profile_public", true);

  const publicHandles = new Set((ids ?? []).map((r) => r.handle));
  if (!publicHandles.has(handle)) return [];

  const { data: proofs } = await db
    .from("daily_goals")
    .select("id, handle, proof_type, created_at")
    .eq("status", "completed")
    .eq("is_public", true)
    .not("proof_value", "is", null);

  if (!proofs || proofs.length === 0) return [];

  const myTypes = new Set(proofs.filter((p) => p.handle === handle).map((p) => p.proof_type));
  if (myTypes.size === 0) return [];

  // Live endorsement counts — daily_goals.endorsement_count is a denormalized cache
  // that isn't guaranteed to exist (see calcWorkProof in app/lib/room-score.ts).
  const proofIds = proofs.map((p) => p.id);
  const { data: endorsements } = await db
    .from("goal_endorsements")
    .select("goal_id")
    .in("goal_id", proofIds.length ? proofIds : ["__none__"]);

  const endorsementCounts: Record<string, number> = {};
  (endorsements ?? []).forEach((e) => {
    endorsementCounts[e.goal_id] = (endorsementCounts[e.goal_id] ?? 0) + 1;
  });

  const pfp: Record<string, string | undefined> = {};
  (ids ?? []).forEach((r) => { pfp[r.handle] = r.profile_image_url ?? undefined; });

  const now = Date.now();
  const alerts: {
    id: string; type: "peer_overtake"; proof_type: string;
    top_handle: string; top_handle_pfp?: string; top_points: number; created_at: string;
  }[] = [];

  myTypes.forEach((proofType) => {
    const byHandle: Record<string, { points: number; lastActivity: number }> = {};
    proofs
      .filter((p) => p.proof_type === proofType && publicHandles.has(p.handle))
      .forEach((p) => {
        const entry = (byHandle[p.handle] ??= { points: 0, lastActivity: 0 });
        entry.points += proofPoints(p.proof_type, endorsementCounts[p.id] ?? 0);
        entry.lastActivity = Math.max(entry.lastActivity, new Date(p.created_at).getTime());
      });

    const handles = Object.keys(byHandle);
    if (handles.length < MIN_SAMPLE) return; // not enough builders to call this a "top" — same gate as benchmark

    const top = handles.reduce((a, b) => (byHandle[a].points >= byHandle[b].points ? a : b));
    if (top === handle) return; // already the top performer here — nothing to surface
    if (now - byHandle[top].lastActivity > RECENT_WINDOW_MS) return; // not trending right now

    alerts.push({
      id: `peer_overtake:${proofType}:${top}`,
      type: "peer_overtake",
      proof_type: proofType,
      top_handle: top,
      top_handle_pfp: pfp[top],
      top_points: byHandle[top].points,
      created_at: new Date(byHandle[top].lastActivity).toISOString(),
    });
  });

  return alerts;
}

// GET /api/notifications — recent plugs received on the authenticated user's proofs
// + peer-overtake alerts (top performer trending in a category you're active in)
export async function GET() {
  const session = await getServerSession(authOptions);
  const handle = (session as { handle?: string } | null)?.handle;
  if (!handle) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getServiceSupabase();
  const peerOvertakeAlerts = await getPeerOvertakeAlerts(db, handle);

  const { data: goals } = await db
    .from("daily_goals")
    .select("id, goal_text")
    .eq("handle", handle);

  const goalIds = (goals ?? []).map((g) => g.id);
  if (goalIds.length === 0) {
    return NextResponse.json({ notifications: peerOvertakeAlerts });
  }

  const goalText: Record<string, string> = {};
  (goals ?? []).forEach((g) => { goalText[g.id] = g.goal_text; });

  const { data: plugs } = await db
    .from("goal_endorsements")
    .select("id, goal_id, endorser_handle, created_at")
    .in("goal_id", goalIds)
    .eq("type", "endorse")
    .order("created_at", { ascending: false })
    .limit(20);

  const endorserHandles = Array.from(new Set((plugs ?? []).map((p) => p.endorser_handle)));
  const { data: ids } = await db
    .from("darkroom_ids")
    .select("handle, profile_image_url")
    .in("handle", endorserHandles.length ? endorserHandles : ["__none__"]);

  const pfp: Record<string, string | undefined> = {};
  (ids ?? []).forEach((r) => { pfp[r.handle] = r.profile_image_url ?? undefined; });

  const endorsementNotifications = (plugs ?? []).map((p) => ({
    id: p.id,
    type: "endorsement" as const,
    endorser_handle: p.endorser_handle,
    endorser_pfp: pfp[p.endorser_handle],
    goal_text: goalText[p.goal_id] ?? "",
    goal_id: p.goal_id,
    created_at: p.created_at,
  }));

  const notifications = [...endorsementNotifications, ...peerOvertakeAlerts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return NextResponse.json({ notifications });
}

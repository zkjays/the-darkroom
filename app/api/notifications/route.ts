import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth-options";
import { getServiceSupabase } from "@/app/lib/supabase";

// GET /api/notifications — recent plugs received on the authenticated user's proofs
export async function GET() {
  const session = await getServerSession(authOptions);
  const handle = (session as { handle?: string } | null)?.handle;
  if (!handle) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getServiceSupabase();

  const { data: goals } = await db
    .from("daily_goals")
    .select("id, goal_text")
    .eq("handle", handle);

  const goalIds = (goals ?? []).map((g) => g.id);
  if (goalIds.length === 0) return NextResponse.json({ notifications: [] });

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

  const notifications = (plugs ?? []).map((p) => ({
    id: p.id,
    endorser_handle: p.endorser_handle,
    endorser_pfp: pfp[p.endorser_handle],
    goal_text: goalText[p.goal_id] ?? "",
    goal_id: p.goal_id,
    created_at: p.created_at,
  }));

  return NextResponse.json({ notifications });
}

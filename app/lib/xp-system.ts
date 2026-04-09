import { getServiceSupabase } from "./supabase";

/** XP cost per score point based on current total score tier */
export function getXPCost(currentTotalScore: number): number {
  if (currentTotalScore >= 95) return 20;
  if (currentTotalScore >= 75) return 15;
  return 10;
}

export interface XPResult {
  xp_added: number;
  points_gained: number;
  new_stat_xp: number;
  xp_cost: number;
  new_total_xp: number;
}

/**
 * Add XP to a specific stat, converting to score points when threshold is reached.
 * Reads stat_xp + total_xp from darkroom_ids, updates in place.
 *
 * SQL required before using:
 *   ALTER TABLE darkroom_ids ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
 *   ALTER TABLE darkroom_ids ADD COLUMN IF NOT EXISTS stat_xp JSONB DEFAULT '{"focus":0,"consistency":0,"reliability":0,"growth":0}';
 */
export async function convertXPToPoints(
  db: ReturnType<typeof getServiceSupabase>,
  handle: string,
  statKey: string,
  xpToAdd: number
): Promise<XPResult> {
  const { data: row } = await db
    .from("darkroom_ids")
    .select("score, bonus_points, stats, stat_xp, total_xp")
    .eq("handle", handle)
    .single();

  if (!row) return { xp_added: xpToAdd, points_gained: 0, new_stat_xp: xpToAdd, xp_cost: 10, new_total_xp: xpToAdd };

  const baseScore = row.score ?? 0;
  const bonusPoints = row.bonus_points ?? 0;
  const totalScore = baseScore + bonusPoints;
  const xpCost = getXPCost(totalScore);

  const statXp = (row.stat_xp ?? {}) as Record<string, number>;
  const currentStatXp = (statXp[statKey] ?? 0) + xpToAdd;
  const pointsGained = Math.floor(currentStatXp / xpCost);
  const remainingXp = currentStatXp % xpCost;

  const newTotalXp = (row.total_xp ?? 0) + xpToAdd;
  const newStatXp = { ...statXp, [statKey]: remainingXp };

  const updates: Record<string, unknown> = {
    stat_xp: newStatXp,
    total_xp: newTotalXp,
  };

  if (pointsGained > 0) {
    const stats = (row.stats ?? {}) as Record<string, number>;
    const newStatValue = Math.min(100, (stats[statKey] ?? 0) + pointsGained);
    updates.stats = { ...stats, [statKey]: newStatValue };
    updates.bonus_points = bonusPoints + pointsGained;
  }

  await db.from("darkroom_ids").update(updates).eq("handle", handle);

  return {
    xp_added: xpToAdd,
    points_gained: pointsGained,
    new_stat_xp: remainingXp,
    xp_cost: xpCost,
    new_total_xp: newTotalXp,
  };
}

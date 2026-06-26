// Plug system — tiers + plugger-power weighting (shared client/server, pure, no deps).
// Spec: 05-projects/darkroom-plug-system.md (decisions locked 2026-06-22).
// Glyph = a single light point whose brightness encodes the tier.

export type PlugTierKey = "cold" | "plugged_in" | "wired" | "mainline";

export interface PlugTier {
  key: PlugTierKey;
  label: string;
  color: string; // glyph color — teal until Mainline, then gold
  glow: number; // 0..1 brightness of the point
  halo: boolean; // top-end elite halo (so a 5-plug and a 50-plug proof don't look the same)
}

const GOLD = "#c9a84c";
const TEAL = "#00d4aa";
const TOP_END = 15; // 2nd threshold for the elite halo

// Brightness rises with each plug (1→4), flips to gold at 5 (Mainline).
export function plugTier(plugs: number): PlugTier {
  if (plugs >= 5)
    return { key: "mainline", label: "Mainline", color: GOLD, glow: 1, halo: plugs >= TOP_END };
  if (plugs >= 2)
    return { key: "wired", label: "Wired", color: TEAL, glow: Math.min(0.95, 0.55 + (plugs - 2) * 0.15), halo: false };
  if (plugs >= 1)
    return { key: "plugged_in", label: "Plugged in", color: TEAL, glow: 0.45, halo: false };
  return { key: "cold", label: "Cold", color: "rgba(255,255,255,0.22)", glow: 0, halo: false };
}

// A plug from a respected builder carries more current than one from a cold account.
// Weight scales with the plugger's total_score (0..100) → 1.0 .. 2.0.
export function pluggerWeight(pluggerTotalScore: number | null | undefined): number {
  const s = Math.max(0, Math.min(100, pluggerTotalScore ?? 0));
  return 1 + s / 100;
}

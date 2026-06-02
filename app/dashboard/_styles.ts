// ── Card style system & theme utilities ───────────────────────────────────
import type { DashboardData } from "./_types";

export interface CardStyles {
  primaryCard:  string;
  scoreCard:    string;
  nestedCard:   string;
  tabActive:    string;
  primaryBtn:   string;
  secondaryBtn: string;
}

const CARD_STYLE_MAP: Record<string, CardStyles> = {
  cyan: {
    primaryCard:  "bg-gradient-to-br from-cyan-950/20 to-[#0c0c14] border border-cyan-500/10 shadow-[0_0_15px_rgba(0,200,255,0.04)] hover:shadow-[0_0_25px_rgba(0,200,255,0.08)] hover:border-cyan-500/15 transition-all",
    scoreCard:    "bg-gradient-to-b from-cyan-950/30 to-[#0c0c14] border border-cyan-500/10 shadow-[0_0_15px_rgba(0,200,255,0.04)]",
    nestedCard:   "bg-[#12121e] border border-white/[0.06] shadow-[0_0_15px_rgba(0,200,255,0.03)]",
    tabActive:    "border-cyan-400 shadow-[0_2px_10px_rgba(0,200,255,0.2)]",
    primaryBtn:   "border border-cyan-500/20 shadow-[0_0_20px_rgba(0,200,255,0.15)] hover:shadow-[0_0_30px_rgba(0,200,255,0.25)]",
    secondaryBtn: "border border-cyan-500/20 shadow-[0_0_12px_rgba(0,200,255,0.08)] hover:shadow-[0_0_20px_rgba(0,200,255,0.15)] hover:border-cyan-500/30 hover:bg-cyan-500/5",
  },
  violet: {
    primaryCard:  "bg-gradient-to-br from-violet-950/20 to-[#0c0c14] border border-violet-500/10 shadow-[0_0_15px_rgba(140,80,255,0.04)] hover:shadow-[0_0_25px_rgba(140,80,255,0.08)] hover:border-violet-500/15 transition-all",
    scoreCard:    "bg-gradient-to-b from-violet-950/30 to-[#0c0c14] border border-violet-500/10 shadow-[0_0_15px_rgba(140,80,255,0.04)]",
    nestedCard:   "bg-[#12121e] border border-white/[0.06] shadow-[0_0_15px_rgba(140,80,255,0.03)]",
    tabActive:    "border-violet-400 shadow-[0_2px_10px_rgba(140,80,255,0.2)]",
    primaryBtn:   "border border-violet-500/20 shadow-[0_0_20px_rgba(140,80,255,0.15)] hover:shadow-[0_0_30px_rgba(140,80,255,0.25)]",
    secondaryBtn: "border border-violet-500/20 shadow-[0_0_12px_rgba(140,80,255,0.08)] hover:shadow-[0_0_20px_rgba(140,80,255,0.15)] hover:border-violet-500/30 hover:bg-violet-500/5",
  },
  emerald: {
    primaryCard:  "bg-gradient-to-br from-emerald-950/20 to-[#0c0c14] border border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.04)] hover:shadow-[0_0_25px_rgba(16,185,129,0.08)] hover:border-emerald-500/15 transition-all",
    scoreCard:    "bg-gradient-to-b from-emerald-950/30 to-[#0c0c14] border border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.04)]",
    nestedCard:   "bg-[#12121e] border border-white/[0.06] shadow-[0_0_15px_rgba(16,185,129,0.03)]",
    tabActive:    "border-emerald-400 shadow-[0_2px_10px_rgba(16,185,129,0.2)]",
    primaryBtn:   "border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.25)]",
    secondaryBtn: "border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.08)] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:border-emerald-500/30 hover:bg-emerald-500/5",
  },
  amber: {
    primaryCard:  "bg-gradient-to-br from-amber-950/20 to-[#0c0c14] border border-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.04)] hover:shadow-[0_0_25px_rgba(245,158,11,0.08)] hover:border-amber-500/15 transition-all",
    scoreCard:    "bg-gradient-to-b from-amber-950/30 to-[#0c0c14] border border-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.04)]",
    nestedCard:   "bg-[#12121e] border border-white/[0.06] shadow-[0_0_15px_rgba(245,158,11,0.03)]",
    tabActive:    "border-amber-400 shadow-[0_2px_10px_rgba(245,158,11,0.2)]",
    primaryBtn:   "border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_30px_rgba(245,158,11,0.25)]",
    secondaryBtn: "border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.08)] hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:border-amber-500/30 hover:bg-amber-500/5",
  },
};

export function getCardStyle(accent: string): CardStyles {
  return CARD_STYLE_MAP[accent] ?? CARD_STYLE_MAP.cyan;
}

export function getButtonStyle(accent: string, variant: "primary" | "secondary"): string {
  const cs = getCardStyle(accent);
  return variant === "primary" ? cs.primaryBtn : cs.secondaryBtn;
}

export const ACCENT_HEX: Record<string, string> = {
  cyan:    "#67e8f9",
  violet:  "#c4b5fd",
  emerald: "#6ee7b7",
  amber:   "#fcd34d",
};

export const TABS = [
  { id: "id",       label: "ID" },
  { id: "work",     label: "Work" },
  { id: "settings", label: "Settings" },
] as const;

export type TabId = typeof TABS[number]["id"];

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export function formatDate(data: DashboardData): string {
  const raw = data.claimed_at || data.created_at || data.updated_at;
  if (!raw) return "Unknown";
  try {
    return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "Unknown"; }
}

export function daysUntilReclaim(updatedAt: string): number {
  const daysSince = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.ceil(30 - daysSince);
}

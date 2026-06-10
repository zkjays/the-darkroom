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

const GOLD_STYLES: CardStyles = {
  primaryCard:  "bg-[#0c0c14] border border-white/[0.07] hover:border-white/[0.13] transition-colors",
  scoreCard:    "bg-[#0c0c14] border border-white/[0.07]",
  nestedCard:   "bg-[#08080e] border border-white/[0.05]",
  tabActive:    "border-[#c9a84c]/50",
  primaryBtn:   "border border-[#c9a84c]/30 hover:border-[#c9a84c]/60 hover:bg-[#c9a84c]/[0.05]",
  secondaryBtn: "border border-white/10 hover:border-white/20 hover:bg-white/[0.03]",
};

export function getCardStyle(_accent: string): CardStyles {
  return GOLD_STYLES;
}

export function getButtonStyle(accent: string, variant: "primary" | "secondary"): string {
  const cs = getCardStyle(accent);
  return variant === "primary" ? cs.primaryBtn : cs.secondaryBtn;
}

export const ACCENT_HEX: Record<string, string> = {
  cyan:    "#c9a84c",
  violet:  "#c9a84c",
  emerald: "#c9a84c",
  amber:   "#c9a84c",
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
  const raw = data.updated_at || data.claimed_at || data.created_at;
  if (!raw) return "Unknown";
  try {
    return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "Unknown"; }
}

export function daysUntilReclaim(updatedAt: string): number {
  const daysSince = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.ceil(30 - daysSince);
}

export type AccentKey = "cyan" | "violet" | "emerald" | "amber";

export interface AccentConfig {
  primary: string;
  hover: string;
  bg: string;
  border: string;
  hex: string;
}

export const ACCENT_COLORS: Record<AccentKey, AccentConfig> = {
  cyan:    { primary: "text-cyan-300",    hover: "hover:text-cyan-200",    bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    hex: "#67e8f9" },
  violet:  { primary: "text-violet-300",  hover: "hover:text-violet-200",  bg: "bg-violet-500/10",  border: "border-violet-500/20",  hex: "#c4b5fd" },
  emerald: { primary: "text-emerald-300", hover: "hover:text-emerald-200", bg: "bg-emerald-500/10", border: "border-emerald-500/20", hex: "#6ee7b7" },
  amber:   { primary: "text-amber-300",   hover: "hover:text-amber-200",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   hex: "#fcd34d" },
};

const GOLD_CONFIG: AccentConfig = {
  primary: "text-[#c9a84c]",
  hover:   "hover:text-[#c9a84c]/80",
  bg:      "bg-[#c9a84c]/10",
  border:  "border-[#c9a84c]/20",
  hex:     "#c9a84c",
};

export function getAccent(_accent?: string | null): AccentConfig {
  return GOLD_CONFIG;
}

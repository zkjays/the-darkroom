// ── Shared types & constants for the dashboard ────────────────────────────

export const SITE_URL = "https://thedarkroom.xyz";

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_active: string;
  total_visits: number;
}

export interface DashboardData {
  handle: string;
  score: number;
  bonus_points?: number;
  total_score?: number;
  total_xp?: number;
  social_proof?: number;
  builder_proof?: number;
  work_proof?: number;
  analyzed_posts?: { social?: string[]; builder?: string[] };
  last_refresh_at?: string;
  archetype: string;
  tagline: string;
  analysis: string;
  darkroom_line: string;
  profile_image_url?: string;
  claim_count: number;
  claimed_at?: string;
  created_at: string;
  updated_at: string;
  streak: StreakData | null;
  profile_public?: boolean;
  goals_public?: boolean;
  theme_accent?: string;
  open_to_opportunities?: boolean;
  is_og?: boolean;
  bio?: string;
  link_x?: string;
  link_github?: string;
  link_site?: string;
}

export interface WorkProof {
  id: string;
  goal_text: string;
  proof_type: string;
  proof_value?: string;
  description?: string;
  image_url?: string;
  is_public: boolean;
  created_at: string;
  completed_at?: string;
  endorsement_count?: number;
  edited?: boolean;
  original_proof_value?: string;
  original_goal_text?: string;
  original_description?: string;
  original_image_url?: string;
}

export type XpResult = {
  xp_added: number;
  points_gained: number;
  xp_cost: number;
  new_stat_xp: number;
};

export const STATS = [
  { key: "focus",       label: "FOCUS",       color: "#60A5FA", fallback: "dedication" },
  { key: "consistency", label: "CONSISTENCY", color: "#C084FC", fallback: "consistency" },
  { key: "reliability", label: "RELIABILITY", color: "#34D399", fallback: "stealth" },
  { key: "growth",      label: "GROWTH",      color: "#FBBF24", fallback: "momentum" },
] as const;

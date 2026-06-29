// ── Shared work-proof constants (types, points, icons) ────────────────────
// Single source of truth used by WorkTab, SubmitWorkModal, ProofGrid, ProfileView.

export type ProofCategory = "builder" | "social";

export const BUILDER_PROOF_TYPES = ["Ship", "Code", "Release", "Design", "Client"] as const;
export const SOCIAL_PROOF_TYPES = ["Post", "Article", "Publish"] as const;

export const WORK_PROOF_TYPES = [
  ...BUILDER_PROOF_TYPES, ...SOCIAL_PROOF_TYPES,
] as const;

export const PROOF_CATEGORY_MAP: Record<string, ProofCategory> = {
  Ship: "builder", Code: "builder", Release: "builder", Design: "builder", Client: "builder",
  Post: "social", Article: "social", Publish: "social",
  // legacy
  Project: "builder", OSS: "builder", Other: "builder",
  Video: "social", Thread: "social",
};

export const WORK_PROOF_POINTS: Record<string, number> = {
  Ship: 8, Code: 8, Release: 5, Design: 5, Client: 8,
  Post: 3, Article: 5, Publish: 5,
  // legacy — keep for existing score recompute
  Project: 8, OSS: 8, Video: 5, Thread: 3, Other: 3,
};

export const WORK_TYPE_ICONS: Record<string, string> = {
  Ship: "⬡", Code: "⌥", Release: "▶", Design: "◻", Client: "◆",
  Post: "◉", Article: "◈", Publish: "◈",
  // legacy
  Project: "⬡", Video: "▶", Thread: "◉", OSS: "⌥", Other: "·",
};

// ── Shared work-proof constants (types, points, icons) ────────────────────
// Single source of truth used by WorkTab, SubmitWorkModal, ProofGrid, ProfileView.

export const WORK_PROOF_TYPES = ["Ship", "Code", "Publish", "Release", "Design"] as const;

export const WORK_PROOF_POINTS: Record<string, number> = {
  Ship: 8, Code: 8, Publish: 5, Release: 5, Design: 5,
  // legacy — keep for existing score recompute
  Project: 8, OSS: 8, Article: 5, Video: 5, Thread: 3, Other: 3,
};

export const WORK_TYPE_ICONS: Record<string, string> = {
  Ship: "⬡", Code: "⌥", Publish: "◈", Release: "▶", Design: "◻",
  // legacy
  Project: "⬡", Article: "◈", Video: "▶", Thread: "◉", OSS: "⌥", Other: "·",
};

import type { WorkProof } from "@/app/dashboard/_types";
import { WORK_PROOF_POINTS, PROOF_CATEGORY_MAP } from "@/app/dashboard/_work-constants";

// Shared, pure scoring-breakdown math — used by the full Score X-Ray page
// (app/p/[handle]/score). Single source of truth so the page and any other
// consumer never drift on how points/levers/weak-points are computed.

export type ByTypeEntry = {
  proofType: string;
  count: number;
  validated: number;
  pending: number;
  pts: number;
  upside: number;
};

export type WeakPoint = { text: string; why: string };

export function calcProofPts(p: Pick<WorkProof, "proof_type" | "endorsement_count">): number {
  const pts = WORK_PROOF_POINTS[p.proof_type] ?? 3;
  const count = p.endorsement_count ?? 0;
  const mult = count >= 3 ? 1.5 : count >= 1 ? 1.0 : 0.5;
  return Math.round(pts * mult);
}

export function byProofType(proofs: WorkProof[]): ByTypeEntry[] {
  const groups: Record<string, WorkProof[]> = {};
  proofs.forEach((p) => { (groups[p.proof_type] ??= []).push(p); });
  return Object.entries(groups)
    .map(([proofType, list]) => {
      const pendingList = list.filter((p) => (p.endorsement_count ?? 0) < 3);
      const basePts = WORK_PROOF_POINTS[proofType] ?? 3;
      const upside = pendingList.reduce((s, p) => s + (Math.round(basePts * 1.5) - calcProofPts(p)), 0);
      return {
        proofType,
        count: list.length,
        validated: list.length - pendingList.length,
        pending: pendingList.length,
        pts: list.reduce((s, p) => s + calcProofPts(p), 0),
        upside,
      };
    })
    .sort((a, b) => b.pts - a.pts);
}

export function topLeverOf(entries: ByTypeEntry[]): ByTypeEntry | undefined {
  return [...entries].filter((t) => t.upside > 0).sort((a, b) => b.upside - a.upside)[0];
}

// Real-life-framed observations, each with an explicit "why we're flagging this" —
// answers "why this advice / what's my real weakness" instead of one generic sentence.
// Grounded only in data that exists (proof history, AI-scored dimensions, opportunities
// toggle) — no fabricated signal (e.g. real post-reach data isn't available, so it's
// never claimed here).
export function computeWeakPoints(params: {
  proofs: WorkProof[];
  social: number;
  builder: number;
  work: number;
  openToOpportunities: boolean;
  topLever?: ByTypeEntry;
}): WeakPoint[] {
  const { proofs: all, social, builder, work, openToOpportunities, topLever } = params;
  const DAY_MS = 86_400_000;
  const points: WeakPoint[] = [];

  if (all.length > 0) {
    const lastTs = Math.max(...all.map((p) => new Date(p.created_at).getTime()));
    const daysSinceLast = Math.floor((Date.now() - lastTs) / DAY_MS);
    if (daysSinceLast >= 14) {
      points.push({
        text: `${daysSinceLast} days since your last proof.`,
        why: "Consistent public work compounds — long gaps mean the next thing you show has to re-establish context instead of building on the last one. We flag it once it's been two weeks quiet.",
      });
    }
  }

  const dims = [
    { label: "Social", value: social },
    { label: "Builder", value: builder },
    { label: "Work", value: work },
  ].sort((a, b) => a.value - b.value);
  const gap = dims[2].value - dims[0].value;
  if (gap >= 20) {
    const why = dims[0].label === "Work"
      ? "the room can see you're active and visible, but there's little submitted, verifiable work behind it yet."
      : dims[0].label === "Social"
        ? "real work is happening, but it isn't reaching anyone — nobody sees it if it isn't talked about."
        : "there's a presence, but not much proven behind it yet — visibility without much evidence.";
    points.push({
      text: `${dims[0].label} Proof (${dims[0].value}) is ${gap} points behind ${dims[2].label} (${dims[2].value}).`,
      why: `We flag a gap once it's 20+ points — large enough to be a real imbalance, not noise from one slow week. In your case: ${why}`,
    });
  }

  if (all.length >= 2) {
    const hasBuilder = all.some((p) => PROOF_CATEGORY_MAP[p.proof_type] === "builder");
    const hasSocial = all.some((p) => PROOF_CATEGORY_MAP[p.proof_type] === "social");
    if (hasBuilder && !hasSocial) {
      points.push({
        text: "Every proof you've shown is build-side — nothing documenting or explaining the work itself.",
        why: "Darkroom tracks two kinds of proof: what you built, and what you said about it. Showing only one means half of what makes your work legible to someone who isn't already a builder is invisible here.",
      });
    } else if (hasSocial && !hasBuilder) {
      points.push({
        text: "Every proof you've shown is content-side — nothing shipped or built yet to back the story up.",
        why: "The same gap in the other direction: the story is visible, but there's nothing concrete yet for someone to point to and say \"that's real.\"",
      });
    }
  }

  const validatedCount = all.filter((p) => (p.endorsement_count ?? 0) >= 3).length;
  if (validatedCount >= 1 && !openToOpportunities) {
    points.push({
      text: `${validatedCount} validated proof${validatedCount > 1 ? "s" : ""} exist, but "Open to opportunities" is off.`,
      why: "A validated proof means 3+ people in the room already vouched for it — exactly the kind of signal someone hiring or looking to collaborate would want. It only reaches them if your profile says you're open to being found.",
    });
  }

  if (topLever) {
    points.push({
      text: `${topLever.pending} pending ${topLever.proofType} proof${topLever.pending > 1 ? "s" : ""} just ${topLever.pending > 1 ? "need" : "needs"} endorsements to fully count.`,
      why: `A proof counts at half weight until 3 people endorse it, full weight after — by design, so the score reflects confirmed work, not just claims. Getting endorsed on these adds +${topLever.upside} pts once they clear.`,
    });
  }

  return points.slice(0, 3);
}

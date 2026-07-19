"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Navbar from "../../../component/landing/Navbar";
import { sanitizeHandle } from "@/app/lib/sanitize";
import type { DashboardData, WorkProof } from "../../../dashboard/_types";
import { PROOF_CATEGORY_MAP, WORK_TYPE_ICONS } from "../../../dashboard/_work-constants";
import { byProofType, topLeverOf, computeWeakPoints, type ByTypeEntry } from "@/app/lib/score-breakdown";

type RankResult = { available: boolean; n: number; rank?: number; top_percent?: number; points?: number };
type ScoreBenchmark = {
  handle: string;
  aggregate: { social_proof: RankResult; builder_proof: RankResult; work_proof: RankResult };
  proof_types: Record<string, RankResult>;
};

type PostRef = string | { id: string; text: string; url: string };

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-[family-name:var(--font-mono)] text-xs tracking-[0.2em] uppercase text-white/50">{title}</h2>
        {subtitle && <p className="text-xs text-white/30 mt-1 leading-relaxed max-w-xl">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

// One dimension row (Social / Builder / Work) with an expandable "why this number"
// panel — the analyzed tweets for AI-scored dimensions, or the deterministic math for Work.
function DimensionCard({
  label, value, weight, sourceNote, posts,
}: {
  label: string; value: number; weight: string; sourceNote: string; posts?: PostRef[];
}) {
  const [open, setOpen] = useState(false);
  const hasDetail = (posts && posts.length > 0) || !posts;
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => hasDetail && setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="text-sm font-medium text-white">{label} Proof</p>
          <p className="text-[11px] text-white/30 mt-0.5">weight {weight} of total</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-white">{value}</span>
          <span className="text-white/25 text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div className="px-5 pb-4 pt-1 border-t border-white/[0.05]">
          <p className="text-xs text-white/50 leading-relaxed mb-3">{sourceNote}</p>
          {posts && posts.length > 0 && (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {posts.map((p, i) => {
                const text = typeof p === "string" ? p : p.text;
                const url = typeof p === "string" ? undefined : p.url;
                return url ? (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="block text-xs text-white/45 hover:text-[#c9a84c] leading-relaxed p-2 rounded-lg border border-white/[0.06] hover:border-[#c9a84c]/30 bg-white/[0.02] transition-colors">
                    {text}
                  </a>
                ) : (
                  <p key={i} className="text-xs text-white/45 leading-relaxed p-2 rounded-lg border border-white/[0.06] bg-white/[0.02]">{text}</p>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// A weak point: the observation up front, the reasoning one click away.
function WeakPointCard({ text, why }: { text: string; why: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border px-5 py-4" style={{ borderColor: "rgba(201,168,76,0.25)", backgroundColor: "rgba(201,168,76,0.05)" }}>
      <p className="text-sm text-white/90 leading-relaxed">{text}</p>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-2 font-[family-name:var(--font-mono)] text-[10px] tracking-widest uppercase transition-colors"
        style={{ color: "rgba(201,168,76,0.7)" }}
      >
        {open ? "Hide reasoning ▲" : "Why is this flagged? ▼"}
      </button>
      {open && <p className="text-xs text-white/50 leading-relaxed mt-2 pt-2 border-t border-white/[0.06]">{why}</p>}
    </div>
  );
}

function TypeRow({ t, benchmarkEntry }: { t: ByTypeEntry; benchmarkEntry?: RankResult }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-white/[0.02]">
      <div>
        <span className="text-sm text-white/80">{WORK_TYPE_ICONS[t.proofType] ?? ""} {t.proofType}</span>
        <p className="text-[11px] text-white/30 mt-0.5">{t.validated} validated · {t.pending} pending</p>
      </div>
      <div className="text-right">
        <span className="text-sm font-medium text-white/80">{t.pts} pts</span>
        {t.upside > 0 && <span className="text-[11px] text-white/30 block">+{t.upside} pending</span>}
        {benchmarkEntry?.available && <span className="text-[11px] block" style={{ color: "rgba(201,168,76,0.7)" }}>top {benchmarkEntry.top_percent}%</span>}
      </div>
    </div>
  );
}

export default function ScoreBreakdownPage() {
  const params = useParams();
  const handle = sanitizeHandle((params?.handle as string) ?? "");
  const { data: session } = useSession();
  const currentHandle = session?.handle ? sanitizeHandle(session.handle) : undefined;
  const owner = !!currentHandle && currentHandle === handle;

  const [data, setData] = useState<DashboardData | null>(null);
  const [proofs, setProofs] = useState<WorkProof[]>([]);
  const [benchmark, setBenchmark] = useState<ScoreBenchmark | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (!handle) return;
    fetch(`/api/dashboard?handle=${encodeURIComponent(handle)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setNotFound(true); return; }
        if (!d.profile_public && currentHandle !== handle) { setIsPrivate(true); return; }
        setData(d);
        const goalsQuery = owner
          ? `handle=${encodeURIComponent(handle)}&all=true&completed=true`
          : `handle=${encodeURIComponent(handle)}&all=true&completed=true&public_only=true`;
        return fetch(`/api/goals?${goalsQuery}`)
          .then((r) => r.json())
          .then((g) => setProofs(g.goals ?? []));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    fetch(`/api/score-benchmark?handle=${encodeURIComponent(handle)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setBenchmark(json))
      .catch(() => {});
    // currentHandle intentionally omitted: owner-gated fetch choice is re-derived once
    // session resolves via the effect re-running on `handle`/`owner` change is unnecessary
    // here since this only needs to run once handle is known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  if (loading) return <LoadingState />;

  if (notFound || isPrivate || !data) {
    return (
      <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
        <Navbar />
        <main className="flex min-h-[70vh] items-center justify-center px-6">
          <p className="font-[family-name:var(--font-mono)] text-slate-500 text-sm">
            {isPrivate ? "This profile is private." : "This builder hasn't claimed their ID yet."}
          </p>
        </main>
      </div>
    );
  }

  const social = data.social_proof ?? 0;
  const builder = data.builder_proof ?? 0;
  const work = data.work_proof ?? 0;
  const total = data.total_score ?? (data.score + (data.bonus_points ?? 0));

  const builderProofs = proofs.filter((p) => PROOF_CATEGORY_MAP[p.proof_type] === "builder");
  const socialWorkProofs = proofs.filter((p) => PROOF_CATEGORY_MAP[p.proof_type] === "social");
  const builderTypes = byProofType(builderProofs);
  const socialTypes = byProofType(socialWorkProofs);
  const topLever = topLeverOf([...builderTypes, ...socialTypes]);

  const weakPoints = !owner ? [] : computeWeakPoints({
    proofs, social, builder, work,
    openToOpportunities: !!data.open_to_opportunities,
    topLever,
  });

  const analyzedPosts = data.analyzed_posts ?? {};

  return (
    <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-10 pt-24 space-y-10">
        <Link href={`/p/${handle}`} className="font-[family-name:var(--font-mono)] text-xs text-white/40 hover:text-white transition-colors">
          ← Back to profile
        </Link>

        <header className="text-center space-y-2">
          <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.25em] uppercase text-white/30">Score X-Ray · @{handle}</p>
          <div className="text-5xl font-bold" style={{ color: "#c9a84c" }}>{total}</div>
          <p className="text-sm text-white/40 max-w-md mx-auto leading-relaxed">
            Room Score out of 100 blends how visible you are on X (Social), and how much real,
            room-endorsed work you have proof of (Builder + Work) — not follower count.
          </p>
        </header>

        <Section title="How it breaks down">
          <div className="space-y-3">
            <DimensionCard
              label="Social" value={social} weight="35%"
              sourceNote="Read by AI from your recent X activity: posting consistency, engagement quality, personal brand clarity. Tap a tweet below to see the exact ones used."
              posts={analyzedPosts.social ?? []}
            />
            <DimensionCard
              label="Builder" value={builder} weight="35%"
              sourceNote="Also AI-read from your recent X activity, but for a different signal: technical content, projects mentioned, build-in-public posts."
              posts={analyzedPosts.builder ?? []}
            />
            <DimensionCard
              label="Work" value={work} weight="30%"
              sourceNote="The only fully deterministic dimension — zero AI involved. Computed directly from proofs you submitted and the room endorsed. See the exact breakdown below."
            />
          </div>
        </Section>

        {owner && weakPoints.length > 0 && (
          <Section
            title="Your weak points"
            subtitle="Specific to your own history — each one only appears because of something in your actual data, not generic advice."
          >
            <div className="space-y-3">
              {weakPoints.map((wp, i) => <WeakPointCard key={i} {...wp} />)}
            </div>
          </Section>
        )}

        <Section
          title="How you compare"
          subtitle="Ranked against every other public Darkroom profile. Hidden below 10 builders in a category — not enough sample to mean anything yet."
        >
          {benchmark ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.05]">
              {([
                ["social_proof", "Social"],
                ["builder_proof", "Builder"],
                ["work_proof", "Work"],
              ] as const).map(([dim, label]) => {
                const r = benchmark.aggregate[dim];
                return (
                  <div key={dim} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm text-white/60">{label}</span>
                    <span className="text-sm text-white/80">
                      {r.available ? `Top ${r.top_percent}% of ${r.n} builders` : "Not enough builders to compare yet"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-white/25">Loading…</p>
          )}
        </Section>

        {proofs.length > 0 && (
          <Section
            title="Work proof detail"
            subtitle={'"Validated" = 3+ endorsements from the room (full weight). "Pending" = under 3 (partial weight until confirmed).'}
          >
            <div className="space-y-4">
              {builderTypes.length > 0 && (
                <div>
                  <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest text-white/30 mb-2">BUILDER</p>
                  <div className="space-y-1.5">
                    {builderTypes.map((t) => <TypeRow key={t.proofType} t={t} benchmarkEntry={benchmark?.proof_types[t.proofType]} />)}
                  </div>
                </div>
              )}
              {socialTypes.length > 0 && (
                <div>
                  <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest text-white/30 mb-2">SOCIAL</p>
                  <div className="space-y-1.5">
                    {socialTypes.map((t) => <TypeRow key={t.proofType} t={t} benchmarkEntry={benchmark?.proof_types[t.proofType]} />)}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}
      </main>
    </div>
  );
}

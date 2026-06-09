"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Navbar from "../component/landing/Navbar";

// ── Types ──────────────────────────────────────────────────────────────────
interface Opportunity {
  id: string;
  title: string;
  project: string | null;
  category: string;
  description: string | null;
  reward: string | null;
  deadline: string | null;
  link: string;
  source: string;
  tags: string[];
  created_at: string;
}

// ── Category config ────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "all",       label: "All",        icon: "◈" },
  { key: "job",       label: "Jobs",       icon: "💼" },
  { key: "bounty",    label: "Bounties",   icon: "💰" },
  { key: "hackathon", label: "Hackathons", icon: "🏆" },
  { key: "grant",     label: "Grants",     icon: "🔬" },
  { key: "gig",       label: "Gigs",       icon: "🎨" },
] as const;

type CategoryKey = typeof CATEGORIES[number]["key"];

const CATEGORY_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  job:       { color: "#60A5FA", bg: "rgba(96,165,250,0.1)",  border: "rgba(96,165,250,0.25)" },
  bounty:    { color: "#FBBF24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)" },
  hackathon: { color: "#C084FC", bg: "rgba(192,132,252,0.1)", border: "rgba(192,132,252,0.25)" },
  grant:     { color: "#67E8F9", bg: "rgba(103,232,249,0.1)", border: "rgba(103,232,249,0.25)" },
  gig:       { color: "#34D399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.25)" },
};

function getCategoryConfig(cat: string) {
  return CATEGORY_COLORS[cat] ?? { color: "#94A3B8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)" };
}

function formatDeadline(deadline: string | null) {
  if (!deadline) return null;
  try {
    const d = new Date(deadline);
    const now = new Date();
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "Expired";
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff <= 7) return `${diff}d left`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return null; }
}

function formatSource(source: string) {
  const map: Record<string, string> = {
    superteam: "Superteam Earn",
    gitcoin: "Gitcoin",
    ethglobal: "ETHGlobal",
    immunefi: "Immunefi",
    "web3.career": "web3.career",
    cryptojobslist: "CryptoJobsList",
    dorahacks: "DoraHacks",
    manual: "THE DARKROOM",
  };
  return map[source] ?? source;
}

// ── Opportunity Card ───────────────────────────────────────────────────────
function OpportunityCard({ opp, handle }: { opp: Opportunity; handle?: string }) {
  const cat = getCategoryConfig(opp.category);
  const catLabel = CATEGORIES.find((c) => c.key === opp.category);
  const deadline = formatDeadline(opp.deadline);
  const isExpired = deadline === "Expired";
  const profileUrl = handle ? `https://thedarkroom.xyz/p/${handle}` : null;

  return (
    <div
      className={`bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 flex flex-col gap-4 transition-all hover:border-white/[0.12] hover:bg-white/[0.03] ${
        isExpired ? "opacity-50" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category badge */}
            <span
              className="font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ color: cat.color, backgroundColor: cat.bg, border: `1px solid ${cat.border}` }}
            >
              {catLabel?.icon} {catLabel?.label ?? opp.category}
            </span>
            {/* Reward */}
            {opp.reward && (
              <span className="font-[family-name:var(--font-mono)] text-[10px] text-amber-400/80 bg-amber-400/[0.08] border border-amber-400/20 px-2 py-0.5 rounded-full flex-shrink-0">
                {opp.reward}
              </span>
            )}
            {/* Deadline */}
            {deadline && (
              <span
                className={`font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
                  isExpired
                    ? "text-red-400/60 bg-red-400/[0.06] border border-red-400/15"
                    : deadline === "Today" || deadline === "Tomorrow"
                    ? "text-orange-400/80 bg-orange-400/[0.08] border border-orange-400/20"
                    : "text-slate-400 bg-white/[0.04] border border-white/[0.08]"
                }`}
              >
                ⏱ {deadline}
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-white leading-snug">{opp.title}</h3>
          {opp.project && (
            <p className="font-[family-name:var(--font-mono)] text-[11px] text-slate-400">
              {opp.project}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {opp.description && (
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{opp.description}</p>
      )}

      {/* Tags */}
      {opp.tags && opp.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {opp.tags.map((tag) => (
            <span
              key={tag}
              className="font-[family-name:var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-500 border border-white/[0.06]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/[0.04]">
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-slate-600">
          via {formatSource(opp.source)}
        </span>
        <div className="flex items-center gap-2">
          {/* Apply with Darkroom ID */}
          {handle && profileUrl && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(profileUrl).catch(() => {});
                window.open(opp.link, "_blank", "noopener");
              }}
              className="font-[family-name:var(--font-mono)] text-[10px] px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.1] transition-all flex-shrink-0"
              title="Copies your Darkroom profile link then opens the opportunity"
            >
              Apply with ID →
            </button>
          )}
          <a
            href={opp.link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-[family-name:var(--font-mono)] text-[10px] px-2.5 py-1.5 rounded-lg border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.15] transition-all flex-shrink-0"
          >
            View →
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ category }: { category: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3">
      <p className="font-[family-name:var(--font-mono)] text-slate-600 text-sm">
        No {category === "all" ? "" : category} opportunities right now.
      </p>
      <p className="font-[family-name:var(--font-mono)] text-slate-700 text-xs">
        First opportunities coming this week —{" "}
        <a href="https://x.com/zkjays" target="_blank" rel="noopener noreferrer"
           className="text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2">
          DM @zkjays
        </a>{" "}
        if you&apos;re hiring.
      </p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function OpportunitiesPage() {
  const { data: session } = useSession();
  const handle = (session as { handle?: string } | null)?.handle;

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");

  useEffect(() => {
    setLoading(true);
    const url =
      activeCategory === "all"
        ? "/api/opportunities"
        : `/api/opportunities?category=${activeCategory}`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => setOpportunities(d.opportunities ?? []))
      .catch(() => setOpportunities([]))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const counts = opportunities.reduce<Record<string, number>>((acc, opp) => {
    acc[opp.category] = (acc[opp.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 pt-24 pb-20">

        {/* Header */}
        <div className="mb-10">
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.3em] text-slate-500 uppercase mb-3">
            THE DARKROOM
          </p>
          <h1 className="text-3xl font-bold text-white mb-3">Opportunities</h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
            Curated web3 opportunities updated daily — jobs, bounties, hackathons, grants, and gigs.
            {handle ? (
              <span className="text-slate-500"> Apply directly with your{" "}
                <Link href={`/p/${handle}`} className="text-slate-300 hover:text-white underline underline-offset-2 transition-colors">
                  Darkroom ID
                </Link>.
              </span>
            ) : (
              <span className="text-slate-500">
                {" "}<Link href="/login" className="text-slate-300 hover:text-white underline underline-offset-2 transition-colors">
                  Sign in
                </Link>{" "}to apply with your Darkroom ID.
              </span>
            )}
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-2 flex-wrap mb-8">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            const count = cat.key === "all"
              ? opportunities.length
              : counts[cat.key] ?? 0;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  isActive
                    ? "bg-white/[0.08] border-white/20 text-white"
                    : "bg-transparent border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/[0.12]"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-white/[0.06] text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-5 h-5 rounded-full border border-white/15 border-t-white/50 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {opportunities.length === 0 ? (
              <EmptyState category={activeCategory} />
            ) : (
              opportunities.map((opp) => (
                <OpportunityCard key={opp.id} opp={opp} handle={handle} />
              ))
            )}
          </div>
        )}

        {/* Footer CTA */}
        {!handle && opportunities.length > 0 && (
          <div className="mt-12 border border-white/[0.06] rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.01]">
            <div>
              <p className="text-sm font-medium text-white mb-1">Apply with your Darkroom ID</p>
              <p className="font-[family-name:var(--font-mono)] text-[11px] text-slate-500">
                Share your proof of work instead of a CV.
              </p>
            </div>
            <Link
              href="/login"
              className="flex-shrink-0 font-[family-name:var(--font-mono)] text-xs px-4 py-2.5 rounded-lg bg-white text-black hover:bg-white/90 transition-all"
            >
              Get your ID →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

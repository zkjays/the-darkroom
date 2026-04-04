"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../component/landing/Navbar";
import CardGenerator from "../component/darkroom-id/CardGenerator";

interface DashboardData {
  handle: string;
  score: number;
  archetype: string;
  tagline: string;
  stats: { dedication: number; consistency: number; stealth: number; momentum: number };
  analysis: string;
  darkroom_line: string;
  profile_image_url?: string;
  claim_count: number;
  created_at: string;
  updated_at: string;
}

const statColors: Record<string, string> = {
  dedication: "bg-blue-400",
  consistency: "bg-purple-400",
  stealth: "bg-emerald-400",
  momentum: "bg-amber-400",
};

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase">{label}</span>
        <span className="font-mono text-xs text-white/50">{value}</span>
      </div>
      <div className="h-0.75 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function daysUntilReclaim(updatedAt: string) {
  const daysSince = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.ceil(30 - daysSince);
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const handle = localStorage.getItem("darkroom_handle");
    if (!handle) {
      router.replace("/darkroom-id");
      return;
    }

    fetch(`/api/dashboard?handle=${encodeURIComponent(handle)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setNotFound(true);
        } else {
          setData(d);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [router]);

  const disconnect = () => {
    localStorage.removeItem("darkroom_handle");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
        <Navbar />
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="text-center flex flex-col gap-4">
            <p className="text-white/40 text-sm">No Darkroom ID found.</p>
            <a
              href="/darkroom-id"
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:-translate-y-0.5 transition-all"
            >
              Take the quiz →
            </a>
          </div>
        </main>
      </div>
    );
  }

  if (!data) return null;

  const daysLeft = daysUntilReclaim(data.updated_at);
  const canReclaim = daysLeft <= 0;

  return (
    <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
      <Navbar />

      <main className="mx-auto max-w-2xl px-6 pt-32 pb-20 flex flex-col gap-8">

        {/* Header */}
        <div>
          <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.25em] text-white/30 uppercase mb-1">
            Your Darkroom ID
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            @{data.handle}
          </h1>
        </div>

        {/* Card */}
        <CardGenerator
          handle={data.handle}
          score={data.score}
          archetype={data.archetype}
          tagline={data.tagline}
          stats={data.stats}
          analysis={data.analysis}
          darkroomLine={data.darkroom_line}
          profileImageUrl={data.profile_image_url}
        />

        {/* Score + archetype */}
        <div className="text-center">
          <div className="font-[family-name:var(--font-mono)] text-[64px] font-bold leading-none text-white mb-1">
            {data.score}
          </div>
          <div className="font-[family-name:var(--font-mono)] text-xs tracking-[0.3em] text-white/30 uppercase mb-4">
            darkroom score
          </div>
          <div className="text-2xl font-extrabold tracking-tight text-white mb-2">
            {data.archetype}
          </div>
          <div className="font-[family-name:var(--font-mono)] text-xs tracking-[0.15em] text-white/40 uppercase">
            {data.tagline}
          </div>
        </div>

        {/* Stat bars */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 flex flex-col gap-4">
          {(Object.entries(data.stats) as [keyof typeof data.stats, number][]).map(([key, val]) => (
            <StatBar key={key} label={key} value={val} color={statColors[key] ?? "bg-white"} />
          ))}
        </div>

        {/* Analysis */}
        <div className="text-sm text-white/60 leading-7">{data.analysis}</div>

        {/* Darkroom line */}
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.15em] text-white/30 italic text-center">
          {data.darkroom_line}
        </p>

        {/* Claim metadata */}
        <div className="flex flex-col gap-1 text-center">
          <p className="font-[family-name:var(--font-mono)] text-xs text-white/25">
            Claimed on {formatDate(data.created_at)} · Claim #{data.claim_count}
          </p>
          {data.claim_count > 1 && (
            <p className="font-[family-name:var(--font-mono)] text-xs text-white/20">
              Evolution: Claim #1 → Claim #{data.claim_count} ({formatDate(data.updated_at)})
            </p>
          )}
        </div>

        {/* Reclaim */}
        <div className="flex flex-col gap-3">
          {canReclaim ? (
            <button
              onClick={() => router.push("/darkroom-id")}
              className="w-full rounded-xl border border-white/10 px-5 py-3 text-sm text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
            >
              Reclaim ID →
            </button>
          ) : (
            <div className="w-full rounded-xl border border-white/[0.05] px-5 py-3 text-sm text-white/20 text-center cursor-not-allowed">
              Reclaim in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
            </div>
          )}

          <button
            onClick={disconnect}
            className="text-xs text-white/20 hover:text-white/40 transition-colors text-center"
          >
            Disconnect
          </button>
        </div>

      </main>
    </div>
  );
}

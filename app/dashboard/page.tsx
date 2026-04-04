"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../component/landing/Navbar";
import CardGenerator from "../component/darkroom-id/CardGenerator";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_active: string;
  total_visits: number;
}

interface DashboardData {
  handle: string;
  score: number;
  bonus_points?: number;
  total_score?: number;
  archetype: string;
  tagline: string;
  stats: { dedication: number; consistency: number; stealth: number; momentum: number };
  analysis: string;
  darkroom_line: string;
  profile_image_url?: string;
  claim_count: number;
  claimed_at?: string;
  created_at: string;
  updated_at: string;
  streak: StreakData | null;
}

const statConfig: Record<
  string,
  { color: string; improvements: Array<{ label: string; points: string }> }
> = {
  dedication: {
    color: "bg-blue-400",
    improvements: [
      { label: "Complete 'Builder Basics' lesson", points: "+5 pts" },
      { label: "Earn 'Dedicated Builder' certification", points: "+15 pts" },
    ],
  },
  consistency: {
    color: "bg-purple-400",
    improvements: [
      { label: "Maintain a 7-day streak", points: "+8 pts" },
      { label: "Log in 30 days in a row", points: "+12 pts" },
    ],
  },
  stealth: {
    color: "bg-emerald-400",
    improvements: [
      { label: "Complete stealth challenges", points: "+6 pts" },
      { label: "Build a private project log", points: "+10 pts" },
    ],
  },
  momentum: {
    color: "bg-amber-400",
    improvements: [
      { label: "Share your progress publicly", points: "+5 pts" },
      { label: "Earn community badges", points: "+10 pts" },
    ],
  },
};

function formatDate(data: DashboardData) {
  const raw = data.claimed_at || data.created_at || data.updated_at;
  if (!raw) return "Unknown";
  try {
    return new Date(raw).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Unknown";
  }
}

function daysUntilReclaim(updatedAt: string) {
  const daysSince = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.ceil(30 - daysSince);
}

function PfpPlaceholder({ handle, size }: { handle: string; size: number }) {
  return (
    <div
      className="rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="text-white/40 font-bold" style={{ fontSize: size * 0.38 }}>
        {handle.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

function ProfileImage({ url, handle, size }: { url?: string; handle: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <PfpPlaceholder handle={handle} size={size} />;
  return (
    <img
      src={url}
      alt={handle}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="rounded-full border border-white/10 object-cover flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.2em] text-white/40 uppercase">
          {label}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-xs text-white/50">{value}</span>
      </div>
      <div className="h-[3px] w-full rounded-full bg-white/[0.08] overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${(value / 75) * 100}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({
  statKey,
  value,
}: {
  statKey: string;
  value: number;
}) {
  const cfg = statConfig[statKey];
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 flex flex-col gap-4 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all">
      <div className="flex flex-col gap-2">
        <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.2em] text-white/40 uppercase">
          {statKey}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">{value}</span>
          <span className="font-[family-name:var(--font-mono)] text-xs text-white/25">/75</span>
        </div>
        <StatBar label="" value={value} color={cfg.color} />
      </div>

      <div className="flex flex-col gap-2 pt-1 border-t border-white/[0.05]">
        <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.15em] text-white/25 uppercase">
          How to improve
        </p>
        {cfg.improvements.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 opacity-40">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs flex-shrink-0">🔒</span>
              <span className="text-xs text-white/60 truncate">{item.label}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-white/40">{item.points}</span>
              <span className="bg-white/[0.05] text-white/30 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                soon
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
        if (d.error) setNotFound(true);
        else setData(d);
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

  const bonusPoints = data.bonus_points ?? 0;
  const totalScore = data.total_score ?? data.score + bonusPoints;
  const daysLeft = daysUntilReclaim(data.updated_at);
  const canReclaim = daysLeft <= 0;
  const streak = data.streak;
  const claimDate = formatDate(data);

  return (
    <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
      <Navbar />

      <main className="mx-auto max-w-2xl px-6 pt-28 pb-24 flex flex-col gap-6">

        {/* ── A) HEADER CARD ── */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex items-center gap-5">
          <ProfileImage url={data.profile_image_url} handle={data.handle} size={80} />
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-extrabold tracking-tight text-white">
                @{data.handle}
              </h1>
              {streak && streak.current_streak > 0 && (
                <span className="bg-white/[0.05] border border-white/[0.08] text-white/50 text-xs px-2.5 py-1 rounded-full flex-shrink-0">
                  🔥 {streak.current_streak} day streak
                </span>
              )}
            </div>
            <p className="text-white/60 font-semibold text-sm">{data.archetype}</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-[family-name:var(--font-mono)] text-2xl font-bold text-white">
                {totalScore}
              </span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-white/25">/100</span>
            </div>
          </div>
        </div>

        {/* ── B) SCORE OVERVIEW ── */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 text-center flex flex-col gap-2">
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.25em] text-white/30 uppercase">
            Darkroom Score
          </p>
          <div className="font-[family-name:var(--font-mono)] text-[72px] font-bold leading-none text-white">
            {totalScore}
          </div>
          {bonusPoints > 0 ? (
            <p className="font-[family-name:var(--font-mono)] text-xs text-white/30">
              Base: {data.score} + Bonus: {bonusPoints}
            </p>
          ) : (
            <p className="font-[family-name:var(--font-mono)] text-xs text-white/25">
              Base score · up to +25 pts from lessons &amp; certs
            </p>
          )}
          <div className="mt-3 text-lg font-extrabold tracking-tight text-white">{data.archetype}</div>
          <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.15em] text-white/35 uppercase">
            {data.tagline}
          </p>
        </div>

        {/* ── C) FOUR STAT CARDS ── */}
        <div>
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.25em] text-white/30 uppercase mb-3">
            Stats
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.entries(data.stats) as [string, number][]).map(([key, val]) => (
              <StatCard key={key} statKey={key} value={val} />
            ))}
          </div>
        </div>

        {/* ── CARD PREVIEW + SHARE ── */}
        <div>
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.25em] text-white/30 uppercase mb-3">
            Your Card
          </p>
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
        </div>

        {/* ── ANALYSIS ── */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.25em] text-white/30 uppercase mb-3">
            Analysis
          </p>
          <p className="text-sm text-white/60 leading-7">{data.analysis}</p>
          <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.1em] text-white/25 italic mt-4">
            {data.darkroom_line}
          </p>
        </div>

        {/* ── D) JOURNEY TIMELINE ── */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.25em] text-white/30 uppercase mb-4">
            Your Journey
          </p>
          <div className="flex flex-col gap-0">
            {/* Claim entries */}
            {Array.from({ length: data.claim_count }, (_, i) => {
              const isLatest = i === data.claim_count - 1;
              const isFirst = i === 0;
              return (
                <div key={i} className="flex items-start gap-4 relative">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${isLatest ? "bg-white/60" : "bg-white/20"}`} />
                    {i < data.claim_count - 1 && (
                      <div className="w-px flex-1 bg-white/[0.06] min-h-[28px]" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm text-white/70 font-medium">
                      Claim #{i + 1}
                      {isLatest && data.claim_count > 1 && (
                        <span className="ml-2 text-xs text-white/30">(latest)</span>
                      )}
                    </p>
                    <p className="font-[family-name:var(--font-mono)] text-xs text-white/30 mt-0.5">
                      {isFirst ? claimDate : formatDate(data)} · Score {data.score}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Future empty states */}
            <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-white/[0.05]">
              {[
                { label: "Lessons completed", value: "0" },
                { label: "Certifications earned", value: "0" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center opacity-40">
                  <span className="text-xs text-white/50">{label}</span>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-white/30">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── E) ACTIONS ── */}
        <div className="flex flex-col gap-3">
          {canReclaim ? (
            <button
              onClick={() => router.push("/darkroom-id")}
              className="w-full rounded-xl border border-white/10 px-5 py-3 text-sm text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
            >
              Reclaim ID →
            </button>
          ) : (
            <div className="w-full rounded-xl border border-white/[0.05] px-5 py-3 text-sm text-white/20 text-center cursor-not-allowed select-none">
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

        {/* ── F) COMING SOON BANNER ── */}
        <div className="border border-white/[0.04] rounded-xl px-5 py-4 text-center">
          <p className="font-[family-name:var(--font-mono)] text-xs text-white/30">
            Lessons &amp; Certifications coming soon.
          </p>
          <p className="font-[family-name:var(--font-mono)] text-xs text-white/20 mt-1">
            Your score has room to grow. Stay in The Darkroom.
          </p>
        </div>

      </main>
    </div>
  );
}

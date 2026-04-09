"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "../../component/landing/Navbar";
import CardGenerator from "../../component/darkroom-id/CardGenerator";

interface PublicProfile {
  handle: string;
  score: number;
  bonus_points?: number;
  total_score?: number;
  archetype: string;
  tagline: string;
  stats: { focus: number; consistency: number; reliability: number; growth: number };
  analysis: string;
  darkroom_line: string;
  profile_image_url?: string;
  streak: { current_streak: number; longest_streak: number } | null;
  profile_public: boolean;
  goals_public: boolean;
}

interface PublicGoal {
  id: string;
  goal_text: string;
  target_stat: string;
  proof_type: "link" | "screenshot";
  status: "pending" | "completed" | "failed";
  copy_count: number;
}

const STATS = [
  { key: "focus",       label: "FOCUS",       color: "#60A5FA", fallback: "dedication" },
  { key: "consistency", label: "CONSISTENCY",  color: "#C084FC", fallback: "consistency" },
  { key: "reliability", label: "RELIABILITY",  color: "#34D399", fallback: "stealth" },
  { key: "growth",      label: "GROWTH",       color: "#FBBF24", fallback: "momentum" },
] as const;

function PfpPlaceholder({ handle, size }: { handle: string; size: number }) {
  return (
    <div
      className="rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="text-slate-300 font-bold" style={{ fontSize: size * 0.38 }}>
        {handle.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

function ProfileImage({ url, handle, size }: { url?: string; handle: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <PfpPlaceholder handle={handle} size={size} />;
  return (
    <img src={url} alt={handle} width={size} height={size}
      onError={() => setFailed(true)}
      className="rounded-full border border-white/10 object-cover flex-shrink-0"
      style={{ width: size, height: size }} />
  );
}

function StatBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-[3px] w-full rounded-full bg-white/[0.08] overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${(value / 75) * 100}%`, backgroundColor: color }} />
    </div>
  );
}

export default function PublicProfile() {
  const params = useParams();
  const handle = params?.handle as string;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [goals, setGoals] = useState<PublicGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!handle) return;
    fetch(`/api/dashboard?handle=${encodeURIComponent(handle)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setNotFound(true); return; }
        if (!d.profile_public) { setIsPrivate(true); return; }
        setProfile(d);
        // Fetch public goals if goals are public
        if (d.goals_public) {
          return fetch(`/api/goals?handle=${encodeURIComponent(handle)}&public_only=true`)
            .then((r) => r.json())
            .then((g) => setGoals(g.goals ?? []));
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [handle]);

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
            <p className="text-slate-300 text-sm">No builder found with that handle.</p>
            <a href="/darkroom-id"
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:-translate-y-0.5 transition-all">
              Get your ID →
            </a>
          </div>
        </main>
      </div>
    );
  }

  if (isPrivate) {
    return (
      <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
        <Navbar />
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="text-center flex flex-col gap-3 max-w-sm">
            <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.25em] text-slate-500 uppercase mb-2">
              Private Profile
            </p>
            <p className="text-slate-300 text-sm">
              @{handle}&apos;s profile is set to private.
            </p>
            <p className="font-[family-name:var(--font-mono)] text-xs text-slate-500">
              They&apos;re building in The Darkroom.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!profile) return null;

  const totalScore = profile.total_score ?? profile.score + (profile.bonus_points ?? 0);
  const s = (profile.stats ?? {}) as Record<string, number>;

  return (
    <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
      <Navbar />

      <main className="mx-auto max-w-2xl px-6 pt-28 pb-24 flex flex-col gap-8">

        {/* Header */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex items-center gap-5">
          <ProfileImage url={profile.profile_image_url} handle={profile.handle} size={80} />
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-extrabold tracking-tight text-white">@{profile.handle}</h1>
              {profile.streak && profile.streak.current_streak > 0 && (
                <span className="bg-white/[0.05] border border-white/[0.08] text-slate-300 text-xs px-2.5 py-1 rounded-full flex-shrink-0">
                  🔥 {profile.streak.current_streak} day streak
                </span>
              )}
            </div>
            <p className="text-slate-200 font-semibold text-sm">{profile.archetype}</p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="font-[family-name:var(--font-mono)] text-2xl font-bold text-white">{totalScore}</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-slate-500">/100</span>
            </div>
          </div>
        </div>

        {/* Score */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 text-center flex flex-col gap-2">
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.25em] text-slate-400 uppercase">
            Darkroom Score
          </p>
          <div className="font-[family-name:var(--font-mono)] text-[72px] font-bold leading-none text-white">
            {totalScore}
          </div>
          <div className="mt-3 text-lg font-extrabold tracking-tight text-white">{profile.archetype}</div>
          <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.15em] text-white/35 uppercase">{profile.tagline}</p>
        </div>

        {/* Stats */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 flex flex-col gap-4">
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.25em] text-slate-400 uppercase">Stats</p>
          {STATS.map((stat) => {
            const value = s[stat.key] ?? s[stat.fallback] ?? 0;
            return (
              <div key={stat.key} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.2em] text-slate-300 uppercase">{stat.label}</span>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-slate-300">{value}</span>
                </div>
                <StatBar value={value} color={stat.color} />
              </div>
            );
          })}
        </div>

        {/* Public goals today */}
        {profile.goals_public && goals.length > 0 && (
          <div>
            <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.25em] text-slate-400 uppercase mb-3">
              Today&apos;s Goals
            </p>
            <div className="flex flex-col gap-2">
              {goals.map((goal) => {
                const statDef = STATS.find((s) => s.key === goal.target_stat);
                return (
                  <div key={goal.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={goal.status === "completed" ? "text-[#34D399]" : "text-slate-500"}>
                        {goal.status === "completed" ? "✓" : "○"}
                      </span>
                      <span className={`text-sm truncate ${goal.status === "completed" ? "text-slate-300 line-through" : "text-slate-200"}`}>
                        {goal.goal_text}
                      </span>
                    </div>
                    {statDef && (
                      <span className="font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ color: statDef.color, backgroundColor: statDef.color + "15" }}>
                        {statDef.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Card */}
        <div>
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.25em] text-slate-400 uppercase mb-3">
            Darkroom ID Card
          </p>
          <CardGenerator
            handle={profile.handle} score={profile.score} archetype={profile.archetype}
            tagline={profile.tagline} stats={profile.stats} analysis={profile.analysis}
            darkroomLine={profile.darkroom_line} profileImageUrl={profile.profile_image_url}
          />
        </div>

        {/* Analysis */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.25em] text-slate-400 uppercase mb-3">Analysis</p>
          <p className="text-sm text-slate-200 leading-7">{profile.analysis}</p>
          <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.1em] text-slate-500 italic mt-4">{profile.darkroom_line}</p>
        </div>

        {/* CTA */}
        <div className="text-center flex flex-col gap-3">
          <p className="font-[family-name:var(--font-mono)] text-xs text-slate-500">Want your own Darkroom ID?</p>
          <a href={`/darkroom-id?ref=${profile.handle}`}
            className="inline-block rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-black hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)] transition-all">
            Get your ID →
          </a>
        </div>

      </main>
    </div>
  );
}

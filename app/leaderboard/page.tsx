"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Navbar from "../component/landing/Navbar";

interface Builder {
  handle: string;
  total_score: number;
  social_proof: number;
  builder_proof: number;
  work_proof: number;
  profile_image_url?: string;
  archetype: string;
  is_og?: boolean;
}

function PfpPlaceholder({ handle, size }: { handle: string; size: number }) {
  return (
    <div
      className="rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0"
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
    <img
      src={url} alt={handle} width={size} height={size}
      onError={() => setFailed(true)}
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-[2px] w-12 bg-white/[0.06] rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function BuilderRow({
  b,
  rank,
  isMe,
  dimmed,
}: {
  b: Builder;
  rank: number;
  isMe: boolean;
  dimmed?: boolean;
}) {
  const isTop3 = rank <= 3;
  const rankColors = ["#c9a84c", "rgba(255,255,255,0.6)", "rgba(201,168,76,0.5)"];
  const rankColor = rank <= 3 ? rankColors[rank - 1] : "rgba(255,255,255,0.2)";

  return (
    <a
      href={`/p/${b.handle}`}
      className={`flex items-center gap-4 px-4 py-3.5 rounded-sm border transition-all ${
        isMe
          ? "border-[#c9a84c]/40 bg-[#c9a84c]/[0.04] hover:bg-[#c9a84c]/[0.07]"
          : isTop3
          ? "border-white/[0.10] bg-[#0c0c14] hover:border-white/25 hover:bg-[#0f0f18]"
          : "border-white/[0.05] bg-[#0c0c14] hover:border-white/15 hover:bg-[#0f0f18]"
      } ${dimmed ? "opacity-50" : ""}`}
    >
      {/* Rank */}
      <span
        className="font-[family-name:var(--font-mono)] text-sm font-bold w-8 text-center flex-shrink-0"
        style={{ color: rankColor }}
      >
        #{rank}
      </span>

      {/* Avatar */}
      <ProfileImage url={b.profile_image_url} handle={b.handle} size={38} />

      {/* Identity + breakdown */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isMe ? "" : "text-white"}`} style={isMe ? { color: "#c9a84c" } : {}}>
            @{b.handle}
          </span>
          {b.is_og && (
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-sm border border-[#c9a84c]/40 text-[#c9a84c] bg-[#c9a84c]/[0.08]">
              OG
            </span>
          )}
          {isMe && (
            <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#c9a84c]/60">you</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-[family-name:var(--font-mono)] text-[9px] text-slate-600 uppercase">S</span>
            <ScoreBar value={b.social_proof} color="rgba(255,255,255,0.35)" />
            <span className="font-[family-name:var(--font-mono)] text-[9px] text-slate-500">{b.social_proof}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-[family-name:var(--font-mono)] text-[9px] text-slate-600 uppercase">B</span>
            <ScoreBar value={b.builder_proof} color="rgba(255,255,255,0.35)" />
            <span className="font-[family-name:var(--font-mono)] text-[9px] text-slate-500">{b.builder_proof}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-[family-name:var(--font-mono)] text-[9px] text-slate-600 uppercase">W</span>
            <ScoreBar value={b.work_proof} max={50} color="rgba(201,168,76,0.6)" />
            <span className="font-[family-name:var(--font-mono)] text-[9px] text-slate-500">{b.work_proof}</span>
          </div>
        </div>
      </div>

      {/* Score */}
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <span className="font-bold text-xl leading-none" style={{ color: isMe ? "#c9a84c" : isTop3 ? "#c9a84c" : "rgba(255,255,255,0.8)" }}>
          {b.total_score ?? 0}
        </span>
        <span className="text-[9px] font-[family-name:var(--font-mono)] text-slate-600 tracking-widest">PTS</span>
      </div>
    </a>
  );
}

export default function Leaderboard() {
  const { data: session, status } = useSession();
  const [builders, setBuilders] = useState<Builder[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasProof, setHasProof] = useState(false);
  const [checkingProof, setCheckingProof] = useState(true);

  const myHandle = (session as { handle?: string } | null)?.handle;

  useEffect(() => {
    if (status === "loading") return;
    if (!myHandle) { setCheckingProof(false); return; }
    fetch(`/api/goals?handle=${encodeURIComponent(myHandle)}&all=true&completed=true`)
      .then((r) => r.json())
      .then((d) => setHasProof((d.goals ?? []).length > 0))
      .finally(() => setCheckingProof(false));
  }, [myHandle, status]);

  useEffect(() => {
    if (!hasProof) return;
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setBuilders(d.builders ?? []))
      .finally(() => setLoading(false));
  }, [hasProof]);

  const myRank = myHandle ? builders.findIndex((b) => b.handle === myHandle) : -1;
  const myBuilder = myRank >= 0 ? builders[myRank] : null;

  return (
    <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
      <Navbar />

      <main className="mx-auto px-6 py-10 pt-24" style={{ maxWidth: 680 }}>

        {/* Header */}
        <div className="mb-10">
          <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.25em] text-slate-600 uppercase mb-2">
            The Darkroom
          </p>
          <h1 className="text-3xl font-bold text-white tracking-tight">Room Score</h1>
          <p className="font-[family-name:var(--font-mono)] text-xs text-slate-500 mt-2">
            builders ranked by proof — not promises
          </p>
          <div className="mt-4 h-[1px] w-12" style={{ background: "linear-gradient(90deg, rgba(201,168,76,0.6), transparent)" }} />
        </div>

        {checkingProof || status === "loading" ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-white/15 border-t-white/50 animate-spin" />
          </div>

        ) : !hasProof ? (
          <div className="flex flex-col gap-6 py-20">
            <div className="flex flex-col gap-3">
              <p className="font-[family-name:var(--font-mono)] text-xs text-slate-500 uppercase tracking-widest">
                ◈ proof-gated
              </p>
              <p className="text-white/70 text-lg font-medium leading-snug max-w-sm">
                Submit your first proof to unlock the leaderboard.
              </p>
              <p className="font-[family-name:var(--font-mono)] text-xs text-white/25 max-w-xs leading-relaxed">
                Reserved for builders who have shipped at least one validated proof.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="self-start rounded-sm border border-white/10 px-5 py-2.5 font-[family-name:var(--font-mono)] text-xs text-white/60 hover:text-white hover:border-white/25 transition-all tracking-widest uppercase"
            >
              Submit a proof →
            </Link>
          </div>

        ) : loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-white/15 border-t-white/50 animate-spin" />
          </div>

        ) : builders.length === 0 ? (
          <p className="font-[family-name:var(--font-mono)] text-xs text-slate-500 text-center py-20">No builders yet.</p>

        ) : (
          <div className="flex flex-col gap-1.5">

            {/* Top 3 — slightly more prominent */}
            {builders.slice(0, 3).map((b, i) => (
              <BuilderRow
                key={b.handle}
                b={b}
                rank={i + 1}
                isMe={b.handle === myHandle}
              />
            ))}

            {/* Separator */}
            {builders.length > 3 && (
              <div className="my-2 h-[1px] bg-white/[0.04]" />
            )}

            {/* Rest of list */}
            {builders.slice(3).map((b, i) => (
              <BuilderRow
                key={b.handle}
                b={b}
                rank={i + 4}
                isMe={b.handle === myHandle}
              />
            ))}

            {/* Your rank — shown separately only if not already visible in list */}
            {myBuilder && myRank >= 0 && (
              <div className="mt-6 pt-5 border-t border-white/[0.06]">
                <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-600 uppercase tracking-widest mb-2">
                  your position
                </p>
                <BuilderRow
                  b={myBuilder}
                  rank={myRank + 1}
                  isMe={true}
                />
              </div>
            )}

            {/* Footer count */}
            <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-700 text-center mt-6">
              {builders.length} builder{builders.length !== 1 ? "s" : ""} · proof-verified
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

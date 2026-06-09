"use client";

import { useEffect, useState } from "react";
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
      style={{ width: size, height: size, boxShadow: "0 0 0 2px rgba(103,232,249,0.35)" }}
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
      style={{ width: size, height: size, boxShadow: "0 0 0 2px rgba(103,232,249,0.35)" }}
    />
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-amber-400 font-mono text-sm font-bold w-8 text-center">#1</span>;
  if (rank === 2) return <span className="text-slate-300 font-mono text-sm font-bold w-8 text-center">#2</span>;
  if (rank === 3) return <span className="text-amber-700 font-mono text-sm font-bold w-8 text-center">#3</span>;
  return <span className="text-slate-600 font-mono text-sm w-8 text-center">#{rank}</span>;
}

export default function Leaderboard() {
  const [builders, setBuilders] = useState<Builder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setBuilders(d.builders ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
      <div
        className="pointer-events-none fixed top-0 left-0 w-[500px] h-[500px] -translate-x-1/2 -translate-y-1/2"
        style={{ background: "radial-gradient(circle, rgba(103,232,249,0.07) 0%, transparent 70%)" }}
      />
      <Navbar />

      <main className="mx-auto px-8 py-10 pt-20" style={{ maxWidth: 720 }}>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
          <p className="text-sm font-mono text-slate-500 mt-1">Top builders by Room Score</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-7 h-7 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
          </div>
        ) : builders.length === 0 ? (
          <p className="text-slate-500 font-mono text-sm text-center py-20">No builders yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {builders.map((b, i) => (
              <a
                key={b.handle}
                href={`/p/${b.handle}`}
                className="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/[0.06] hover:border-white/20 bg-[#0c0c14] hover:bg-[#0f0f1a] transition-all"
              >
                <RankBadge rank={i + 1} />
                <ProfileImage url={b.profile_image_url} handle={b.handle} size={40} />
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">@{b.handle}</span>
                    {b.is_og && (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-400 bg-amber-500/10">
                        OG
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-500 truncate">{b.archetype}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className="text-cyan-400 font-bold text-lg">{b.total_score ?? 0}</span>
                  <span className="text-[10px] font-mono text-slate-600">SCORE</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Navbar from "../component/landing/Navbar";
import { plugTier } from "../lib/plug";

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

interface Proof {
  id: string;
  handle: string;
  goal_text: string;
  proof_type: string;
  proof_value: string;
  plugs: number;
  weighted: number;
  velocity: number;
  tier: string;
  tier_label: string;
  top_pluggers: { handle: string; pfp?: string }[];
  builder_pfp?: string;
  builder_og?: boolean;
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

// The signature glyph — a single light point whose brightness encodes the plug tier.
function PlugDot({ plugs }: { plugs: number }) {
  const t = plugTier(plugs);
  const lit = t.glow > 0;
  const size = 11;
  return (
    <span className="relative inline-flex items-center justify-center flex-shrink-0" style={{ width: 18, height: 18 }}>
      {t.halo && (
        <span
          className="absolute inset-0 rounded-full animate-pulse"
          style={{ boxShadow: `0 0 14px 3px ${t.color}`, opacity: 0.45 }}
        />
      )}
      <span
        style={{
          width: size,
          height: size,
          borderRadius: 9999,
          background: lit ? t.color : "transparent",
          border: lit ? "none" : `1.5px solid ${t.color}`,
          boxShadow: lit ? `0 0 ${4 + t.glow * 12}px ${t.color}` : "none",
          opacity: lit ? Math.max(0.5, t.glow) : 1,
        }}
      />
    </span>
  );
}

// Stacked mini-pfp circles of who plugged this proof
function PluggerStack({ pluggers }: { pluggers: { handle: string; pfp?: string }[] }) {
  if (!pluggers.length) return null;
  return (
    <div className="flex items-center flex-shrink-0" style={{ marginLeft: -2 }}>
      {pluggers.map((p, i) => (
        <div
          key={p.handle}
          className="rounded-full border border-[#050508]"
          style={{ width: 18, height: 18, marginLeft: i === 0 ? 0 : -5, zIndex: pluggers.length - i }}
          title={`@${p.handle}`}
        >
          <ProfileImage url={p.pfp} handle={p.handle} size={18} />
        </div>
      ))}
    </div>
  );
}

function ProofRow({
  p,
  rank,
  isMe,
  canPlug,
  isEndorsed,
  isPlugging,
  onPlug,
}: {
  p: Proof;
  rank: number;
  isMe: boolean;
  canPlug: boolean;
  isEndorsed: boolean;
  isPlugging: boolean;
  onPlug: (id: string) => void;
}) {
  const isTop3 = rank <= 3;
  const rankColors = ["#c9a84c", "rgba(255,255,255,0.6)", "rgba(201,168,76,0.5)"];
  const rankColor = rank <= 3 ? rankColors[rank - 1] : "rgba(255,255,255,0.2)";
  const t = plugTier(p.plugs);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 rounded-sm border transition-all ${
        isMe
          ? "border-[#c9a84c]/40 bg-[#c9a84c]/[0.04]"
          : isTop3
          ? "border-white/[0.10] bg-[#0c0c14]"
          : "border-white/[0.05] bg-[#0c0c14]"
      }`}
    >
      {/* Rank */}
      <span
        className="font-[family-name:var(--font-mono)] text-sm font-bold w-8 text-center flex-shrink-0"
        style={{ color: rankColor }}
      >
        #{rank}
      </span>

      {/* Plug glyph */}
      <PlugDot plugs={p.plugs} />

      {/* Avatar — links to profile */}
      <a href={`/p/${p.handle}`} className="flex-shrink-0">
        <ProfileImage url={p.builder_pfp} handle={p.handle} size={32} />
      </a>

      {/* Proof + builder — links to profile */}
      <a href={`/p/${p.handle}`} className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="text-sm font-medium text-white truncate">{p.goal_text}</span>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`font-[family-name:var(--font-mono)] text-[10px] truncate ${isMe ? "text-[#c9a84c]" : "text-slate-500"}`}>
            @{p.handle}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded-sm border border-white/10 text-slate-500 uppercase tracking-wider flex-shrink-0">
            {p.proof_type}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-wider flex-shrink-0" style={{ color: t.color, opacity: 0.8 }}>
            {p.tier_label}
          </span>
        </div>
      </a>

      {/* Top pluggers mini-stack */}
      {p.top_pluggers.length > 0 && (
        <PluggerStack pluggers={p.top_pluggers} />
      )}

      {/* Plug count */}
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0 w-10">
        <span className="font-bold text-xl leading-none" style={{ color: t.glow > 0 ? t.color : "rgba(255,255,255,0.5)" }}>
          {p.plugs}
        </span>
        <span className="text-[9px] font-[family-name:var(--font-mono)] text-slate-600 tracking-widest">
          PLUG{p.plugs !== 1 ? "S" : ""}
        </span>
      </div>

      {/* Plug button */}
      {!isMe && (
        <button
          onClick={() => canPlug && !isEndorsed && !isPlugging && onPlug(p.id)}
          disabled={isEndorsed || !canPlug || isPlugging}
          className={`flex-shrink-0 rounded-sm border font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider px-2.5 py-1.5 transition-all ${
            isEndorsed
              ? "border-[#00d4aa]/30 text-[#00d4aa] bg-[#00d4aa]/[0.06] cursor-default"
              : canPlug && !isPlugging
              ? "border-white/[0.12] text-slate-400 hover:border-[#00d4aa]/50 hover:text-[#00d4aa] hover:bg-[#00d4aa]/[0.04] cursor-pointer"
              : "border-white/[0.04] text-slate-700 cursor-not-allowed"
          }`}
        >
          {isPlugging ? "···" : isEndorsed ? "⊕" : "plug"}
        </button>
      )}
    </div>
  );
}

export default function Leaderboard() {
  const { data: session, status } = useSession();
  const [view, setView] = useState<"builders" | "proofs">("builders");
  const [builders, setBuilders] = useState<Builder[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasProof, setHasProof] = useState(false);
  const [checkingProof, setCheckingProof] = useState(true);

  const [proofs, setProofs] = useState<Proof[]>([]);
  const [proofTypes, setProofTypes] = useState<string[]>([]);
  const [proofFilter, setProofFilter] = useState("all");
  const [loadingProofs, setLoadingProofs] = useState(false);

  // Plug quota
  const [plugsUsed, setPlugsUsed] = useState(0);
  const [plugLimit, setPlugLimit] = useState(3);
  const [endorsedIds, setEndorsedIds] = useState<Set<string>>(new Set());
  const [plugging, setPlugging] = useState<Set<string>>(new Set());
  const quotaFetched = useRef(false);

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

  useEffect(() => {
    if (!hasProof || view !== "proofs") return;
    setLoadingProofs(true);
    fetch(`/api/leaderboard/proofs?filter=${encodeURIComponent(proofFilter)}`)
      .then((r) => r.json())
      .then((d) => {
        setProofs(d.proofs ?? []);
        if ((d.types ?? []).length) setProofTypes(d.types);
      })
      .finally(() => setLoadingProofs(false));
  }, [hasProof, view, proofFilter]);

  // Fetch plug quota once when entering proofs view
  useEffect(() => {
    if (!myHandle || view !== "proofs" || quotaFetched.current) return;
    quotaFetched.current = true;
    fetch("/api/plugs/quota")
      .then((r) => r.json())
      .then((d) => {
        setPlugsUsed(d.used ?? 0);
        setPlugLimit(d.limit ?? 3);
        setEndorsedIds(new Set(d.endorsed_ids ?? []));
      })
      .catch(() => {});
  }, [myHandle, view]);

  async function handlePlug(goalId: string) {
    if (plugging.has(goalId)) return;
    setPlugging((prev) => new Set([...prev, goalId]));
    try {
      const res = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal_id: goalId }),
      });
      if (res.ok) {
        setEndorsedIds((prev) => new Set([...prev, goalId]));
        setPlugsUsed((prev) => prev + 1);
        // Optimistic plug count increment
        setProofs((prev) =>
          prev.map((p) =>
            p.id === goalId
              ? { ...p, plugs: p.plugs + 1 }
              : p
          )
        );
      }
    } finally {
      setPlugging((prev) => {
        const next = new Set(prev);
        next.delete(goalId);
        return next;
      });
    }
  }

  const myRank = myHandle ? builders.findIndex((b) => b.handle === myHandle) : -1;
  const myBuilder = myRank >= 0 ? builders[myRank] : null;
  const plugsLeft = plugLimit - plugsUsed;

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
            {view === "builders" ? "builders ranked by proof — not promises" : "proofs ranked by plugs — the room decides"}
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

        ) : (
          <>
            {/* View toggle — Builders ↔ Proofs */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-1 p-1 rounded-sm border border-white/[0.06] bg-[#0c0c14] w-fit">
                {(["builders", "proofs"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-4 py-1.5 rounded-sm font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-widest transition-all ${
                      view === v ? "bg-white/[0.06] text-white" : "text-slate-500 hover:text-white/70"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Plug quota counter — visible only in proofs view for logged-in users */}
              {view === "proofs" && myHandle && (
                <div className="flex items-center gap-1.5">
                  <span className="font-[family-name:var(--font-mono)] text-[10px] text-slate-600 uppercase tracking-wider">plugs left</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: plugLimit }).map((_, i) => (
                      <span
                        key={i}
                        className="rounded-full"
                        style={{
                          width: 7,
                          height: 7,
                          background: i < plugsLeft ? "#00d4aa" : "rgba(255,255,255,0.06)",
                          boxShadow: i < plugsLeft ? "0 0 6px #00d4aa" : "none",
                        }}
                      />
                    ))}
                  </div>
                  <span className="font-[family-name:var(--font-mono)] text-[10px]" style={{ color: plugsLeft > 0 ? "#00d4aa" : "rgba(255,255,255,0.2)" }}>
                    {plugsLeft}/{plugLimit}
                  </span>
                </div>
              )}
            </div>

            {view === "builders" ? (
              loading ? (
                <div className="flex justify-center py-20">
                  <div className="w-6 h-6 rounded-full border-2 border-white/15 border-t-white/50 animate-spin" />
                </div>
              ) : builders.length === 0 ? (
                <p className="font-[family-name:var(--font-mono)] text-xs text-slate-500 text-center py-20">No builders yet.</p>
              ) : (
                <div className="flex flex-col gap-1.5">

                  {/* Top 3 — slightly more prominent */}
                  {builders.slice(0, 3).map((b, i) => (
                    <BuilderRow key={b.handle} b={b} rank={i + 1} isMe={b.handle === myHandle} />
                  ))}

                  {/* Separator */}
                  {builders.length > 3 && <div className="my-2 h-[1px] bg-white/[0.04]" />}

                  {/* Rest of list */}
                  {builders.slice(3).map((b, i) => (
                    <BuilderRow key={b.handle} b={b} rank={i + 4} isMe={b.handle === myHandle} />
                  ))}

                  {/* Your rank — shown separately only if not already visible in list */}
                  {myBuilder && myRank >= 0 && (
                    <div className="mt-6 pt-5 border-t border-white/[0.06]">
                      <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-600 uppercase tracking-widest mb-2">
                        your position
                      </p>
                      <BuilderRow b={myBuilder} rank={myRank + 1} isMe={true} />
                    </div>
                  )}

                  {/* Footer count */}
                  <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-700 text-center mt-6">
                    {builders.length} builder{builders.length !== 1 ? "s" : ""} · proof-verified
                  </p>
                </div>
              )
            ) : (
              <>
                {/* Filter chips */}
                <div className="flex flex-wrap items-center gap-1.5 mb-5">
                  {["all", "rising", ...proofTypes].map((f) => (
                    <button
                      key={f}
                      onClick={() => setProofFilter(f)}
                      className={`px-3 py-1 rounded-sm border font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider transition-all ${
                        proofFilter === f
                          ? "border-[#c9a84c]/40 text-[#c9a84c] bg-[#c9a84c]/[0.06]"
                          : "border-white/[0.06] text-slate-500 hover:text-white/70 hover:border-white/15"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {loadingProofs ? (
                  <div className="flex justify-center py-20">
                    <div className="w-6 h-6 rounded-full border-2 border-white/15 border-t-white/50 animate-spin" />
                  </div>
                ) : proofs.length === 0 ? (
                  <p className="font-[family-name:var(--font-mono)] text-xs text-slate-500 text-center py-20">
                    {proofFilter === "rising" ? "Nothing rising yet — plug an early build." : "No proofs yet."}
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {proofs.map((p, i) => (
                      <ProofRow
                        key={p.id}
                        p={p}
                        rank={i + 1}
                        isMe={p.handle === myHandle}
                        canPlug={!!myHandle && plugsLeft > 0}
                        isEndorsed={endorsedIds.has(p.id)}
                        isPlugging={plugging.has(p.id)}
                        onPlug={handlePlug}
                      />
                    ))}
                    <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-700 text-center mt-6">
                      {proofs.length} proof{proofs.length !== 1 ? "s" : ""} · plug-ranked
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

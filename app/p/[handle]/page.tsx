"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "../../component/landing/Navbar";
import { sanitizeHandle } from "@/app/lib/sanitize";

interface ProfileData {
  handle: string;
  score: number;
  bonus_points?: number;
  total_score?: number;
  social_proof?: number;
  builder_proof?: number;
  work_proof?: number;
  archetype: string;
  profile_image_url?: string;
  streak: { current_streak: number } | null;
  profile_public: boolean;
  open_to_opportunities?: boolean;
  is_og?: boolean;
}

interface WorkProof {
  id: string;
  goal_text: string;
  proof_type: string;
  proof_value?: string;
  description?: string;
  image_url?: string;
  created_at: string;
  completed_at?: string;
  endorsement_count?: number;
}

const WORK_TYPE_ICONS: Record<string, string> = {
  Project: "⬡", Article: "◈", Video: "▶", Thread: "◉", OSS: "⌥", Design: "◻", Other: "·",
};

function PfpPlaceholder({ handle, size }: { handle: string; size: number }) {
  return (
    <div
      className="rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, boxShadow: "0 0 0 2px rgba(255,255,255,0.12)" }}
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
      style={{ width: size, height: size, boxShadow: "0 0 0 2px rgba(255,255,255,0.12)" }}
    />
  );
}

function ProofRing({ score, label, color, size = 100 }: { score: number; label: string; color: string; size?: number }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const cx = size / 2;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeOpacity={0.1} strokeWidth={size * 0.06} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeOpacity={0.85} strokeWidth={size * 0.06}
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ marginTop: -size * 0.72, position: "relative", zIndex: 1, textAlign: "center" }}>
        <div style={{ fontSize: size * 0.22, fontWeight: 600, color: "white" }}>{score}</div>
      </div>
      <div className="flex flex-col items-center" style={{ marginTop: size * 0.42 }}>
        <span className="text-xs font-mono tracking-widest" style={{ color }}>{label.toUpperCase()}</span>
        <span className="text-[10px] font-mono text-slate-600 tracking-widest">PROOF</span>
      </div>
    </div>
  );
}

// ── LOADING / EMPTY STATES ──────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
      <Navbar />
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center flex flex-col gap-4">{children}</div>
      </main>
    </div>
  );
}

// ── PAGE ────────────────────────────────────────────────────────────────────

export default function PublicProfile() {
  const params = useParams();
  const handle = sanitizeHandle((params?.handle as string) ?? "");

  const [data, setData] = useState<ProfileData | null>(null);
  const [proofs, setProofs] = useState<WorkProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [selectedProof, setSelectedProof] = useState<WorkProof | null>(null);
  const [endorsedIds, setEndorsedIds] = useState<Set<string>>(new Set());
  const { data: session } = useSession();
  const currentHandle = session?.handle;

  useEffect(() => {
    if (!handle) return;
    fetch(`/api/dashboard?handle=${encodeURIComponent(handle)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setNotFound(true); return; }
        if (!d.profile_public) { setIsPrivate(true); return; }
        setData(d);
        return fetch(
          `/api/goals?handle=${encodeURIComponent(handle)}&all=true&completed=true&public_only=true`
        )
          .then((r) => r.json())
          .then((g) => setProofs((g.goals ?? []).slice(0, 6)));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [handle]);

  if (loading) return <LoadingState />;

  if (notFound) {
    return (
      <CenteredMessage>
        <p className="font-[family-name:var(--font-mono)] text-slate-500 text-sm">
          This builder hasn&apos;t claimed their ID yet.
        </p>
        <a
          href="/darkroom-id"
          className="font-[family-name:var(--font-mono)] text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
        >
          Get your Darkroom ID →
        </a>
      </CenteredMessage>
    );
  }

  if (isPrivate) {
    return (
      <CenteredMessage>
        <p className="font-[family-name:var(--font-mono)] text-slate-500 text-sm">
          This profile is private.
        </p>
      </CenteredMessage>
    );
  }

  if (!data) return null;

  const totalScore = data.total_score ?? (data.score + (data.bonus_points ?? 0));

  return (
    <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
      {/* Ambient glows */}
      <div
        className="pointer-events-none fixed top-0 left-0 w-[500px] h-[500px] -translate-x-1/2 -translate-y-1/2"
        style={{ background: "radial-gradient(circle, rgba(103,232,249,0.07) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none fixed bottom-0 right-0 w-[500px] h-[500px] translate-x-1/2 translate-y-1/2"
        style={{ background: "radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 70%)" }}
      />

      <Navbar />

      <main className="mx-auto px-8 py-10 pt-20" style={{ maxWidth: 860 }}>

        {/* ── Row 1: Identity + Room Score ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <ProfileImage url={data.profile_image_url} handle={data.handle} size={96} />
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-medium text-white">@{data.handle}</span>
              <span className="text-sm font-mono text-slate-500">{data.archetype}</span>
              {data.streak && data.streak.current_streak > 0 && (
                <span className="text-sm text-slate-400 mt-1">🔥 {data.streak.current_streak} day streak</span>
              )}
              {data.open_to_opportunities && (
                <span className="mt-1 self-start font-[family-name:var(--font-mono)] text-xs px-2.5 py-1 rounded-sm border border-[#c9a84c]/40 bg-[#c9a84c]/[0.08]" style={{ color: "#c9a84c" }}>
                  ◈ available for work
                </span>
              )}
              {data.is_og && (
                <span className="mt-1 self-start font-[family-name:var(--font-mono)] text-xs px-2.5 py-1 rounded-full border border-amber-500/40 text-amber-400 bg-amber-500/10">
                  ◈ OG Builder
                </span>
              )}
            </div>
          </div>

          <div className="bg-[#0c0c14] border border-white/10 rounded-xl px-6 py-4 flex-shrink-0">
            <p className="text-xs font-mono tracking-widest" style={{ color: "rgba(201,168,76,0.6)" }}>ROOM SCORE</p>
            <p className="text-4xl font-bold" style={{ color: "#c9a84c" }}>{totalScore}</p>
          </div>
        </div>

        {/* ── Row 2: Proof rings ── */}
        <div className="flex justify-center gap-12 mt-10">
          <ProofRing score={data.social_proof ?? 0} label="Social" color="#a78bfa" size={140} />
          <ProofRing score={data.builder_proof ?? 0} label="Builder" color="#60a5fa" size={140} />
          <ProofRing score={data.work_proof ?? 0} label="Work" color="#34d399" size={110} />
        </div>

        {/* ── Row 3: Work proofs gallery ── */}
        {proofs.length > 0 && (
          <div className="mt-8">
            <p className="text-xs font-mono text-slate-600 tracking-widest mb-4">WORK</p>
            <div className="grid grid-cols-2 gap-4">
              {proofs.map((proof) => {
                const ec = proof.endorsement_count ?? 0;
                return (
                  <div
                    key={proof.id}
                    onClick={() => setSelectedProof(proof)}
                    className="relative cursor-pointer rounded-xl overflow-hidden border border-white/[0.06] hover:border-white/20 transition-all bg-[#0c0c14]"
                    style={{ aspectRatio: "3/2" }}
                  >
                    {proof.image_url ? (
                      <img
                        src={proof.image_url}
                        alt={proof.goal_text}
                        className="absolute inset-0 w-full h-full object-cover opacity-80"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-5xl opacity-10">{WORK_TYPE_ICONS[proof.proof_type] ?? "·"}</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <p className="text-sm text-white font-medium line-clamp-2">{proof.goal_text}</p>
                      {ec > 0 && (
                        <p className="text-xs text-slate-400 mt-1">{ec} endorsement{ec !== 1 ? "s" : ""}</p>
                      )}
                    </div>
                    <div className="absolute top-2.5 right-2.5">
                      {ec >= 3 ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Featured
                        </span>
                      ) : ec >= 1 ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Validated
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-500 border border-white/10">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Row 4: Footer ── */}
        <div className="flex justify-between items-center mt-8">
          <span className="text-xs font-mono text-slate-500">◈ proof of work — not promises</span>
          <a
            href="/darkroom-id"
            className="text-xs font-mono text-cyan-400/60 hover:text-cyan-400 transition-colors"
          >
            Get your Darkroom ID →
          </a>
        </div>
      </main>

      {/* ── Proof detail modal ── */}
      {selectedProof && (() => {
        const ec = selectedProof.endorsement_count ?? 0;
        return (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={() => setSelectedProof(null)}
          >
            <div
              className="max-w-lg w-full bg-[#0c0c14] border border-white/10 rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedProof.image_url && (
                <div className="aspect-video w-full">
                  <img
                    src={selectedProof.image_url}
                    alt={selectedProof.goal_text}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-slate-400">
                    {selectedProof.proof_type}
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-[10px] text-slate-600">
                    {new Date(selectedProof.completed_at ?? selectedProof.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </span>
                </div>
                <h3 className="text-white font-bold text-lg">{selectedProof.goal_text}</h3>
                {selectedProof.description && (
                  <p className="text-slate-400 text-sm leading-relaxed">{selectedProof.description}</p>
                )}
                {selectedProof.proof_value && (
                  <a
                    href={selectedProof.proof_value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-[family-name:var(--font-mono)] text-xs text-cyan-400 hover:underline truncate"
                  >
                    {selectedProof.proof_value}
                  </a>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="font-[family-name:var(--font-mono)] text-xs text-slate-500">
                    {ec} endorsement{ec !== 1 ? "s" : ""}
                  </span>
                  <span
                    className="font-[family-name:var(--font-mono)] text-xs"
                    style={{ color: ec >= 1 ? "#34d399" : "#64748b" }}
                  >
                    {ec >= 3 ? "⬡ Featured" : ec >= 1 ? "✓ Validated" : "0 endorsements yet"}
                  </span>
                </div>
                {/* Endorse button */}
                {currentHandle && sanitizeHandle(currentHandle) !== handle ? (
                  endorsedIds.has(selectedProof.id) ? (
                    <div className="mt-3 font-[family-name:var(--font-mono)] text-xs text-emerald-400 text-center">
                      ✓ Endorsed
                    </div>
                  ) : (
                    <>
                    <button
                      onClick={() => {
                        const proofId = selectedProof.id;
                        const optimisticCount = (selectedProof.endorsement_count ?? 0) + 1;
                        // Mise à jour immédiate de l'UI
                        setEndorsedIds((prev) => new Set(prev).add(proofId));
                        setProofs((prev) =>
                          prev.map((p) => p.id === proofId ? { ...p, endorsement_count: optimisticCount } : p)
                        );
                        setSelectedProof((prev) => prev ? { ...prev, endorsement_count: optimisticCount } : prev);
                        // Appel API en arrière-plan
                        fetch("/api/goals", {
                          method: "PUT",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ goal_id: proofId }),
                        }).then(async (res) => {
                          if (res.ok) {
                            const json = await res.json();
                            setProofs((prev) =>
                              prev.map((p) => p.id === proofId ? { ...p, endorsement_count: json.endorsement_count } : p)
                            );
                            setSelectedProof((prev) => prev ? { ...prev, endorsement_count: json.endorsement_count } : prev);
                          }
                        }).catch(() => { /* insert a fonctionné, on garde l'état optimiste */ });
                      }}
                      className="mt-3 w-full font-[family-name:var(--font-mono)] text-xs py-2 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                    >
                      Endorse this proof
                    </button>
                    </>
                  )
                ) : !currentHandle ? (
                  <p className="mt-3 font-[family-name:var(--font-mono)] text-[10px] text-slate-600 text-center">
                    Login to endorse
                  </p>
                ) : null}
                <button
                  onClick={() => setSelectedProof(null)}
                  className="mt-2 font-[family-name:var(--font-mono)] text-xs text-slate-500 hover:text-white text-center transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { DashboardData, WorkProof } from "../../dashboard/_types";
import { ACCENT_HEX } from "../../dashboard/_styles";
import { WORK_PROOF_POINTS } from "../../dashboard/_work-constants";
import { ProofRing } from "../../dashboard/StatsPanel";
import { ProofGrid } from "./ProofGrid";

const REFERRALS_NEEDED = 25;

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

function SocialIcon({ type }: { type: "x" | "github" | "site" }) {
  if (type === "x") return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" /></svg>
  );
  if (type === "github") return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" /></svg>
  );
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" /></svg>
  );
}

// Canonical profile renderer — shared by the dashboard ID tab (owner) and the
// public /p/[handle] page. WYSIWYG: what the owner edits is what visitors see.
export function ProfileView({
  data,
  proofs,
  owner,
  accent = "cyan",
  referralCount = 0,
  currentHandle,
  refParam,
  isPublic = true,
  onMakePublic,
  onRingClick,
  analysisOpen,
  onToggleAnalysis,
  cardSlot,
  canReclaim,
  onReanalyze,
}: {
  data: DashboardData;
  proofs: WorkProof[];
  owner: boolean;
  accent?: string;
  referralCount?: number;
  currentHandle?: string;
  refParam?: string | null;
  isPublic?: boolean;
  onMakePublic?: () => Promise<void> | void;
  onRingClick?: (type: "social" | "builder", value: number, color: string) => void;
  analysisOpen?: boolean;
  onToggleAnalysis?: () => void;
  cardSlot?: React.ReactNode;
  canReclaim?: boolean;
  onReanalyze?: () => void;
}) {
  const accentHex = ACCENT_HEX[accent] ?? "#c9a84c";
  const handle = data.handle;
  const totalScore = data.total_score ?? (data.score + (data.bonus_points ?? 0));
  const claimHref = refParam ? `/darkroom-id?ref=${encodeURIComponent(refParam)}` : "/darkroom-id";

  const [localProofs, setLocalProofs] = useState<WorkProof[]>(proofs);
  const [selectedProof, setSelectedProof] = useState<WorkProof | null>(null);
  const [endorsedIds, setEndorsedIds] = useState<Set<string>>(new Set());
  const [shareCopied, setShareCopied] = useState(false);
  const [privateModalOpen, setPrivateModalOpen] = useState(false);
  const [makingPublic, setMakingPublic] = useState(false);

  useEffect(() => { setLocalProofs(proofs); }, [proofs]);

  const ringColor = "rgba(255,255,255,0.75)";

  const copyProfileLink = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/p/${handle}${currentHandle ? `?ref=${currentHandle}` : ""}`;
    try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  // Owner with a private profile → confirm switching to public before copying
  const onShareClick = () => {
    if (owner && !isPublic) { setPrivateModalOpen(true); return; }
    copyProfileLink();
  };

  const confirmMakePublic = async () => {
    if (makingPublic) return;
    setMakingPublic(true);
    try {
      await onMakePublic?.();
      setPrivateModalOpen(false);
      await copyProfileLink();
    } finally {
      setMakingPublic(false);
    }
  };

  const endorse = (proofId: string) => {
    const target = localProofs.find((p) => p.id === proofId);
    const optimistic = (target?.endorsement_count ?? 0) + 1;
    setEndorsedIds((prev) => new Set(prev).add(proofId));
    const apply = (count: number) => {
      setLocalProofs((prev) => prev.map((p) => p.id === proofId ? { ...p, endorsement_count: count } : p));
      setSelectedProof((prev) => prev && prev.id === proofId ? { ...prev, endorsement_count: count } : prev);
    };
    apply(optimistic);
    fetch("/api/goals", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal_id: proofId }),
    }).then(async (res) => {
      if (res.ok) { const json = await res.json(); if (json.endorsement_count !== undefined) apply(json.endorsement_count); }
    }).catch(() => { /* keep optimistic state */ });
  };

  return (
    <div className="relative">
      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute top-0 left-0 w-[500px] h-[500px] -translate-x-1/3 -translate-y-1/3"
        style={{ background: "radial-gradient(circle, rgba(103,232,249,0.06) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 w-[500px] h-[500px] translate-x-1/3 translate-y-1/3"
        style={{ background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto" style={{ maxWidth: 820 }}>

        {/* ── Profile band (rectangle): identity · bio+socials+badges · rings ── */}
        <div
          className="relative border border-white/[0.08] rounded-2xl bg-white/[0.02] px-5 py-5"
          style={{ boxShadow: "0 12px 50px rgba(0,0,0,0.4)" }}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-5">

            {/* LEFT — identity */}
            <div className="flex flex-col items-center text-center gap-2 flex-shrink-0 md:w-[160px]">
              <ProfileImage url={data.profile_image_url} handle={handle} size={76} />
              <div className="flex flex-col items-center">
                <h1 className="text-lg font-medium text-white tracking-tight leading-tight">@{handle}</h1>
                <p className="font-[family-name:var(--font-mono)] text-[11px] text-slate-500">{data.archetype}</p>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-[family-name:var(--font-mono)] text-[8px] tracking-[0.25em] uppercase" style={{ color: "rgba(201,168,76,0.6)" }}>Score</span>
                <span className="text-xl font-bold leading-none" style={{ color: "#c9a84c" }}>{totalScore}</span>
              </div>
            </div>

            {/* MIDDLE — bio + socials + badges */}
            <div className="flex-1 min-w-0 flex flex-col gap-3 md:border-l md:border-white/[0.06] md:pl-5">
              {data.bio ? (
                <p className="text-sm text-slate-300 leading-relaxed">{data.bio}</p>
              ) : data.tagline ? (
                <p className="text-sm text-slate-400 italic leading-relaxed">{data.tagline}</p>
              ) : null}

              {(data.link_x || data.link_github || data.link_site) && (
                <div className="flex items-center gap-2">
                  {([
                    { url: data.link_x, type: "x" as const },
                    { url: data.link_github, type: "github" as const },
                    { url: data.link_site, type: "site" as const },
                  ]).filter((l) => l.url).map((l) => (
                    <a
                      key={l.type}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 flex items-center justify-center rounded-sm border border-white/10 text-slate-400 hover:text-white hover:border-white/30 transition-all"
                    >
                      <SocialIcon type={l.type} />
                    </a>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                {data.streak && data.streak.current_streak > 0 && (
                  <span className="font-[family-name:var(--font-mono)] text-[11px] px-2 py-0.5 rounded-full border border-white/[0.08] bg-white/[0.04] text-white/70">
                    🔥 {data.streak.current_streak}d
                  </span>
                )}
                {data.is_og && (
                  <span className="font-[family-name:var(--font-mono)] text-[11px] px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-400 bg-amber-500/10">
                    ◈ OG Builder
                  </span>
                )}
                {referralCount >= 1 && (
                  <span className="font-[family-name:var(--font-mono)] text-[11px] px-2 py-0.5 rounded-full border border-[#00d4aa]/40 bg-[#00d4aa]/10" style={{ color: "#00d4aa" }}>
                    ◈ referrer
                  </span>
                )}
                {data.open_to_opportunities && (
                  <span className="font-[family-name:var(--font-mono)] text-[11px] px-2 py-0.5 rounded-sm border border-[#c9a84c]/40 bg-[#c9a84c]/[0.08]" style={{ color: "#c9a84c" }}>
                    ◈ available
                  </span>
                )}
              </div>
            </div>

            {/* RIGHT — 3 compact rings */}
            <div className="flex items-center justify-center gap-3 flex-shrink-0 md:border-l md:border-white/[0.06] md:pl-5">
              <ProofRing
                value={data.social_proof ?? 0} color={ringColor} label="Social" sublabel="Proof" size={76}
                onClick={owner && onRingClick ? () => onRingClick("social", data.social_proof ?? 0, ringColor) : undefined}
              />
              <ProofRing
                value={data.builder_proof ?? 0} color={ringColor} label="Builder" sublabel="Proof" size={76}
                onClick={owner && onRingClick ? () => onRingClick("builder", data.builder_proof ?? 0, ringColor) : undefined}
              />
              <ProofRing value={data.work_proof ?? 0} color="#c9a84c" label="Work" sublabel="Proof" size={76} />
            </div>
          </div>
        </div>

        {/* ── Action row (below band) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onShareClick}
              className="font-[family-name:var(--font-mono)] text-[11px] tracking-widest uppercase text-slate-300 hover:text-white border border-white/10 hover:border-white/25 rounded-sm px-4 py-2 transition-all"
            >
              {shareCopied ? "Link copied!" : "↗ Share profile"}
            </button>
            {owner ? (
              <>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("darkroom:switchTab", { detail: "settings" }))}
                  className="font-[family-name:var(--font-mono)] text-[11px] tracking-widest uppercase text-slate-400 hover:text-white border border-white/10 hover:border-white/25 rounded-sm px-4 py-2 transition-all"
                >
                  Edit profile
                </button>
                {data.analysis && (
                  <button
                    onClick={onToggleAnalysis}
                    className="font-[family-name:var(--font-mono)] text-[11px] tracking-widest uppercase text-slate-400 hover:text-white border border-white/10 hover:border-white/25 rounded-sm px-4 py-2 transition-all"
                  >
                    Analysis
                  </button>
                )}
              </>
            ) : (
              data.open_to_opportunities && (
                <a
                  href={`https://x.com/${handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-[family-name:var(--font-mono)] text-[11px] tracking-widest uppercase px-4 py-2 rounded-sm border border-[#c9a84c]/40 hover:border-[#c9a84c]/70 transition-colors"
                  style={{ color: "#c9a84c" }}
                >
                  Contact →
                </a>
              )
            )}
          </div>

          {owner && (
            <div className="flex flex-col gap-1 min-w-[180px] flex-1 max-w-xs">
              <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (referralCount / REFERRALS_NEEDED) * 100)}%`, background: "#00d4aa" }} />
              </div>
              <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-600 text-right">
                {referralCount >= REFERRALS_NEEDED ? "✓ Second Brain unlocked" : `${referralCount}/${REFERRALS_NEEDED} → unlock Second Brain`}
              </p>
            </div>
          )}
        </div>

        {/* ── Work gallery ── */}
        <div className="mt-10">
          <p className="font-[family-name:var(--font-mono)] text-xs text-white/40 tracking-[0.2em] uppercase mb-4">Work</p>
          <ProofGrid
            proofs={localProofs}
            accentHex={accentHex}
            onSelect={setSelectedProof}
            emptyLabel={owner ? "No work yet — submit your first proof in the Work tab." : "No public work yet."}
          />
        </div>

        {/* ── Owner-only: shareable card + re-analyze (below proofs) ── */}
        {owner && (
          <div className="mt-10 flex flex-col gap-4">
            {cardSlot}
            {canReclaim && onReanalyze && (
              <button
                onClick={onReanalyze}
                className="w-full rounded-sm border border-white/[0.07] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04] py-3 font-[family-name:var(--font-mono)] text-xs text-white/55 hover:text-white transition-all tracking-widest uppercase"
              >
                ↻ Re-analyze my ID
              </button>
            )}
          </div>
        )}

        {/* ── Public footer ── */}
        {!owner && (
          <div className="flex justify-center mt-10">
            <a href={claimHref} className="font-[family-name:var(--font-mono)] text-xs text-cyan-400/60 hover:text-cyan-400 transition-colors">
              Get your Darkroom ID →
            </a>
          </div>
        )}
      </div>

      {/* ── Private-profile gate modal (owner) ── */}
      {privateModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4"
          onClick={() => setPrivateModalOpen(false)}
        >
          <div
            className="relative max-w-sm w-full bg-[#0c0c14] border border-white/[0.08] rounded-xl p-6 flex flex-col gap-4"
            style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg" style={{ color: "#c9a84c" }}>🔒</span>
              <h3 className="text-white font-bold text-base">Your profile is private</h3>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              Nobody can see <span className="text-white/80">/p/{handle}</span> while it&apos;s private. Make it public to share your link?
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setPrivateModalOpen(false)}
                className="font-[family-name:var(--font-mono)] text-[11px] tracking-widest uppercase text-white/40 hover:text-white/75 px-3 py-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmMakePublic}
                disabled={makingPublic}
                className="font-[family-name:var(--font-mono)] text-[11px] tracking-widest uppercase px-4 py-2 rounded-sm border transition-all disabled:opacity-40"
                style={{ borderColor: "#c9a84c", color: "#0a0a0a", backgroundColor: "#c9a84c" }}
              >
                {makingPublic ? "Publishing…" : "Make public & copy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Analysis modal (owner) ── */}
      {owner && analysisOpen && data.analysis && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4 py-8 overflow-y-auto"
          onClick={onToggleAnalysis}
        >
          <div
            className="relative max-w-lg w-full bg-[#0c0c14] border border-white/[0.08] rounded-xl my-auto"
            style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative p-7 flex flex-col gap-3 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-mono)] text-xs tracking-[0.25em] uppercase" style={{ color: "#c9a84c" }}>Analysis</span>
                <button onClick={onToggleAnalysis} className="text-white/40 hover:text-white text-xl leading-none transition-colors">×</button>
              </div>
              <p className="text-sm text-slate-200 leading-7">{data.analysis}</p>
              {data.darkroom_line && (
                <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.1em] text-white/75 italic mt-2 pt-3 border-t border-white/5">{data.darkroom_line}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Proof detail modal (with endorse for visitors) ── */}
      {selectedProof && (() => {
        const ec = selectedProof.endorsement_count ?? 0;
        const sanitizedCurrent = currentHandle ?? "";
        const canEndorse = !owner && !!sanitizedCurrent && sanitizedCurrent !== handle;
        return (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={() => setSelectedProof(null)}
          >
            <div className="max-w-lg w-full bg-[#0c0c14] border border-white/10 rounded-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {selectedProof.image_url && (
                <div className="aspect-video w-full">
                  <img src={selectedProof.image_url} alt={selectedProof.goal_text} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-sm border border-white/10 text-white/55">{selectedProof.proof_type}</span>
                  <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/30">
                    {new Date(selectedProof.completed_at ?? selectedProof.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <h3 className="text-white font-bold text-lg">{selectedProof.goal_text}</h3>
                {selectedProof.description && <p className="text-white/55 text-sm leading-relaxed">{selectedProof.description}</p>}
                {selectedProof.proof_value && (
                  <a href={selectedProof.proof_value} target="_blank" rel="noopener noreferrer" className="font-[family-name:var(--font-mono)] text-xs text-[#c9a84c]/70 hover:text-[#c9a84c] hover:underline truncate">
                    {selectedProof.proof_value}
                  </a>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="font-[family-name:var(--font-mono)] text-xs text-white/40">{ec} endorsement{ec !== 1 ? "s" : ""}</span>
                  <span className="font-[family-name:var(--font-mono)] text-xs" style={{ color: ec >= 3 ? "#c9a84c" : "#64748b" }}>
                    {ec >= 6 ? "⬡ Featured" : ec >= 3 ? "✓ Validated" : `${Math.max(0, 3 - ec)} more needed`}
                  </span>
                </div>
                <p className="font-[family-name:var(--font-mono)] text-xs text-white/30">
                  Worth {WORK_PROOF_POINTS[selectedProof.proof_type] ?? 3} pts · {ec >= 3 ? "Full value" : "Half value until validated"}
                </p>
                {canEndorse && (
                  endorsedIds.has(selectedProof.id) ? (
                    <div className="mt-1 font-[family-name:var(--font-mono)] text-xs text-emerald-400 text-center">✓ Endorsed</div>
                  ) : (
                    <button
                      onClick={() => endorse(selectedProof.id)}
                      className="mt-1 w-full font-[family-name:var(--font-mono)] text-xs py-2 rounded-sm border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                    >
                      Endorse this proof
                    </button>
                  )
                )}
                {!owner && !sanitizedCurrent && (
                  <p className="mt-1 font-[family-name:var(--font-mono)] text-[10px] text-slate-600 text-center">Login to endorse</p>
                )}
                <button
                  onClick={() => setSelectedProof(null)}
                  className="mt-1 font-[family-name:var(--font-mono)] text-xs text-white/40 hover:text-white text-center transition-colors"
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

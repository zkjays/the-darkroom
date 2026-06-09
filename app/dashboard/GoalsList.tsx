"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGoals } from "@/app/lib/useGoals";
import type { Goal } from "@/app/lib/useGoals";
import { STATS } from "./_types";
import type { XpResult } from "./_types";

// ── Template (used only in TrendingGoals) ────────────────────────────────
interface Template {
  id: string;
  handle: string;
  goal_text: string;
  target_stat: Goal["target_stat"];
  proof_type: "link" | "screenshot";
  copy_count: number;
}

// ── EndorsementControls ──────────────────────────────────────────────────
export function EndorsementControls({ goal, viewerHandle }: { goal: Goal; viewerHandle: string }) {
  const [endorses, setEndorses] = useState(0);
  const [challenges, setChallenges] = useState(0);
  const [userAction, setUserAction] = useState<"endorse" | "challenge" | null>(null);
  const [busy, setBusy] = useState(false);
  const [showChallengeInput, setShowChallengeInput] = useState(false);
  const [challengeReason, setChallengeReason] = useState("");

  const isOwner = goal.handle === viewerHandle;

  useEffect(() => {
    fetch(`/api/endorsements?goal_id=${goal.id}&viewer=${encodeURIComponent(viewerHandle)}`)
      .then((r) => r.json())
      .then((d) => {
        setEndorses(d.endorses ?? 0);
        setChallenges(d.challenges ?? 0);
        setUserAction(d.user_action ?? null);
      })
      .catch(() => {});
  }, [goal.id, viewerHandle, isOwner]);

  const act = async (type: "endorse" | "challenge", reason?: string) => {
    if (busy || userAction || isOwner) return;
    setBusy(true);
    try {
      const res = await fetch("/api/endorsements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal_id: goal.id, endorser_handle: viewerHandle, type, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setEndorses(data.counts.endorses);
        setChallenges(data.counts.challenges);
        setUserAction(type);
        setShowChallengeInput(false);
        setChallengeReason("");
      }
    } finally {
      setBusy(false);
    }
  };

  if (isOwner) {
    return (
      <div className="flex items-center gap-3 pt-1">
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/35">
          <span className="text-emerald-500/50">✓ {endorses}</span>
          <span className="text-slate-500 mx-1.5">·</span>
          <span className="text-red-400/50">⚠ {challenges}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-center gap-2">
        <button
          disabled={busy || !!userAction}
          onClick={() => act("endorse")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all ${
            userAction === "endorse"
              ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
              : "border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {userAction === "endorse" ? "Endorsed ✓" : `✓ Endorse`}
        </button>
        <button
          disabled={busy || !!userAction}
          onClick={() => { if (!userAction) setShowChallengeInput((v) => !v); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all ${
            userAction === "challenge"
              ? "border-red-500/40 text-red-400 bg-red-500/10"
              : "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {userAction === "challenge" ? "Challenged ⚠" : `⚠ Challenge`}
        </button>
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-slate-300 ml-1">
          {endorses > 0 && <span className="text-emerald-500/60">{endorses} ✓</span>}
          {endorses > 0 && challenges > 0 && <span className="text-slate-500 mx-1">·</span>}
          {challenges > 0 && <span className="text-red-400/60">{challenges} ⚠</span>}
        </span>
      </div>

      {showChallengeInput && !userAction && (
        <div className="flex flex-col gap-2">
          <textarea
            autoFocus
            rows={2}
            placeholder="Why are you challenging this? (optional)"
            value={challengeReason}
            onChange={(e) => setChallengeReason(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-red-400/20 resize-none"
          />
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() => act("challenge", challengeReason.trim() || undefined)}
              className="flex-1 rounded-lg bg-red-500/[0.08] border border-red-500/20 py-1.5 text-sm text-red-400 hover:bg-red-500/[0.12] disabled:opacity-40 transition-all"
            >
              {busy ? "Submitting…" : "Submit challenge"}
            </button>
            <button
              onClick={() => { setShowChallengeInput(false); setChallengeReason(""); }}
              className="px-3 rounded-lg border border-white/[0.06] text-xs text-white/35 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="font-[family-name:var(--font-mono)] text-[9px] text-slate-500 leading-relaxed">
            3+ challenges removes points from the goal owner. Use this only if the goal is not credible.
          </p>
        </div>
      )}
    </div>
  );
}

// ── GoalCard ─────────────────────────────────────────────────────────────
export function GoalCard({
  goal, handle, onComplete, onXPGained,
}: {
  goal: Goal; handle: string;
  onComplete: (id: string, proof: string) => Promise<XpResult | null>;
  onXPGained?: (xp: XpResult) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [proofValue, setProofValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [xpFlash, setXpFlash] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const statDef = STATS.find((s) => s.key === goal.target_stat);

  const handleComplete = async () => {
    if (submitting) return;
    let proof = proofValue.trim();
    if (goal.proof_type === "screenshot" && file) {
      setSubmitting(true);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("handle", handle);
        const res = await fetch("/api/upload-proof", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        proof = data.url;
      } catch (e) {
        alert(e instanceof Error ? e.message : "Upload failed");
        setSubmitting(false);
        return;
      }
    }
    if (!proof) return;
    setSubmitting(true);
    try {
      const xpResult = await onComplete(goal.id, proof);
      setXpFlash(true);
      setTimeout(() => setXpFlash(false), 1200);
      setShowProof(false);
      if (xpResult && onXPGained) onXPGained(xpResult);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to complete goal");
    } finally {
      setSubmitting(false);
    }
  };

  if (goal.status === "completed") {
    return (
      <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[#34D399] flex-shrink-0">✓</span>
            <span className="text-sm text-slate-300 truncate line-through">{goal.goal_text}</span>
          </div>
          {statDef && (
            <span
              className="font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ color: statDef.color, backgroundColor: statDef.color + "15" }}
            >
              {statDef.label}
            </span>
          )}
        </div>
        {goal.is_public && <EndorsementControls goal={goal} viewerHandle={handle} />}
        {xpFlash && (
          <span className="absolute right-4 -top-5 font-[family-name:var(--font-mono)] text-xs text-[#FBBF24] animate-bounce">+1 XP</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-slate-500 mt-0.5 flex-shrink-0">○</span>
          <span className="text-sm text-slate-200 leading-snug">{goal.goal_text}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {statDef && (
            <span
              className="font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-full"
              style={{ color: statDef.color, backgroundColor: statDef.color + "15" }}
            >
              {statDef.label}
            </span>
          )}
          <button
            onClick={() => setShowProof((v) => !v)}
            className="font-[family-name:var(--font-mono)] text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            {showProof ? "cancel" : "done →"}
          </button>
        </div>
      </div>
      {showProof && (
        <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.05]">
          <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.15em] text-slate-500 uppercase">
            Submit proof ({goal.proof_type})
          </p>
          {goal.proof_type === "link" ? (
            <input
              type="url" placeholder="https://..."
              value={proofValue} onChange={(e) => setProofValue(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-white/20"
            />
          ) : (
            <div
              className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 cursor-pointer hover:border-white/20 transition-all"
              onClick={() => fileRef.current?.click()}
            >
              <span className="text-slate-400 text-xs">{file ? file.name : "Choose screenshot…"}</span>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          )}
          <button
            disabled={submitting || (goal.proof_type === "link" ? !proofValue.trim() : !file)}
            onClick={handleComplete}
            className="w-full rounded-lg bg-white/[0.06] border border-white/[0.1] py-2 text-xs text-slate-200 hover:text-white/90 hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? "Submitting…" : "Mark complete"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── AddGoalForm ──────────────────────────────────────────────────────────
export function AddGoalForm({
  onAdd, defaultPublic,
}: {
  onAdd: (text: string, proof: "link" | "screenshot", stat: Goal["target_stat"], isPublic: boolean) => Promise<void>;
  defaultPublic: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [stat, setStat] = useState<Goal["target_stat"]>("focus");
  const [proofType, setProofType] = useState<"link" | "screenshot">("link");
  const [isPublic, setIsPublic] = useState(defaultPublic);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd(text.trim(), proofType, stat, isPublic);
      setText("");
      setOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add goal");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border border-dashed border-white/[0.08] rounded-xl py-3 text-xs text-slate-500 hover:text-slate-300 hover:border-white/[0.15] transition-all"
      >
        + add goal
      </button>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 flex flex-col gap-3">
      <input
        autoFocus type="text" placeholder="What will you do today?"
        value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/20"
      />
      <div className="flex items-center gap-2 flex-wrap">
        {STATS.map((s) => (
          <button key={s.key} onClick={() => setStat(s.key as Goal["target_stat"])}
            className="font-[family-name:var(--font-mono)] text-[10px] px-2.5 py-1 rounded-full transition-all"
            style={
              stat === s.key
                ? { color: s.color, backgroundColor: s.color + "20", border: `1px solid ${s.color}40` }
                : { color: "rgba(255,255,255,0.25)", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }
            }
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500 uppercase tracking-[0.15em]">Proof:</span>
          {(["link", "screenshot"] as const).map((p) => (
            <button key={p} onClick={() => setProofType(p)}
              className={`font-[family-name:var(--font-mono)] text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                proofType === p ? "border-white/20 text-slate-200 bg-white/[0.06]" : "border-white/[0.06] text-slate-500 hover:text-slate-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsPublic((v) => !v)}
          className={`ml-auto font-[family-name:var(--font-mono)] text-[10px] px-2.5 py-1 rounded-full border transition-all ${
            isPublic ? "border-white/20 text-slate-200 bg-white/[0.06]" : "border-white/[0.06] text-slate-500 hover:text-slate-300"
          }`}
        >
          {isPublic ? "🌍 Public" : "🔒 Private"}
        </button>
      </div>
      {isPublic && (
        <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500 leading-relaxed">
          Public goals can be endorsed and copied by the community
        </p>
      )}
      <div className="flex gap-2">
        <button
          disabled={!text.trim() || saving} onClick={submit}
          className="flex-1 rounded-lg bg-white/[0.06] border border-white/[0.1] py-2 text-xs text-slate-200 hover:text-white/90 hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          {saving ? "Saving…" : "Add goal"}
        </button>
        <button onClick={() => { setOpen(false); setText(""); }}
          className="px-3 rounded-lg border border-white/[0.06] text-xs text-slate-500 hover:text-slate-300 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── TrendingGoals ────────────────────────────────────────────────────────
export function TrendingGoals({
  handle, goalsCount, onUse, accentClass,
}: {
  handle: string; goalsCount: number;
  onUse: (text: string, proof: "link" | "screenshot", stat: Goal["target_stat"], templateId: string) => Promise<void>;
  accentClass: string;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [using, setUsing] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/goals?templates=true&limit=6")
      .then((r) => r.json())
      .then((d) => { setTemplates(d.templates ?? []); })
      .catch((e) => console.error("Trending goals error:", e))
      .finally(() => setLoading(false));
  }, []);

  const handleUse = async (t: Template) => {
    if (goalsCount >= 3 || using) return;
    setUsing(t.id);
    try {
      await onUse(t.goal_text, t.proof_type, t.target_stat, t.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to use goal");
    } finally {
      setUsing(null);
    }
  };

  return (
    <div>
      <div className="mb-3">
        <p className={`font-[family-name:var(--font-mono)] text-xs tracking-[0.25em] ${accentClass} uppercase`}>
          Trending in The Darkroom
        </p>
        <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500 mt-0.5">
          Goals other builders are crushing
        </p>
      </div>

      {loading ? (
        <div className="py-6 flex justify-center">
          <div className="w-4 h-4 rounded-full border border-white/15 border-t-white/40 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-5 py-6 text-center">
          <p className="font-[family-name:var(--font-mono)] text-xs text-slate-500">
            Be the first to share a public goal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.filter((t) => t.handle !== handle).map((t) => {
            const statDef = STATS.find((s) => s.key === t.target_stat);
            const isUsing = using === t.id;
            return (
              <div key={t.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-3 hover:border-white/[0.1] transition-all">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-slate-200 leading-snug flex-1">{t.goal_text}</p>
                  {statDef && (
                    <span className="font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ color: statDef.color, backgroundColor: statDef.color + "15" }}>
                      {statDef.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500">@{t.handle}</span>
                    {t.copy_count > 0 && (
                      <span className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500">
                        · Copied {t.copy_count}×
                      </span>
                    )}
                  </div>
                  <button
                    disabled={goalsCount >= 3 || !!using}
                    onClick={() => handleUse(t)}
                    className="font-[family-name:var(--font-mono)] text-[10px] text-slate-300 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    {isUsing ? "Adding…" : "+ Use this"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── DailyGoals ───────────────────────────────────────────────────────────
export function DailyGoals({
  handle, streak, defaultPublic, onXPGained, onGoalCompleted, accentClass,
}: {
  handle: string;
  streak: { current_streak: number } | null;
  defaultPublic: boolean;
  onXPGained: (xp: XpResult) => void;
  onGoalCompleted?: () => void;
  accentClass: string;
}) {
  const { goals, loading, addGoal, completeGoal } = useGoals(handle);
  const completed = goals.filter((g) => g.status === "completed").length;
  const canAdd = goals.length < 3;

  const handleComplete = useCallback(
    async (id: string, proof: string) => {
      const result = await completeGoal(id, proof);
      onGoalCompleted?.();
      return result;
    },
    [completeGoal, onGoalCompleted]
  );

  const handleAdd = useCallback(
    async (text: string, proof: "link" | "screenshot", stat: Goal["target_stat"], isPublic: boolean) => {
      await addGoal(text, proof, stat, isPublic);
    },
    [addGoal]
  );

  const handleUseTemplate = useCallback(
    async (text: string, proof: "link" | "screenshot", stat: Goal["target_stat"], templateId: string) => {
      await addGoal(text, proof, stat, false, templateId);
    },
    [addGoal]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className={`font-[family-name:var(--font-mono)] text-xs tracking-[0.25em] ${accentClass} uppercase`}>
            Daily Goals
          </p>
          <div className="flex items-center gap-3">
            {streak && streak.current_streak > 0 && (
              <span className="font-[family-name:var(--font-mono)] text-xs text-slate-400">
                🔥 {streak.current_streak} day streak
              </span>
            )}
            <span className="font-[family-name:var(--font-mono)] text-xs text-slate-500">
              {completed}/3 today
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {loading && goals.length === 0 ? (
            <div className="py-4 text-center">
              <div className="w-4 h-4 rounded-full border border-white/15 border-t-white/40 animate-spin mx-auto" />
            </div>
          ) : (
            <>
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} handle={handle} onComplete={handleComplete} onXPGained={onXPGained} />
              ))}
              {canAdd && <AddGoalForm onAdd={handleAdd} defaultPublic={defaultPublic} />}
              {!canAdd && completed < 3 && (
                <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500 text-center py-1">
                  3 goals set · complete them to earn XP
                </p>
              )}
              {completed === 3 && (
                <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#34D399]/60 text-center py-1">
                  All goals complete — well done.
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <TrendingGoals handle={handle} goalsCount={goals.length} onUse={handleUseTemplate} accentClass={accentClass} />
    </div>
  );
}

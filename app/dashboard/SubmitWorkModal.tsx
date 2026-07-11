"use client";

import { useState } from "react";
import { ACCENT_HEX } from "./_styles";
import { BUILDER_PROOF_TYPES, SOCIAL_PROOF_TYPES, WORK_PROOF_POINTS, type ProofCategory } from "./_work-constants";
import type { WorkProof, XpResult } from "./_types";

const TOTAL_STEPS = 6;
const STEP_LABELS = ["Category", "Link", "Title", "Cover", "Details", "Review"];

const isSafeHttpUrl = (u?: string | null): u is string => !!u && /^https?:\/\//i.test(u);

// "Create post" style modal — step-by-step wizard.
// Link-first: pasting the proof URL auto-fills title + cover (fetchOG),
// so the later steps are mostly confirmation. Editorial-dark styling.
export function SubmitWorkModal({
  handle,
  accent,
  goalsPublic,
  onClose,
  onSubmitted,
}: {
  handle: string;
  accent: string;
  goalsPublic: boolean;
  onClose: () => void;
  onSubmitted: (proof: WorkProof, xp?: XpResult) => void;
}) {
  const accentHex = ACCENT_HEX[accent] ?? "#c9a84c";
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<ProofCategory | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [proofType, setProofType] = useState("Ship");
  const [dateBuilt, setDateBuilt] = useState("");
  const [description, setDescription] = useState("");
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [ogLoading, setOgLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isPublic, setIsPublic] = useState(goalsPublic);
  const [submitting, setSubmitting] = useState(false);

  const fetchOG = async (rawUrl: string) => {
    if (!rawUrl.trim()) return;
    setOgLoading(true);
    try {
      const res = await fetch(`/api/fetch-og?url=${encodeURIComponent(rawUrl)}`);
      const data = await res.json();
      if (data.image) setOgImage(data.image);
      if (data.title && !title) setTitle(data.title.slice(0, 60));
    } catch { /* ignore */ } finally {
      setOgLoading(false);
    }
  };

  const uploadCover = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large (max 5MB)");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("handle", handle);
      const res = await fetch("/api/upload-proof", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setOgImage(data.url as string);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!title.trim() || !url.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle,
          goal_text: title.trim(),
          proof_type: proofType,
          proof_value: url.trim(),
          target_stat: "work_proof",
          is_public: isPublic,
          image_url: ogImage ?? null,
          description: description.trim() || null,
          completed_at: dateBuilt || null,
          xp_reward: WORK_PROOF_POINTS[proofType] ?? 3,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      onSubmitted(data.goal as WorkProof, data.xp);
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const selectCategory = (cat: ProofCategory) => {
    setCategory(cat);
    setProofType(cat === "social" ? "Post" : "Ship");
  };

  const typesForCategory = category === "social" ? SOCIAL_PROOF_TYPES : BUILDER_PROOF_TYPES;

  // Per-step gate for the Next button (optional steps always pass).
  const canAdvance =
    step === 1 ? category !== null :
    step === 2 ? url.trim().length > 0 :
    step === 3 ? title.trim().length > 0 :
    true;

  const goNext = async () => {
    if (!canAdvance) return;
    // Leaving the link step → fetch the OG preview before showing title/cover.
    if (step === 2 && !ogImage && !title) await fetchOG(url);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const labelCls = "block font-[family-name:var(--font-mono)] text-[10px] text-white/40 uppercase tracking-widest mb-2";
  const inputCls = "w-full bg-white/[0.04] border border-white/[0.10] rounded-sm px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#c9a84c]/40 transition-colors";

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center px-4 py-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full bg-[#0c0c14] border border-white/[0.08] rounded-xl my-auto"
        style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* soft halo */}
        <div className="pointer-events-none absolute -inset-px rounded-xl" style={{ boxShadow: `inset 0 0 60px ${accentHex}0c` }} />

        <div className="relative p-8 flex flex-col gap-6 max-h-[85vh] overflow-y-auto">
          {/* Header + progress */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-[family-name:var(--font-mono)] text-xs tracking-[0.2em] uppercase text-white/55">New work proof</span>
              <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest uppercase text-white/30">
                {step}/{TOTAL_STEPS} · {STEP_LABELS[step - 1]}
              </span>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none transition-colors">×</button>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ backgroundColor: i < step ? accentHex : "rgba(255,255,255,0.10)" }}
              />
            ))}
          </div>

          {/* ── STEP 1 — Category ── */}
          {step === 1 && (
            <div className="flex flex-col gap-3">
              <label className={labelCls}>What are you proving?</label>
              <div className="grid grid-cols-2 gap-3">
                {(["builder", "social"] as const).map((cat) => {
                  const isBuilder = cat === "builder";
                  const selected = category === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => selectCategory(cat)}
                      className="flex flex-col items-start gap-2 p-4 rounded-sm border transition-all text-left"
                      style={
                        selected
                          ? { borderColor: `${accentHex}50`, backgroundColor: `${accentHex}10` }
                          : { borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)" }
                      }
                    >
                      <span className="text-xl" style={{ color: selected ? accentHex : "rgba(255,255,255,0.25)" }}>
                        {isBuilder ? "◆" : "◉"}
                      </span>
                      <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-widest uppercase" style={{ color: selected ? accentHex : "rgba(255,255,255,0.55)" }}>
                        {isBuilder ? "Builder" : "Social"}
                      </span>
                      <span className="font-[family-name:var(--font-mono)] text-[9px] text-white/30 leading-relaxed">
                        {isBuilder ? "Projects, code, client work" : "Posts, articles, content"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 2 — Link (the proof) ── */}
          {step === 2 && (
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelCls}>Link to your proof</label>
                <input
                  type="url"
                  autoFocus
                  placeholder="https://…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") goNext(); }}
                  className={inputCls}
                />
                <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 mt-2">
                  a proof is a link — we&apos;ll pull the title and cover for you.
                </p>
                {ogLoading && <p className="font-[family-name:var(--font-mono)] text-xs text-white/55 mt-1">Fetching preview…</p>}
              </div>
            </div>
          )}

          {/* ── STEP 3 — Title + Type ── */}
          {step === 3 && (
            <div className="flex flex-col gap-6">
              <div>
                <label className={labelCls}>Title</label>
                <input
                  type="text"
                  autoFocus
                  placeholder={category === "social" ? "What did you publish?" : "What did you build?"}
                  value={title}
                  maxLength={60}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputCls}
                />
                <span className="block text-right font-[family-name:var(--font-mono)] text-[10px] text-white/30 mt-1">{title.length}/60</span>
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <div className="flex gap-2 flex-wrap">
                  {typesForCategory.map((type) => (
                    <button
                      key={type}
                      onClick={() => setProofType(type)}
                      className="font-[family-name:var(--font-mono)] text-[10px] px-2.5 py-1 rounded-sm transition-all"
                      style={
                        proofType === type
                          ? { color: accentHex, border: `1px solid ${accentHex}40`, backgroundColor: accentHex + "15" }
                          : { color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent" }
                      }
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4 — Cover ── */}
          {step === 4 && (
            <div>
              <label className={labelCls}>Cover image</label>
              {ogImage ? (
                <div className="relative rounded-sm overflow-hidden aspect-square bg-[#0c0c14] w-full max-w-[260px] mx-auto">
                  <img src={ogImage} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setOgImage(null)}
                    aria-label="Remove image"
                    className="absolute top-2 right-2 text-white/55 hover:text-white bg-black/70 rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-3 cursor-pointer rounded-sm border border-dashed border-white/[0.12] hover:border-[#c9a84c]/30 bg-white/[0.02] hover:bg-[#c9a84c]/[0.02] transition-all aspect-square w-full max-w-[260px] mx-auto">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      uploadCover(file);
                    }}
                  />
                  <span className="text-2xl opacity-20">↑</span>
                  <div className="text-center">
                    <p className="font-[family-name:var(--font-mono)] text-xs text-white/55">{uploading ? "Uploading…" : "Drop your cover"}</p>
                    <p className="font-[family-name:var(--font-mono)] text-[9px] text-white/30 mt-1">1080 × 1080 · square · max 5MB</p>
                  </div>
                </label>
              )}
              <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 mt-3 text-center">optional — you can skip this</p>
            </div>
          )}

          {/* ── STEP 5 — Details (description + date) ── */}
          {step === 5 && (
            <div className="flex flex-col gap-6">
              <div className="relative">
                <label className={labelCls}>Description</label>
                <textarea
                  autoFocus
                  placeholder="Tell us more (optional)"
                  value={description}
                  maxLength={280}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
                <span className="absolute right-3 bottom-3 font-[family-name:var(--font-mono)] text-xs text-white/55 pointer-events-none">{description.length}/280</span>
              </div>
              <div>
                <label className={labelCls}>When did you build this?</label>
                <input
                  type="date"
                  value={dateBuilt}
                  onChange={(e) => setDateBuilt(e.target.value)}
                  className="bg-white/[0.04] border border-white/[0.10] rounded-sm px-3 py-2 text-sm text-white outline-none focus:border-[#c9a84c]/40 transition-colors"
                />
              </div>
            </div>
          )}

          {/* ── STEP 6 — Review + Publish ── */}
          {step === 6 && (
            <div className="flex flex-col gap-5">
              <div className="flex gap-4">
                {ogImage ? (
                  <img src={ogImage} alt="" className="w-20 h-20 rounded-sm object-cover flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-sm bg-white/[0.04] border border-white/[0.08] flex-shrink-0 flex items-center justify-center text-white/20 text-xl">—</div>
                )}
                <div className="min-w-0 flex flex-col gap-1">
                  <p className="text-sm text-white font-medium truncate">{title || "Untitled"}</p>
                  <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest" style={{ color: accentHex }}>{proofType}{dateBuilt ? ` · ${dateBuilt}` : ""}</p>
                  {isSafeHttpUrl(url) ? (
                    <a href={url} target="_blank" rel="noreferrer" className="font-[family-name:var(--font-mono)] text-[10px] text-white/40 truncate hover:text-white/70 transition-colors">{url}</a>
                  ) : (
                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/40 truncate">{url}</span>
                  )}
                  {description && <p className="text-xs text-white/55 line-clamp-2 mt-1">{description}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
                <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/55">Public</span>
                <button
                  onClick={() => setIsPublic((v) => !v)}
                  className={`flex-shrink-0 w-10 h-5 rounded-sm border transition-all duration-200 relative ${
                    isPublic ? "border-[#c9a84c]/50 bg-[#c9a84c]/10" : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-none transition-all duration-200 ${isPublic ? "left-[22px] bg-[#c9a84c]" : "left-0.5 bg-white/30"}`} />
                </button>
              </div>
            </div>
          )}

          {/* ── Footer nav ── */}
          <div className="flex items-center gap-3 pt-2">
            {step > 1 && (
              <button
                onClick={goBack}
                disabled={submitting}
                className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest px-4 py-3 rounded-sm border border-white/[0.10] text-white/50 hover:text-white hover:border-white/20 transition-all disabled:opacity-30"
              >
                ← Back
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                onClick={goNext}
                disabled={!canAdvance || ogLoading}
                className="flex-1 font-[family-name:var(--font-mono)] text-sm py-3 rounded-sm border transition-all tracking-widest uppercase disabled:opacity-25 disabled:cursor-not-allowed"
                style={
                  !canAdvance || ogLoading
                    ? { borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)", backgroundColor: "transparent" }
                    : { borderColor: "#c9a84c", color: "#0a0a0a", backgroundColor: "#c9a84c" }
                }
              >
                {ogLoading ? "Fetching…" : (step === 4 || step === 5) && canAdvance ? "Next / Skip →" : "Next →"}
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!title.trim() || !url.trim() || submitting}
                className="flex-1 font-[family-name:var(--font-mono)] text-sm py-3 rounded-sm border transition-all tracking-widest uppercase disabled:opacity-25 disabled:cursor-not-allowed"
                style={
                  !title.trim() || !url.trim() || submitting
                    ? { borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)", backgroundColor: "transparent" }
                    : { borderColor: "#c9a84c", color: "#0a0a0a", backgroundColor: "#c9a84c" }
                }
              >
                {submitting ? "Publishing…" : `Publish — +${WORK_PROOF_POINTS[proofType] ?? 3} pts`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

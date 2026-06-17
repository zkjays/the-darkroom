"use client";

import { useState } from "react";
import { ACCENT_HEX } from "./_styles";
import { WORK_PROOF_TYPES, WORK_PROOF_POINTS } from "./_work-constants";
import type { WorkProof, XpResult } from "./_types";

// "Create post" style modal — extracted from WorkTab's inline form.
// Editorial-dark: floating card, soft border, monospace labels, square cover.
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
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [proofType, setProofType] = useState("Ship");
  const [dateBuilt, setDateBuilt] = useState("");
  const [description, setDescription] = useState("");
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [ogLoading, setOgLoading] = useState(false);
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
          <div className="flex items-center justify-between">
            <span className="font-[family-name:var(--font-mono)] text-xs tracking-[0.2em] uppercase text-white/55">New work proof</span>
            <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none transition-colors">×</button>
          </div>

          {/* Title */}
          <div>
            <label className="block font-[family-name:var(--font-mono)] text-[10px] text-white/40 uppercase tracking-widest mb-2">Title</label>
            <input
              type="text"
              placeholder="What did you build?"
              value={title}
              maxLength={60}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.10] rounded-sm px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#c9a84c]/40 transition-colors"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block font-[family-name:var(--font-mono)] text-[10px] text-white/40 uppercase tracking-widest mb-2">Link</label>
            <input
              type="url"
              placeholder="Link to your work"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={(e) => fetchOG(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.10] rounded-sm px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#c9a84c]/40 transition-colors"
            />
            {ogLoading && <p className="font-[family-name:var(--font-mono)] text-xs text-white/55 mt-1">Fetching preview…</p>}
          </div>

          {/* Type tags */}
          <div>
            <label className="block font-[family-name:var(--font-mono)] text-[10px] text-white/40 uppercase tracking-widest mb-3">Type</label>
            <div className="flex gap-2 flex-wrap">
              {WORK_PROOF_TYPES.map((type) => (
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

          {/* Date */}
          <div>
            <label className="block font-[family-name:var(--font-mono)] text-[10px] text-white/40 uppercase tracking-widest mb-2">When did you build this?</label>
            <input
              type="date"
              value={dateBuilt}
              onChange={(e) => setDateBuilt(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.10] rounded-sm px-3 py-2 text-sm text-white outline-none focus:border-[#c9a84c]/40 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="relative">
            <label className="block font-[family-name:var(--font-mono)] text-[10px] text-white/40 uppercase tracking-widest mb-2">Description</label>
            <textarea
              placeholder="Tell us more (optional)"
              value={description}
              maxLength={280}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.10] rounded-sm px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#c9a84c]/40 transition-colors resize-none"
            />
            <span className="absolute right-3 bottom-3 font-[family-name:var(--font-mono)] text-xs text-white/55 pointer-events-none">{description.length}/280</span>
          </div>

          {/* Cover image — square, Instagram-style */}
          <div>
            <label className="block font-[family-name:var(--font-mono)] text-[10px] text-white/40 uppercase tracking-widest mb-2">Cover image</label>
            {ogImage ? (
              <div className="relative rounded-sm overflow-hidden aspect-square bg-[#0c0c14] w-full max-w-[260px]">
                <img src={ogImage} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => setOgImage(null)}
                  className="absolute top-2 right-2 text-white/55 hover:text-white bg-black/70 rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors"
                >
                  ×
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-3 cursor-pointer rounded-sm border border-dashed border-white/[0.12] hover:border-[#c9a84c]/30 bg-white/[0.02] hover:bg-[#c9a84c]/[0.02] transition-all aspect-square w-full max-w-[260px]">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file || file.size > 5 * 1024 * 1024) return;
                    const reader = new FileReader();
                    reader.onload = () => setOgImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
                <span className="text-2xl opacity-20">↑</span>
                <div className="text-center">
                  <p className="font-[family-name:var(--font-mono)] text-xs text-white/55">Drop your cover</p>
                  <p className="font-[family-name:var(--font-mono)] text-[9px] text-white/30 mt-1">1080 × 1080 · square · max 5MB</p>
                </div>
              </label>
            )}
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between">
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

          {/* Publish */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={submit}
              disabled={!title.trim() || !url.trim() || submitting}
              className="w-full font-[family-name:var(--font-mono)] text-sm py-3 rounded-sm border transition-all tracking-widest uppercase disabled:opacity-25 disabled:cursor-not-allowed"
              style={
                !title.trim() || !url.trim() || submitting
                  ? { borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)", backgroundColor: "transparent" }
                  : { borderColor: "#c9a84c", color: "#0a0a0a", backgroundColor: "#c9a84c" }
              }
            >
              {submitting ? "Publishing…" : `Publish — +${WORK_PROOF_POINTS[proofType] ?? 3} pts`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

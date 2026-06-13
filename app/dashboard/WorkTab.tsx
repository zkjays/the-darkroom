"use client";

import { useEffect, useState } from "react";
import { ACCENT_HEX } from "./_styles";
import type { WorkProof, XpResult } from "./_types";

export const WORK_PROOF_TYPES = ["Ship", "Code", "Publish", "Release", "Design"] as const;
export const WORK_PROOF_POINTS: Record<string, number> = {
  Ship: 8, Code: 8, Publish: 5, Release: 5, Design: 5,
  // legacy — keep for existing score recompute
  Project: 8, OSS: 8, Article: 5, Video: 5, Thread: 3, Other: 3,
};
export const WORK_TYPE_ICONS: Record<string, string> = {
  Ship: "⬡", Code: "⌥", Publish: "◈", Release: "▶", Design: "◻",
  // legacy
  Project: "⬡", Article: "◈", Video: "▶", Thread: "◉", OSS: "⌥", Other: "·",
};

export function WorkTab({
  handle, goalsPublic, accentClass: _accentClass, accent, onXPGained, onRecalculated,
}: {
  handle: string;
  goalsPublic: boolean;
  accentClass: string;
  accent: string;
  onXPGained: (xp: XpResult) => void;
  onRecalculated?: () => void;
}) {
  const accentHex = ACCENT_HEX[accent] ?? "#c9a84c";
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [proofType, setProofType] = useState("Ship");
  const [dateBuilt, setDateBuilt] = useState("");
  const [description, setDescription] = useState("");
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [ogLoading, setOgLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(goalsPublic);
  const [submitting, setSubmitting] = useState(false);
  const [works, setWorks] = useState<WorkProof[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [selectedWork, setSelectedWork] = useState<WorkProof | null>(null);
  const [editProof, setEditProof] = useState<WorkProof | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editProofType, setEditProofType] = useState("Ship");
  const [editCompletedAt, setEditCompletedAt] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/goals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recalculate: true }) })
      .then((r) => r.json())
      .then((d) => {
        console.log("[WorkTab] recalculate response:", d);
        if (d.work_proof !== undefined) onRecalculated?.();
      })
      .catch((e) => console.error("[WorkTab] recalculate error:", e));
    fetch(`/api/goals?handle=${encodeURIComponent(handle)}&all=true&completed=true`)
      .then((r) => r.json())
      .then((d) => setWorks(d.goals ?? []))
      .catch(() => {})
      .finally(() => setLoadingWorks(false));
  }, [handle, onRecalculated]);

  const resetForm = () => {
    setFormOpen(false);
    setTitle("");
    setUrl("");
    setProofType("Ship");
    setDateBuilt("");
    setDescription("");
    setOgImage(null);
  };

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

  const openEditModal = (proof: WorkProof) => {
    setEditProof(proof);
    setEditTitle(proof.goal_text);
    setEditUrl(proof.proof_value ?? "");
    setEditProofType(proof.proof_type);
    setEditCompletedAt(proof.completed_at ? proof.completed_at.split("T")[0] : "");
    setEditDescription(proof.description ?? "");
    setEditImageUrl(proof.image_url ?? null);
  };

  const deleteProof = async (id: string) => {
    if (deletingId === id) {
      try {
        const res = await fetch("/api/goals", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ goal_id: id }) });
        if (res.ok) setWorks((prev) => prev.filter((w) => w.id !== id));
      } catch { /* ignore */ } finally {
        setDeletingId(null);
      }
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  const saveEdit = async () => {
    if (!editProof || editSaving) return;
    setEditSaving(true);
    try {
      const res = await fetch("/api/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editProof.id,
          goal_text: editTitle.trim(),
          description: editDescription.trim() || null,
          image_url: editImageUrl,
          proof_type: editProofType,
          completed_at: editCompletedAt || null,
          proof_value: editUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setWorks((prev) => prev.map((w) => w.id === editProof.id ? { ...w, ...(data.goal as WorkProof) } : w));
      setEditProof(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setEditSaving(false);
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
      setWorks((prev) => [data.goal as WorkProof, ...prev]);
      if (data.xp) onXPGained(data.xp);
      resetForm();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-12">

      {/* ── TOP: 2-col grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT: Submit trigger / expanded form */}
        <div>
          {!formOpen ? (
            <div
              onClick={() => setFormOpen(true)}
              className="border border-white/[0.08] rounded-sm p-6 bg-white/[0.02] cursor-pointer hover:border-[#c9a84c]/20 hover:bg-white/[0.03] transition-all flex flex-col items-center justify-center gap-3 min-h-[180px]"
            >
              <span className="text-2xl text-white/40">+</span>
              <span className="font-[family-name:var(--font-mono)] text-sm text-white/55">Submit Your Work</span>
            </div>
          ) : (
            <div className="border border-white/[0.08] rounded-sm p-8 bg-white/[0.02] flex flex-col gap-6">

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
                {ogLoading && (
                  <p className="font-[family-name:var(--font-mono)] text-xs text-white/55 mt-1">Fetching preview…</p>
                )}
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
                <label className="block font-[family-name:var(--font-mono)] text-[10px] text-white/40 uppercase tracking-widest mb-2">
                  When did you build this?
                </label>
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
                <span className="absolute right-3 bottom-3 font-[family-name:var(--font-mono)] text-xs text-white/55 pointer-events-none">
                  {description.length}/280
                </span>
              </div>

              {/* Image upload — square, Instagram-style */}
              <div>
                <label className="block font-[family-name:var(--font-mono)] text-[10px] text-white/40 uppercase tracking-widest mb-2">
                  Cover image
                </label>
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

              {/* Publish — full width, impactful */}
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
                <button
                  onClick={resetForm}
                  className="w-full font-[family-name:var(--font-mono)] text-[10px] text-white/40 hover:text-white/75 transition-colors py-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Connected accounts */}
        <div>
          <p className="font-[family-name:var(--font-mono)] text-xs text-white/40 tracking-widest mb-6">PROOF SYSTEMS</p>
          <div className="flex flex-col gap-4">
            {[
              { icon: "G", label: "GitHub",      description: "Auto-verify repos & PRs",    status: "Coming soon",          active: false },
              { icon: "X", label: "X / Twitter", description: "Verify tweets & threads",    status: "Auto-verified",         active: true  },
              { icon: "◈", label: "Other Links", description: "Community validation",        status: "3 endorsements needed", active: false },
            ].map(({ icon, label, description, status, active }) => (
              <div key={label} className="bg-white/[0.02] border border-white/[0.06] rounded-sm p-4 flex items-center gap-4">
                <div className="w-8 h-8 flex items-center justify-center rounded-sm bg-white/[0.05] border border-white/[0.08] flex-shrink-0">
                  <span className="text-white font-bold text-sm">{icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/40">{description}</p>
                </div>
                <span className={`font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-sm flex-shrink-0 ${
                  active
                    ? "bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/25"
                    : "bg-white/5 text-white/40 border border-white/10"
                }`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOTTOM: Proof gallery — pleine largeur, style Instagram ── */}
      <div className="-mx-6 -mb-8">
        {loadingWorks ? (
          <div className="py-10 flex justify-center">
            <div className="w-4 h-4 rounded-full border border-white/15 border-t-white/40 animate-spin" />
          </div>
        ) : works.length === 0 ? (
          <div className="px-6 pb-6">
            <div className="border border-white/[0.06] rounded-sm px-5 py-10 text-center">
              <p className="font-[family-name:var(--font-mono)] text-xs text-white/40">No work submitted yet. Start building.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 px-0.5 pb-0.5">
            {works.map((proof) => {
              const endorsementCount = proof.endorsement_count ?? 0;
              const isFeatured = endorsementCount >= 6;
              const isValidated = endorsementCount >= 3;
              return (
                <div
                  key={proof.id}
                  onClick={() => setSelectedWork(proof)}
                  className="group relative aspect-square overflow-hidden cursor-pointer bg-[#0e0e12] transition-shadow duration-300"
                  style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.45)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.75)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 10px rgba(0,0,0,0.45)"; }}
                >
                  {/* Image or placeholder */}
                  {proof.image_url ? (
                    <img
                      src={proof.image_url}
                      alt={proof.goal_text}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                      <span className="text-4xl" style={{ color: accentHex, opacity: 0.25 }}>
                        {WORK_TYPE_ICONS[proof.proof_type] ?? "·"}
                      </span>
                      <span className="font-[family-name:var(--font-mono)] text-[8px] tracking-[0.2em]" style={{ color: accentHex, opacity: 0.4 }}>
                        {proof.proof_type?.toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Hover overlay — gradient bas + texte très lisible */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3 gap-1.5"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 50%, transparent 100%)" }}
                  >
                    <p
                      className="text-white font-bold text-base leading-tight line-clamp-2"
                      style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}
                    >
                      {proof.goal_text}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-[family-name:var(--font-mono)] text-[12px] tracking-widest font-semibold" style={{ color: accentHex }}>
                        {WORK_TYPE_ICONS[proof.proof_type] ?? "·"} {proof.proof_type?.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <span
                              key={i}
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: i < endorsementCount ? accentHex : "rgba(255,255,255,0.25)" }}
                            />
                          ))}
                        </div>
                        <span className="font-[family-name:var(--font-mono)] text-[12px] text-white font-semibold">
                          {isFeatured ? "⬡" : isValidated ? "✓" : `${endorsementCount}/3`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Edit / delete */}
                  <div className="absolute top-1.5 left-1.5 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(proof); }}
                      className="bg-black/80 p-1 text-white/60 hover:text-white text-[10px]"
                    >
                      ✎
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteProof(proof.id); }}
                      className={`p-1 text-[10px] ${
                        deletingId === proof.id ? "bg-red-500/80 text-white" : "bg-black/80 text-red-400/50 hover:text-red-400"
                      }`}
                      title={deletingId === proof.id ? "Click again to confirm" : "Delete"}
                    >
                      {deletingId === proof.id ? "?" : "✕"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Proof detail modal */}
      {selectedWork && (() => {
        const endorsementCount = selectedWork.endorsement_count ?? 0;
        return (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={() => { setSelectedWork(null); setShowOriginal(false); }}
          >
            <div
              className="max-w-lg w-full bg-[#0c0c14] border border-white/10 rounded-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedWork.image_url && (
                <div className="aspect-video w-full">
                  <img src={selectedWork.image_url} alt={selectedWork.goal_text} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-sm border border-white/10 text-white/55">
                    {selectedWork.proof_type}
                  </span>
                  {selectedWork.edited && (selectedWork.endorsement_count ?? 0) >= 3 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Edited
                    </span>
                  )}
                  <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/30">
                    {new Date(selectedWork.completed_at ?? selectedWork.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </span>
                </div>
                <h3 className="text-white font-bold text-lg">{selectedWork.goal_text}</h3>
                {selectedWork.edited && (selectedWork.endorsement_count ?? 0) >= 1 && (
                  <button
                    onClick={() => setShowOriginal(true)}
                    className="text-[10px] font-mono text-amber-400/70 hover:text-amber-400 border border-amber-500/20 hover:border-amber-500/40 px-3 py-1.5 rounded-sm transition-all flex items-center gap-1.5"
                  >
                    <span>◈</span> View original submission
                  </button>
                )}
                {selectedWork.description && (
                  <p className="text-white/55 text-sm leading-relaxed">{selectedWork.description}</p>
                )}
                {selectedWork.proof_value && (
                  <a
                    href={selectedWork.proof_value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-[family-name:var(--font-mono)] text-xs text-[#c9a84c]/70 hover:text-[#c9a84c] hover:underline truncate"
                  >
                    {selectedWork.proof_value}
                  </a>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="font-[family-name:var(--font-mono)] text-xs text-white/40">{endorsementCount} endorsements</span>
                  <span
                    className="font-[family-name:var(--font-mono)] text-xs"
                    style={{ color: endorsementCount >= 3 ? "#c9a84c" : "#64748b" }}
                  >
                    {endorsementCount >= 6 ? "⬡ Featured" : endorsementCount >= 3 ? "✓ Validated" : `${3 - endorsementCount} more needed`}
                  </span>
                </div>
                <p className="font-[family-name:var(--font-mono)] text-xs text-white/30">
                  Worth {WORK_PROOF_POINTS[selectedWork.proof_type] ?? 3} pts · {endorsementCount >= 3 ? "Full value" : "Half value until validated"}
                </p>
                <button
                  onClick={() => { setSelectedWork(null); setShowOriginal(false); }}
                  className="mt-2 font-[family-name:var(--font-mono)] text-xs text-white/40 hover:text-white text-center transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Original snapshot modal */}
      {showOriginal && selectedWork && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setShowOriginal(false)}
        >
          <div
            className="max-w-md w-full bg-[#0c0c14] border border-amber-500/20 rounded-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedWork.original_image_url && (
              <div className="aspect-video w-full">
                <img src={selectedWork.original_image_url} alt="Original" className="w-full h-full object-cover opacity-80" />
              </div>
            )}
            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-amber-400/60 tracking-widest">ORIGINAL SUBMISSION</span>
                <button onClick={() => setShowOriginal(false)} className="text-white/40 hover:text-white transition-colors">×</button>
              </div>
              <h3 className="text-white font-bold text-base">{selectedWork.original_goal_text || selectedWork.goal_text}</h3>
              {selectedWork.original_description && (
                <p className="text-white/55 text-sm leading-relaxed">{selectedWork.original_description}</p>
              )}
              <a
                href={selectedWork.original_proof_value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-amber-400 hover:underline truncate"
              >
                {selectedWork.original_proof_value}
              </a>
              <p className="text-[10px] text-white/30 font-mono border-t border-white/5 pt-3">
                Submitted on {new Date(selectedWork.created_at).toLocaleDateString()} · Modified after endorsements
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Edit proof modal */}
      {editProof && (() => {
        const endorsementCount = editProof.endorsement_count ?? 0;
        const ageMs = Date.now() - new Date(editProof.created_at).getTime();
        const isLocked = endorsementCount >= 3 && ageMs > 7 * 24 * 60 * 60 * 1000;
        const urlChanged = editUrl.trim() !== (editProof.proof_value ?? "");

        return (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={() => setEditProof(null)}
          >
            <div
              className="max-w-lg w-full bg-[#0c0c14] border border-white/10 rounded-sm max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="font-[family-name:var(--font-mono)] text-xs text-white/40 tracking-widest">EDIT PROOF</span>
                  <button onClick={() => setEditProof(null)} className="text-white/40 hover:text-white text-xl leading-none transition-colors">×</button>
                </div>

                {isLocked ? (
                  <div className="text-center py-6">
                    <p className="text-white/55 text-sm font-mono">🔒 This proof is locked</p>
                    <p className="text-white/30 text-xs mt-2">Validated proofs are locked 7 days after submission.</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block font-[family-name:var(--font-mono)] text-[10px] text-white/40 uppercase tracking-widest mb-2">Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        maxLength={60}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.10] rounded-sm px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#c9a84c]/40 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block font-[family-name:var(--font-mono)] text-[10px] text-white/40 uppercase tracking-widest mb-2">
                        Link{endorsementCount > 0 && <span className="ml-2 text-white/40 text-xs font-normal">(locked — has endorsements)</span>}
                      </label>
                      <input
                        type="url"
                        value={editUrl}
                        disabled={endorsementCount > 0}
                        onChange={(e) => setEditUrl(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                      {urlChanged && endorsementCount === 0 && (
                        <p className="text-amber-400 text-xs font-mono mt-1">⚠ Changing the URL will reset your endorsements to 0</p>
                      )}
                    </div>

                    <div>
                      <label className="block font-[family-name:var(--font-mono)] text-[10px] text-white/40 uppercase tracking-widest mb-3">Type</label>
                      <div className="flex gap-2 flex-wrap">
                        {WORK_PROOF_TYPES.map((type) => (
                          <button
                            key={type}
                            onClick={() => setEditProofType(type)}
                            className="font-[family-name:var(--font-mono)] text-[10px] px-2.5 py-1 rounded-sm transition-all"
                            style={
                              editProofType === type
                                ? { color: accentHex, border: `1px solid ${accentHex}40`, backgroundColor: accentHex + "15" }
                                : { color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent" }
                            }
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/75 text-sm font-medium mb-1.5">When did you build this?</label>
                      <input
                        type="date"
                        value={editCompletedAt}
                        onChange={(e) => setEditCompletedAt(e.target.value)}
                        className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/85 outline-none focus:border-white/20 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block font-[family-name:var(--font-mono)] text-[10px] text-white/40 uppercase tracking-widest mb-2">Description</label>
                      <textarea
                        value={editDescription}
                        maxLength={280}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                        className="w-full bg-white/[0.04] border border-white/[0.10] rounded-sm px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-[#c9a84c]/40 transition-colors resize-none"
                      />
                    </div>

                    {editImageUrl ? (
                      <div className="relative rounded-sm overflow-hidden aspect-video bg-[#0c0c14]">
                        <img src={editImageUrl} alt="Preview" className="w-full h-full object-cover opacity-70" />
                        <button
                          onClick={() => setEditImageUrl(null)}
                          className="absolute top-2 right-2 text-white/55 hover:text-white bg-black/60 rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 cursor-pointer text-white/75 text-sm hover:text-white transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file || file.size > 2 * 1024 * 1024) return;
                            const reader = new FileReader();
                            reader.onload = () => setEditImageUrl(reader.result as string);
                            reader.readAsDataURL(file);
                          }}
                        />
                        ↑ Upload image
                      </label>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setEditProof(null)}
                        className="font-[family-name:var(--font-mono)] text-xs text-white/40 hover:text-white/75 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={!editTitle.trim() || editSaving}
                        className="font-[family-name:var(--font-mono)] text-xs px-4 py-2 rounded-lg bg-white text-black hover:bg-white/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {editSaving ? "Saving…" : "Save changes"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

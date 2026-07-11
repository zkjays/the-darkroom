"use client";

import { useEffect, useState } from "react";
import { ACCENT_HEX } from "./_styles";
import { WORK_PROOF_POINTS, PROOF_CATEGORY_MAP, BUILDER_PROOF_TYPES, SOCIAL_PROOF_TYPES } from "./_work-constants";
import type { WorkProof, XpResult } from "./_types";
import { ProofGrid } from "../component/profile/ProofGrid";
import { SubmitWorkModal } from "./SubmitWorkModal";

const isSafeHttpUrl = (u?: string | null): u is string => !!u && /^https?:\/\//i.test(u);

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
  const [modalOpen, setModalOpen] = useState(false);
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
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editSaving, setEditSaving] = useState(false);
  const [editUploading, setEditUploading] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/goals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recalculate: true }) })
      .then((r) => r.json())
      .then((d) => { if (d.work_proof !== undefined) onRecalculated?.(); })
      .catch(() => {});
    fetch(`/api/goals?handle=${encodeURIComponent(handle)}&all=true&completed=true`)
      .then((r) => r.json())
      .then((d) => setWorks(d.goals ?? []))
      .catch(() => {})
      .finally(() => setLoadingWorks(false));
  }, [handle, onRecalculated]);

  const openEditModal = (proof: WorkProof) => {
    setEditProof(proof);
    setEditTitle(proof.goal_text);
    setEditUrl(proof.proof_value ?? "");
    setEditProofType(proof.proof_type);
    setEditCompletedAt(proof.completed_at ? proof.completed_at.split("T")[0] : "");
    setEditDescription(proof.description ?? "");
    setEditImageUrl(proof.image_url ?? null);
    setEditIsPublic(proof.is_public ?? true);
  };

  // Close the detail modal automatically once its proof is actually deleted
  // (deletion can be triggered from the grid hover icon or from this modal).
  useEffect(() => {
    if (selectedWork && !works.some((w) => w.id === selectedWork.id)) {
      setSelectedWork(null);
    }
  }, [works, selectedWork]);

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

  const uploadEditCover = async (file: File) => {
    if (!editProof) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large (max 5MB)");
      return;
    }
    setEditUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("handle", handle);
      const res = await fetch("/api/upload-proof", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setEditImageUrl(data.url as string);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setEditUploading(false);
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
          is_public: editIsPublic,
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

  return (
    <div className="space-y-8">

      {/* ── Submit CTA ── */}
      <button
        onClick={() => setModalOpen(true)}
        className="w-full border border-white/[0.08] rounded-xl px-6 py-5 bg-white/[0.02] hover:border-[#c9a84c]/30 hover:bg-white/[0.03] transition-all flex items-center justify-center gap-3 group"
      >
        <span className="text-xl text-white/40 group-hover:text-[#c9a84c] transition-colors">+</span>
        <span className="font-[family-name:var(--font-mono)] text-sm text-white/55 group-hover:text-white tracking-widest uppercase transition-colors">Submit your work</span>
      </button>

      {/* ── Gallery ── */}
      {loadingWorks ? (
        <div className="py-10 flex justify-center">
          <div className="w-4 h-4 rounded-full border border-white/15 border-t-white/40 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/40 tracking-[0.2em] uppercase mb-4">◆ Builder Proof</p>
            <ProofGrid
              proofs={works.filter((w) => (PROOF_CATEGORY_MAP[w.proof_type] ?? "builder") === "builder")}
              accentHex={accentHex}
              onSelect={setSelectedWork}
              onEdit={openEditModal}
              onDelete={deleteProof}
              deletingId={deletingId}
              emptyLabel="No builder proofs yet."
            />
          </div>
          <div>
            <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/40 tracking-[0.2em] uppercase mb-4">◉ Social Proof</p>
            <ProofGrid
              proofs={works.filter((w) => PROOF_CATEGORY_MAP[w.proof_type] === "social")}
              accentHex={accentHex}
              onSelect={setSelectedWork}
              onEdit={openEditModal}
              onDelete={deleteProof}
              deletingId={deletingId}
              emptyLabel="No social proofs yet."
            />
          </div>
        </div>
      )}

      {/* ── Submit modal ── */}
      {modalOpen && (
        <SubmitWorkModal
          handle={handle}
          accent={accent}
          goalsPublic={goalsPublic}
          onClose={() => setModalOpen(false)}
          onSubmitted={(proof, xp) => {
            setWorks((prev) => [proof, ...prev]);
            if (xp) onXPGained(xp);
          }}
        />
      )}

      {/* ── Proof detail modal ── */}
      {selectedWork && (() => {
        const endorsementCount = selectedWork.endorsement_count ?? 0;
        return (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4"
            onClick={() => { setSelectedWork(null); setShowOriginal(false); }}
          >
            <div className="max-w-lg w-full bg-[#0c0c14] border border-white/10 rounded-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {selectedWork.image_url && (
                <div className="aspect-video w-full">
                  <img src={selectedWork.image_url} alt={selectedWork.goal_text} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-sm border border-white/10 text-white/55">{selectedWork.proof_type}</span>
                  {selectedWork.edited && (selectedWork.endorsement_count ?? 0) >= 3 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Edited</span>
                  )}
                  <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/30">
                    {new Date(selectedWork.completed_at ?? selectedWork.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
                {selectedWork.description && <p className="text-white/55 text-sm leading-relaxed">{selectedWork.description}</p>}
                {selectedWork.proof_value && (
                  isSafeHttpUrl(selectedWork.proof_value) ? (
                    <a href={selectedWork.proof_value} target="_blank" rel="noopener noreferrer" className="font-[family-name:var(--font-mono)] text-xs text-[#c9a84c]/70 hover:text-[#c9a84c] hover:underline truncate">
                      {selectedWork.proof_value}
                    </a>
                  ) : (
                    <span className="font-[family-name:var(--font-mono)] text-xs text-[#c9a84c]/70 truncate">
                      {selectedWork.proof_value}
                    </span>
                  )
                )}
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="font-[family-name:var(--font-mono)] text-xs text-white/40">{endorsementCount} plugs</span>
                  <span className="font-[family-name:var(--font-mono)] text-xs" style={{ color: endorsementCount >= 3 ? "#c9a84c" : "#64748b" }}>
                    {endorsementCount >= 6 ? "⬡ Featured" : endorsementCount >= 3 ? "✓ Validated" : `${3 - endorsementCount} more needed`}
                  </span>
                </div>
                <p className="font-[family-name:var(--font-mono)] text-xs text-white/30">
                  Worth {WORK_PROOF_POINTS[selectedWork.proof_type] ?? 3} pts · {endorsementCount >= 3 ? "Full value" : "Half value until validated"}
                </p>
                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                  <button
                    onClick={() => { const w = selectedWork; setSelectedWork(null); openEditModal(w); }}
                    className="flex-1 flex items-center justify-center gap-1.5 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider py-2 rounded-sm border border-white/[0.12] text-white/60 hover:text-white hover:border-white/25 hover:bg-white/[0.04] transition-all"
                  >
                    <span>✎</span> Edit
                  </button>
                  <button
                    onClick={() => deleteProof(selectedWork.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider py-2 rounded-sm border transition-all ${
                      deletingId === selectedWork.id
                        ? "border-red-500/50 bg-red-500/15 text-red-300"
                        : "border-red-500/25 text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.06] hover:border-red-500/40"
                    }`}
                  >
                    <span>✕</span> {deletingId === selectedWork.id ? "Confirm?" : "Delete"}
                  </button>
                  <button
                    onClick={() => { setSelectedWork(null); setShowOriginal(false); }}
                    className="flex-1 flex items-center justify-center font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider py-2 rounded-sm border border-white/[0.08] text-white/40 hover:text-white hover:border-white/20 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Original snapshot modal ── */}
      {showOriginal && selectedWork && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setShowOriginal(false)}
        >
          <div className="max-w-md w-full bg-[#0c0c14] border border-amber-500/20 rounded-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
              {selectedWork.original_description && <p className="text-white/55 text-sm leading-relaxed">{selectedWork.original_description}</p>}
              {isSafeHttpUrl(selectedWork.original_proof_value) ? (
                <a href={selectedWork.original_proof_value} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-amber-400 hover:underline truncate">
                  {selectedWork.original_proof_value}
                </a>
              ) : (
                <span className="text-xs font-mono text-amber-400 truncate">
                  {selectedWork.original_proof_value}
                </span>
              )}
              <p className="text-[10px] text-white/30 font-mono border-t border-white/5 pt-3">
                Submitted on {new Date(selectedWork.created_at).toLocaleDateString()} · Modified after plugs
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit proof modal ── */}
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
            <div className="max-w-lg w-full bg-[#0c0c14] border border-white/10 rounded-sm max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                        Link{endorsementCount > 0 && <span className="ml-2 text-white/40 text-xs font-normal">(locked — has plugs)</span>}
                      </label>
                      <input
                        type="url"
                        value={editUrl}
                        disabled={endorsementCount > 0}
                        onChange={(e) => setEditUrl(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                      {urlChanged && endorsementCount === 0 && (
                        <p className="text-amber-400 text-xs font-mono mt-1">⚠ Changing the URL will reset your plugs to 0</p>
                      )}
                    </div>

                    <div>
                      <label className="block font-[family-name:var(--font-mono)] text-[10px] text-white/40 uppercase tracking-widest mb-3">Type</label>
                      <div className="flex gap-2 flex-wrap">
                        {(PROOF_CATEGORY_MAP[editProof.proof_type] === "social" ? SOCIAL_PROOF_TYPES : BUILDER_PROOF_TYPES).map((type) => (
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
                          aria-label="Remove image"
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
                          disabled={editUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            uploadEditCover(file);
                          }}
                        />
                        {editUploading ? "Uploading…" : "↑ Upload image"}
                      </label>
                    )}

                    <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
                      <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/55">Public</span>
                      <button
                        onClick={() => setEditIsPublic((v) => !v)}
                        aria-label={editIsPublic ? "Make proof private" : "Make proof public"}
                        className={`flex-shrink-0 w-10 h-5 rounded-sm border transition-all duration-200 relative ${
                          editIsPublic ? "border-[#c9a84c]/50 bg-[#c9a84c]/10" : "border-white/10 bg-white/[0.02]"
                        }`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-none transition-all duration-200 ${editIsPublic ? "left-[22px] bg-[#c9a84c]" : "left-0.5 bg-white/30"}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button onClick={() => setEditProof(null)} className="font-[family-name:var(--font-mono)] text-xs text-white/40 hover:text-white/75 transition-colors">Cancel</button>
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

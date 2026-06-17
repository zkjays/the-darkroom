"use client";

import type { WorkProof } from "../../dashboard/_types";
import { WORK_TYPE_ICONS } from "../../dashboard/_work-constants";

// Instagram-style 3-column proof gallery. Single source of truth for ProfileView
// (read-only) and WorkTab (owner: edit/delete callbacks provided).
export function ProofGrid({
  proofs,
  accentHex = "#c9a84c",
  onSelect,
  onEdit,
  onDelete,
  deletingId,
  emptyLabel = "No work submitted yet. Start building.",
}: {
  proofs: WorkProof[];
  accentHex?: string;
  onSelect: (proof: WorkProof) => void;
  onEdit?: (proof: WorkProof) => void;
  onDelete?: (id: string) => void;
  deletingId?: string | null;
  emptyLabel?: string;
}) {
  if (proofs.length === 0) {
    return (
      <div className="border border-white/[0.06] rounded-sm px-5 py-10 text-center">
        <p className="font-[family-name:var(--font-mono)] text-xs text-white/40">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {proofs.map((proof) => {
        const endorsementCount = proof.endorsement_count ?? 0;
        const isFeatured = endorsementCount >= 6;
        const isValidated = endorsementCount >= 3;
        return (
          <div
            key={proof.id}
            onClick={() => onSelect(proof)}
            className="group relative aspect-square overflow-hidden cursor-pointer bg-[#0e0e12] transition-shadow duration-300"
            style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.45)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.75)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 10px rgba(0,0,0,0.45)"; }}
          >
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

            {/* Hover overlay */}
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

            {/* Owner edit / delete */}
            {(onEdit || onDelete) && (
              <div className="absolute top-1.5 left-1.5 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(proof); }}
                    className="bg-black/80 p-1 text-white/60 hover:text-white text-[10px]"
                  >
                    ✎
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(proof.id); }}
                    className={`p-1 text-[10px] ${
                      deletingId === proof.id ? "bg-red-500/80 text-white" : "bg-black/80 text-red-400/50 hover:text-red-400"
                    }`}
                    title={deletingId === proof.id ? "Click again to confirm" : "Delete"}
                  >
                    {deletingId === proof.id ? "?" : "✕"}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

// ── Proof advice ────────────────────────────────────────────────────────────
type ProofAdvice = { tierLabel: string; advice: string[]; actionHint: string };

export function getSocialAdvice(score: number): ProofAdvice {
  if (score <= 30) return {
    tierLabel: "Just Getting Started",
    advice: ["Your presence is still quiet — that's not a problem, it's a starting point.", "Focus on posting 3x per week minimum. Consistency beats virality every time.", "The gap: people can't engage with content that doesn't exist yet."],
    actionHint: "Refresh your score after 7 days of consistent posting →",
  };
  if (score <= 55) return {
    tierLabel: "Building Momentum",
    advice: ["You're showing up but not yet consistently.", "Try engaging more in replies — the algorithm rewards conversations.", "The gap: your posting rhythm needs to become a habit, not an event."],
    actionHint: "Keep posting daily for 2 weeks and refresh your score →",
  };
  if (score <= 75) return {
    tierLabel: "Solid Presence",
    advice: ["Your social signal is strong — people notice you.", "Focus now on quality over quantity. One great thread > 10 average posts.", "The gap: depth of engagement. Are people replying back?"],
    actionHint: "One strong thread this week could push you into the next tier →",
  };
  return {
    tierLabel: "Authority Signal",
    advice: ["You have real social presence. The room sees you.", "Protect your consistency — one silent week can drop your score.", "The gap: convert presence into proof. Ship something."],
    actionHint: "Your social score is strong — now build the Builder Proof to match →",
  };
}

export function getBuilderAdvice(score: number): ProofAdvice {
  if (score <= 30) return {
    tierLabel: "Stealth Mode",
    advice: ["No visible builder signal yet — but that changes with one post.", "Share something you're working on, even if it's early. Build in public.", "The gap: the room can't score what it can't see."],
    actionHint: "Post about what you're building this week →",
  };
  if (score <= 55) return {
    tierLabel: "Emerging Builder",
    advice: ["You're building but not sharing enough of the process.", "Technical posts and project updates are your highest-signal content.", "The gap: show the work, not just the results."],
    actionHint: "One build-in-public post per week is enough to move this score →",
  };
  if (score <= 75) return {
    tierLabel: "Active Builder",
    advice: ["Strong builder signal — your content shows real depth.", "Keep shipping. Even small updates count as builder proof.", "The gap: are you documenting your systems, not just your outputs?"],
    actionHint: "Keep the technical content coming and refresh in 7 days →",
  };
  return {
    tierLabel: "Ghost Operator",
    advice: ["You build at a level most people only tweet about.", "Your signal is rare — protect it by staying consistent.", "The gap: share more of your thinking, not just your results."],
    actionHint: "Your Builder score is elite. Focus on Work Proofs to complete your profile →",
  };
}

// ── ProofCard ───────────────────────────────────────────────────────────────
export function ProofCard({
  label, value, color, hint, expanded, onToggle, cardCls,
}: {
  label: string; value: number; color: string; hint: string;
  expanded: boolean; onToggle: () => void; cardCls?: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) setHeight(expanded ? contentRef.current.scrollHeight : 0);
  }, [expanded]);

  const baseCls = cardCls ?? "bg-white/[0.02] border border-white/[0.06]";

  return (
    <div
      className={`${baseCls} rounded-xl p-5 lg:p-7 flex flex-col gap-3 cursor-pointer select-none transition-all duration-200 ${
        expanded ? "ring-1 ring-white/10" : "hover:ring-1 hover:ring-white/5"
      }`}
      onClick={onToggle}
    >
      <div className="flex flex-col gap-2">
        <p className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.2em] text-slate-300 uppercase">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">{value}</span>
          <span className="font-[family-name:var(--font-mono)] text-xs text-slate-500">/100</span>
          <span className="ml-auto font-[family-name:var(--font-mono)] text-[10px] text-slate-500">{expanded ? "▲" : "▼"}</span>
        </div>
        <div className="h-[3px] w-full rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${value}%`, backgroundColor: color }}
          />
        </div>
      </div>
      <div style={{ maxHeight: height, overflow: "hidden", transition: "max-height 300ms ease" }}>
        <div ref={contentRef} className="pt-2 border-t border-white/[0.05]">
          <p className="text-xs text-slate-400 leading-relaxed">{hint}</p>
        </div>
      </div>
    </div>
  );
}

// ── ProofRing ───────────────────────────────────────────────────────────────
export function ProofRing({
  value, color, label, sublabel, onClick, hint,
}: {
  value: number; color: string; label: string; sublabel: string;
  onClick?: () => void; hint?: string; hoverGlow?: string;
}) {
  const size = 160;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div
      className={`group flex flex-col items-center gap-3 ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div
        className="relative transition-all duration-300 group-hover:scale-105"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth} opacity={0.1} />
          <circle cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 700ms ease-out" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-white">{value}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.2em] text-white/60 uppercase">{label}</p>
        <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500 tracking-[0.15em] uppercase">{sublabel}</p>
        {hint && (
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-600 mt-1">{hint}</p>
        )}
      </div>
    </div>
  );
}

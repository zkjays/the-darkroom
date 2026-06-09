"use client";

import { useEffect, useState } from "react";
import { getCardStyle, ACCENT_HEX } from "./_styles";
import type { TabId } from "./_styles";

export function OnboardingBanner({
  handle,
  profilePublic,
  hasShared,
  accent,
  onSwitchTab,
  onDismiss,
}: {
  handle: string;
  profilePublic: boolean;
  hasShared: boolean;
  accent: string;
  onSwitchTab: (tab: TabId) => void;
  onDismiss: () => void;
}) {
  const cs = getCardStyle(accent);
  const hex = ACCENT_HEX[accent] ?? "#67e8f9";
  const [hasWork, setHasWork] = useState(false);
  const [allDoneFired, setAllDoneFired] = useState(false);

  useEffect(() => {
    fetch(`/api/goals?handle=${encodeURIComponent(handle)}&all=true&completed=true`)
      .then((r) => r.json())
      .then((d) => { if ((d.goals?.length ?? 0) > 0) setHasWork(true); })
      .catch(() => {});
  }, [handle]);

  const steps: Array<{ label: string; done: boolean; onClick?: () => void }> = [
    { label: "Check your score",   done: true },
    { label: "Submit first proof", done: hasWork,       onClick: () => onSwitchTab("work") },
    { label: "Go public",          done: profilePublic, onClick: () => onSwitchTab("settings") },
    { label: "Share your ID",      done: hasShared,     onClick: () => onSwitchTab("id") },
  ];

  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === 4;
  const activeIdx = steps.findIndex((s) => !s.done);

  useEffect(() => {
    if (!allDone || allDoneFired) return;
    setAllDoneFired(true);
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [allDone, allDoneFired, onDismiss]);

  return (
    <div className={`${cs.primaryCard} rounded-xl p-4`}>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex-shrink-0">
          <p className="text-sm font-bold text-white leading-tight">Getting started</p>
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
            {allDone ? "All done! You're set." : `${completed}/4 complete`}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 flex-1 items-center">
          {steps.map((step, i) => {
            const isDone = step.done;
            const isActive = i === activeIdx;
            const accentStyle = isActive
              ? { borderColor: hex + "4d", backgroundColor: hex + "0d", color: "#fff" }
              : {};
            return (
              <button
                key={step.label}
                disabled={isDone || !step.onClick}
                onClick={step.onClick}
                style={accentStyle}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-[family-name:var(--font-mono)] text-[11px] transition-all ${
                  isDone
                    ? "border-white/5 text-slate-500 cursor-default"
                    : isActive
                    ? "border cursor-pointer hover:opacity-90 animate-pulse"
                    : "border-white/5 text-slate-600 opacity-50 cursor-default"
                }`}
              >
                <span className={isDone ? "text-emerald-400" : "text-slate-500"}>
                  {isDone ? "✓" : i + 1}
                </span>
                <span className={isDone ? "line-through" : ""}>{step.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-slate-600 hover:text-slate-400 text-xs transition-colors pt-0.5"
          title="Dismiss"
          aria-label="Dismiss onboarding"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

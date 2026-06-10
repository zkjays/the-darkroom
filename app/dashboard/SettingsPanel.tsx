"use client";

import { useEffect, useState } from "react";
import { copyToClipboard } from "./_styles";
import { SITE_URL } from "./_types";

interface SettingsState {
  profile_public: boolean;
  goals_public: boolean;
  theme_accent: string;
  open_to_opportunities: boolean;
}

export function SettingsPanel({
  handle,
  initial,
  onSaved,
  onAccentChange,
}: {
  handle: string;
  initial: SettingsState;
  onSaved: (s: SettingsState) => void;
  onAccentChange: (accent: string) => void;
}) {
  const [profilePublic, setProfilePublic] = useState(initial.profile_public);
  const [goalsPublic, setGoalsPublic] = useState(initial.goals_public);
  const [themeAccent, setThemeAccent] = useState(initial.theme_accent);
  const [openToOpportunities, setOpenToOpportunities] = useState(initial.open_to_opportunities);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [referralStats, setReferralStats] = useState<{ count: number; xp_earned_total: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const referralLink = `${SITE_URL}/darkroom-id?ref=${handle}`;

  useEffect(() => {
    fetch(`/api/referrals?handle=${encodeURIComponent(handle)}`)
      .then((r) => r.json())
      .then((d) => setReferralStats({ count: d.count ?? 0, xp_earned_total: d.xp_earned_total ?? 0 }))
      .catch(() => {});
  }, [handle]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, profile_public: profilePublic, goals_public: goalsPublic, theme_accent: themeAccent, open_to_opportunities: openToOpportunities }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved({ profile_public: data.profile_public, goals_public: data.goals_public, theme_accent: data.theme_accent ?? themeAccent, open_to_opportunities: data.open_to_opportunities ?? openToOpportunities });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    copyToClipboard(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0c0c14] border border-white/[0.07] rounded-sm flex flex-col divide-y divide-white/[0.06]">

      {/* Profile public */}
      <div className="flex items-center justify-between px-5 py-4">
        <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-slate-400">Profile public</p>
        <button
          onClick={() => setProfilePublic((v) => !v)}
          className={`flex-shrink-0 w-10 h-5 rounded-sm border transition-all duration-200 relative ${
            profilePublic ? "border-[#c9a84c]/50 bg-[#c9a84c]/10" : "border-white/10 bg-white/[0.02]"
          }`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-none transition-all duration-200 ${profilePublic ? "left-[22px] bg-[#c9a84c]" : "left-0.5 bg-white/30"}`} />
        </button>
      </div>

      {/* Work proof public */}
      <div className="flex items-center justify-between px-5 py-4">
        <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-slate-400">Work proof public</p>
        <button
          onClick={() => setGoalsPublic((v) => !v)}
          className={`flex-shrink-0 w-10 h-5 rounded-sm border transition-all duration-200 relative ${
            goalsPublic ? "border-[#c9a84c]/50 bg-[#c9a84c]/10" : "border-white/10 bg-white/[0.02]"
          }`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-none transition-all duration-200 ${goalsPublic ? "left-[22px] bg-[#c9a84c]" : "left-0.5 bg-white/30"}`} />
        </button>
      </div>

      {/* Open to opportunities */}
      <div className="flex items-center justify-between px-5 py-4">
        <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-slate-400">Available for work</p>
        <button
          onClick={() => setOpenToOpportunities((v) => !v)}
          className={`flex-shrink-0 w-10 h-5 rounded-sm border transition-all duration-200 relative ${
            openToOpportunities ? "border-[#c9a84c]/50 bg-[#c9a84c]/10" : "border-white/10 bg-white/[0.02]"
          }`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-none transition-all duration-200 ${openToOpportunities ? "left-[22px] bg-[#c9a84c]" : "left-0.5 bg-white/30"}`} />
        </button>
      </div>

      {/* Referral link */}
      <div className="flex flex-col gap-3 px-5 py-5">
        <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.15em] text-slate-600 uppercase">Referral link</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-sm px-3 py-2 overflow-hidden">
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 truncate block">{referralLink}</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 rounded-sm px-3 py-2 font-[family-name:var(--font-mono)] text-[10px] text-slate-400 hover:text-white border border-white/10 hover:border-white/20 transition-all"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        {referralStats && (
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-600">
            {referralStats.count} referral{referralStats.count !== 1 ? "s" : ""} · {referralStats.xp_earned_total} XP earned
          </p>
        )}
      </div>

      {/* Save */}
      <div className="px-5 py-4">
        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-sm border border-[#c9a84c]/30 hover:border-[#c9a84c]/60 bg-[#c9a84c]/[0.04] hover:bg-[#c9a84c]/[0.08] py-2.5 font-[family-name:var(--font-mono)] text-xs text-[#c9a84c] disabled:opacity-40 transition-all tracking-widest uppercase"
        >
          {saved ? "Saved ✓" : saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

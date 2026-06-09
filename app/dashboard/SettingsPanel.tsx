"use client";

import { useEffect, useState } from "react";
import { getCardStyle, getButtonStyle, copyToClipboard, ACCENT_HEX } from "./_styles";
import { SITE_URL } from "./_types";

const ACCENT_SWATCHES = [
  { key: "cyan",    hex: "#67e8f9" },
  { key: "violet",  hex: "#c4b5fd" },
  { key: "emerald", hex: "#6ee7b7" },
  { key: "amber",   hex: "#fcd34d" },
] as const;

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
    <div className={`${getCardStyle(themeAccent).primaryCard} rounded-xl p-5 flex flex-col gap-5`}>
      {/* Profile visibility */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-slate-200 font-medium">Profile Visibility</p>
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-400 leading-relaxed">
            Public profiles can be discovered by other builders
          </p>
        </div>
        <button
          onClick={() => setProfilePublic((v) => !v)}
          className={`flex-shrink-0 w-11 h-6 rounded-full border transition-all duration-200 relative ${
            profilePublic ? "bg-white/20 border-white/30" : "bg-white/[0.04] border-white/10"
          }`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200 ${profilePublic ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      {/* Goals visibility */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-slate-200 font-medium">Goals Visibility Default</p>
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-400 leading-relaxed">
            Public goals can be endorsed and copied by the community
          </p>
        </div>
        <button
          onClick={() => setGoalsPublic((v) => !v)}
          className={`flex-shrink-0 w-11 h-6 rounded-full border transition-all duration-200 relative ${
            goalsPublic ? "bg-white/20 border-white/30" : "bg-white/[0.04] border-white/10"
          }`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200 ${goalsPublic ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      {/* Open to opportunities */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-slate-200 font-medium">Open to Opportunities</p>
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-400 leading-relaxed">
            Display a badge on your public profile to signal you&apos;re available
          </p>
        </div>
        <button
          onClick={() => setOpenToOpportunities((v) => !v)}
          className={`flex-shrink-0 w-11 h-6 rounded-full border transition-all duration-200 relative ${
            openToOpportunities ? "bg-white/20 border-white/30" : "bg-white/[0.04] border-white/10"
          }`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200 ${openToOpportunities ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>

      {/* Theme accent */}
      <div className="flex items-center justify-between gap-4 pt-3 border-t border-white/[0.05]">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-slate-200 font-medium">Theme Accent</p>
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500 leading-relaxed">
            Personalizes accent colors across your dashboard
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {ACCENT_SWATCHES.map((swatch) => (
            <button
              key={swatch.key}
              title={swatch.key}
              onClick={() => { setThemeAccent(swatch.key); onAccentChange(swatch.key); }}
              className={`w-7 h-7 rounded-full transition-all ${
                themeAccent === swatch.key
                  ? "ring-2 ring-white ring-offset-2 ring-offset-[#050508] scale-110"
                  : "opacity-50 hover:opacity-90 hover:scale-110"
              }`}
              style={{ backgroundColor: swatch.hex }}
            />
          ))}
        </div>
      </div>

      {/* Referral link */}
      <div className="flex flex-col gap-2 pt-3 border-t border-white/[0.05]">
        <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.15em] text-slate-500 uppercase">
          Your referral link
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 overflow-hidden">
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/35 truncate block">{referralLink}</span>
          </div>
          <button
            onClick={handleCopy}
            className={`flex-shrink-0 rounded-lg px-3 py-2 font-[family-name:var(--font-mono)] text-[10px] text-slate-300 hover:text-slate-200 transition-all ${getButtonStyle(themeAccent, "secondary")}`}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        {referralStats && (
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500">
            {referralStats.count} referral{referralStats.count !== 1 ? "s" : ""} · {referralStats.xp_earned_total} XP earned
          </p>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className={`w-full rounded-lg bg-white/[0.06] py-2.5 text-sm text-slate-200 hover:text-white/90 hover:bg-white/[0.1] disabled:opacity-40 transition-all ${getButtonStyle(themeAccent, "primary")}`}
      >
        {saved ? "Saved ✓" : saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}

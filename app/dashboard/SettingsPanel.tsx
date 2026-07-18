"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const [bio, setBio] = useState("");
  const [linkX, setLinkX] = useState("");
  const [linkGithub, setLinkGithub] = useState("");
  const [linkSite, setLinkSite] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [githubVerified, setGithubVerified] = useState(false);
  const [githubMessage, setGithubMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [referralStats, setReferralStats] = useState<{ count: number; xp_earned_total: number } | null>(null);
  const [copied, setCopied] = useState(false);
  // The shareable Darkroom Card IS the referral mechanism (decision 14/06) — carry ?ref on /p/handle
  const referralLink = `${SITE_URL}/p/${handle}?ref=${handle}`;
  const router = useRouter();
  const searchParams = useSearchParams();

  const BIO_MAX = 160;

  const GITHUB_ERROR_MESSAGES: Record<string, string> = {
    cancelled: "GitHub connection cancelled.",
    state_mismatch: "Something went wrong — please try again.",
    already_claimed: "That GitHub account is already verified on another Darkroom profile.",
    token_exchange_failed: "Couldn't connect to GitHub — please try again.",
    profile_fetch_failed: "Couldn't read your GitHub profile — please try again.",
    not_configured: "GitHub verification isn't available right now.",
    save_failed: "Couldn't save — please try again.",
    unexpected: "Something went wrong — please try again.",
  };

  useEffect(() => {
    fetch(`/api/referrals?handle=${encodeURIComponent(handle)}`)
      .then((r) => r.json())
      .then((d) => setReferralStats({ count: d.count ?? 0, xp_earned_total: d.xp_earned_total ?? 0 }))
      .catch(() => {});
    fetch(`/api/settings?handle=${encodeURIComponent(handle)}`)
      .then((r) => r.json())
      .then((d) => {
        setBio(d.bio ?? "");
        setLinkX(d.link_x ?? "");
        setLinkGithub(d.link_github ?? "");
        setLinkSite(d.link_site ?? "");
        setGithubUsername(d.github_username ?? "");
        setGithubVerified(d.github_verified ?? false);
      })
      .catch(() => {});
  }, [handle]);

  // Land here after the /api/github/callback redirect — surface the result once,
  // then strip github/github_error from the URL so a refresh doesn't re-show it.
  useEffect(() => {
    const github = searchParams.get("github");
    const githubError = searchParams.get("github_error");
    if (!github && !githubError) return;

    if (github === "connected") {
      setGithubVerified(true);
      setGithubMessage("GitHub connected ✓");
    } else if (githubError) {
      setGithubMessage(GITHUB_ERROR_MESSAGES[githubError] ?? GITHUB_ERROR_MESSAGES.unexpected);
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("github");
    params.delete("github_error");
    const query = params.toString();
    router.replace(query ? `/dashboard?${query}` : "/dashboard", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const disconnectGithub = async () => {
    setGithubMessage(null);
    const res = await fetch("/api/github/disconnect", { method: "POST" });
    const data = await res.json();
    if (data.success) {
      setGithubVerified(false);
      setGithubUsername("");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, profile_public: profilePublic, goals_public: goalsPublic, theme_accent: themeAccent, open_to_opportunities: openToOpportunities, bio, link_x: linkX, link_github: linkGithub, link_site: linkSite }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved({ profile_public: data.profile_public, goals_public: data.goals_public, theme_accent: data.theme_accent ?? themeAccent, open_to_opportunities: data.open_to_opportunities ?? openToOpportunities });
        setBio(data.bio ?? "");
        setLinkX(data.link_x ?? "");
        setLinkGithub(data.link_github ?? "");
        setLinkSite(data.link_site ?? "");
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

      {/* Bio */}
      <div className="flex flex-col gap-2 px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-slate-400">Bio</p>
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-slate-600">{bio.length}/{BIO_MAX}</span>
        </div>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
          rows={2}
          placeholder="One line on what you build…"
          className="w-full resize-none bg-white/[0.02] border border-white/[0.06] focus:border-[#c9a84c]/40 rounded-sm px-3 py-2 font-[family-name:var(--font-outfit)] text-sm text-white/80 placeholder:text-white/20 outline-none transition-colors"
        />
      </div>

      {/* External links */}
      <div className="flex flex-col gap-2 px-5 py-4">
        <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-slate-400">Links</p>
        {([
          { label: "X / Twitter", value: linkX, set: setLinkX, ph: "https://x.com/you" },
          { label: "GitHub", value: linkGithub, set: setLinkGithub, ph: "https://github.com/you" },
          { label: "Website", value: linkSite, set: setLinkSite, ph: "https://yoursite.xyz" },
        ] as const).map((f) => (
          <input
            key={f.label}
            type="url"
            value={f.value}
            onChange={(e) => f.set(e.target.value)}
            placeholder={f.ph}
            className="w-full bg-white/[0.02] border border-white/[0.06] focus:border-[#c9a84c]/40 rounded-sm px-3 py-2 font-[family-name:var(--font-mono)] text-[11px] text-white/70 placeholder:text-white/20 outline-none transition-colors"
          />
        ))}
      </div>

      {/* GitHub verification */}
      <div className="flex flex-col gap-2 px-5 py-4">
        <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-widest text-slate-400">GitHub verification</p>
        {githubMessage && (
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500">{githubMessage}</p>
        )}
        {githubVerified ? (
          <div className="flex items-center justify-between gap-2">
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-[#00d4aa]">
              @{githubUsername} ✓ Verified
            </span>
            <button
              onClick={disconnectGithub}
              className="flex-shrink-0 font-[family-name:var(--font-mono)] text-[10px] text-slate-500 hover:text-white border border-white/10 hover:border-white/20 rounded-sm px-3 py-1 transition-all"
            >
              Disconnect
            </button>
          </div>
        ) : (
          // Real navigation (not fetch) — this is a cross-site OAuth redirect.
          <a
            href="/api/github/connect"
            className="inline-flex w-fit items-center rounded-sm border border-white/10 hover:border-[#c9a84c]/40 px-3 py-2 font-[family-name:var(--font-mono)] text-[11px] text-white/70 hover:text-[#c9a84c] transition-all"
          >
            Verify GitHub
          </a>
        )}
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
          <div className="flex flex-col gap-2">
            <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-600">
              {referralStats.count} referral{referralStats.count !== 1 ? "s" : ""} · {referralStats.xp_earned_total} XP earned
            </p>
            {/* Reward ladder: badge at 1, Second Brain unlock at 25 (decision 14/06) */}
            <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (referralStats.count / 25) * 100)}%`, background: "#00d4aa" }}
              />
            </div>
            <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-600">
              {referralStats.count >= 25
                ? "✓ Second Brain unlocked"
                : `${referralStats.count}/25 referrals → unlock Second Brain`}
            </p>
          </div>
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

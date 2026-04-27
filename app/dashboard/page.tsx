"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Navbar from "../component/landing/Navbar";
import CardGenerator from "../component/darkroom-id/CardGenerator";
import { useGoals } from "../lib/useGoals";
import type { Goal } from "../lib/useGoals";
import { getAccent } from "../lib/theme";

const SITE_URL = "https://thedarkroom.xyz";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_active: string;
  total_visits: number;
}

interface DashboardData {
  handle: string;
  score: number;
  bonus_points?: number;
  total_score?: number;
  total_xp?: number;
  stat_xp?: Record<string, number>;
  archetype: string;
  tagline: string;
  stats: { focus: number; consistency: number; reliability: number; growth: number };
  analysis: string;
  darkroom_line: string;
  profile_image_url?: string;
  claim_count: number;
  claimed_at?: string;
  created_at: string;
  updated_at: string;
  streak: StreakData | null;
  profile_public?: boolean;
  goals_public?: boolean;
  theme_accent?: string;
}

interface Template {
  id: string;
  handle: string;
  goal_text: string;
  target_stat: Goal["target_stat"];
  proof_type: "link" | "screenshot";
  copy_count: number;
}

const STATS = [
  {
    key: "focus",
    label: "FOCUS",
    color: "#60A5FA",
    fallback: "dedication",
    description: "Your ability to lock in and go deep on what matters.",
    actions: ["Pick one task and work it to completion", "Remove distractions for 90 min blocks"],
  },
  {
    key: "consistency",
    label: "CONSISTENCY",
    color: "#C084FC",
    fallback: "consistency",
    description: "How reliably you show up day after day.",
    actions: ["Log in and do at least one thing daily", "Build a repeatable morning routine"],
  },
  {
    key: "reliability",
    label: "RELIABILITY",
    color: "#34D399",
    fallback: "stealth",
    description: "Whether people can count on you to deliver.",
    actions: ["Follow through on a commitment you made", "Ship something you said you would"],
  },
  {
    key: "growth",
    label: "GROWTH",
    color: "#FBBF24",
    fallback: "momentum",
    description: "Your trajectory — are you moving forward?",
    actions: ["Share something you learned publicly", "Help another builder with a challenge"],
  },
] as const;

const statConfig: Record<string, { improvements: Array<{ label: string; points: string }> }> = {
  focus: {
    improvements: [
      { label: "Complete deep-dive lessons", points: "+5 pts" },
      { label: "Earn Specialist certification", points: "+15 pts" },
    ],
  },
  consistency: {
    improvements: [
      { label: "Maintain a 7-day streak", points: "+3 pts" },
      { label: "30 days in a row", points: "+10 pts" },
    ],
  },
  reliability: {
    improvements: [
      { label: "Complete Builder Basics course", points: "+5 pts" },
      { label: "Earn Trusted Builder badge", points: "+15 pts" },
    ],
  },
  growth: {
    improvements: [
      { label: "Share your journey publicly", points: "+3 pts" },
      { label: "Help 3 builders this week", points: "+5 pts" },
    ],
  },
};

interface TierAdvice { description: string; daily_actions: string[] }

const TIER_ADVICE: Record<string, [TierAdvice, TierAdvice, TierAdvice]> = {
  focus: [
    {
      description: "You're pulled in too many directions. The ones who win pick one lane and own it.",
      daily_actions: ["Choose one priority this week. Say no to everything else.", "Ask yourself: if I could only work on one thing today, what moves the needle?"],
    },
    {
      description: "You know what matters. Now protect your time like it's your most valuable asset.",
      daily_actions: ["Block 2 hours of deep work on YOUR thing today. No notifications.", "Before saying yes to anything, ask: does this serve my main goal?"],
    },
    {
      description: "Dialed in. Your focus is rare — most people never get here.",
      daily_actions: ["Go deeper where you're already strong. Teach what you know.", "Create a system or framework from your experience. Package your expertise."],
    },
  ],
  consistency: [
    {
      description: "Bursts of energy don't build anything lasting. Small daily actions do.",
      daily_actions: ["Do one small thing for your goal today. Even 15 minutes counts.", "Set a recurring reminder. Show up at the same time every day."],
    },
    {
      description: "You're building a habit. The hardest part is behind you. Don't stop.",
      daily_actions: ["Track your streak. Momentum is fragile — protect it.", "On low-energy days, do the minimum. Never zero."],
    },
    {
      description: "Most people quit by now. You're still here. That's the real flex.",
      daily_actions: ["You show up. Now help someone else stay consistent.", "Optimize your routine — find what gives you the most output per hour."],
    },
  ],
  reliability: [
    {
      description: "People don't know if they can count on you yet. Prove it with one delivery.",
      daily_actions: ["Finish one thing you started this week. Done beats perfect.", "Make a promise to one person and keep it. Start small."],
    },
    {
      description: "Trust is built one delivery at a time. You're stacking proof.",
      daily_actions: ["Share proof of what you've done — not what you plan to do.", "When you commit to something, follow through. Every time."],
    },
    {
      description: "When people think 'who can I trust to get this done?' — your name comes up.",
      daily_actions: ["You deliver. Now raise the stakes — take on a bigger challenge.", "Help others ship. Your reliability makes teams stronger."],
    },
  ],
  growth: [
    {
      description: "Growth starts with curiosity. You're at the beginning — that's exciting, not shameful.",
      daily_actions: ["Learn one new thing today. Write down what you learned.", "Find someone 6 months ahead of you. Watch what they actually do."],
    },
    {
      description: "You're evolving. Now turn learning into doing — that's where real growth happens.",
      daily_actions: ["Take what you learned and apply it. Knowledge without action is just entertainment.", "Share your journey — the messy parts are what people connect with."],
    },
    {
      description: "You're growing with substance. Not vanity metrics — real capability.",
      daily_actions: ["Give back. Help someone at the stage you were 6 months ago.", "Launch something imperfect. Growth accelerates when you ship."],
    },
  ],
};

function getTierAdvice(statKey: string, statScore: number): TierAdvice {
  const tiers = TIER_ADVICE[statKey];
  if (!tiers) return { description: "", daily_actions: [] };
  if (statScore <= 35) return tiers[0];
  if (statScore <= 55) return tiers[1];
  return tiers[2];
}

function formatDate(data: DashboardData) {
  const raw = data.claimed_at || data.created_at || data.updated_at;
  if (!raw) return "Unknown";
  try {
    return new Date(raw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "Unknown"; }
}

function daysUntilReclaim(updatedAt: string) {
  const daysSince = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.ceil(30 - daysSince);
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function PfpPlaceholder({ handle, size }: { handle: string; size: number }) {
  return (
    <div
      className="rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="text-slate-300 font-bold" style={{ fontSize: size * 0.38 }}>
        {handle.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

function ProfileImage({ url, handle, size }: { url?: string; handle: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <PfpPlaceholder handle={handle} size={size} />;
  return (
    <img
      src={url} alt={handle} width={size} height={size}
      onError={() => setFailed(true)}
      className="rounded-full border border-white/10 object-cover flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

// ── TOAST ──────────────────────────────────────────────────────────────────
interface ToastMsg { id: number; text: string }

function Toast({ messages }: { messages: ToastMsg[] }) {
  if (messages.length === 0) return null;
  return (
    <div className="fixed top-24 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {messages.map((m) => (
        <div
          key={m.id}
          className="bg-white/[0.08] border border-white/[0.12] backdrop-blur rounded-full px-4 py-2 font-[family-name:var(--font-mono)] text-xs text-slate-200 animate-fade-in-up"
        >
          {m.text}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [messages, setMessages] = useState<ToastMsg[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((text: string, duration = 2500) => {
    const id = ++idRef.current;
    setMessages((prev) => [...prev, { id, text }]);
    setTimeout(() => setMessages((prev) => prev.filter((m) => m.id !== id)), duration);
  }, []);

  return { messages, showToast };
}

const STAT_BAR_GLOW: Record<string, string> = {
  "#60A5FA": "shadow-[0_0_8px_rgba(96,165,250,0.3)]",
  "#C084FC": "shadow-[0_0_8px_rgba(192,132,252,0.3)]",
  "#34D399": "shadow-[0_0_8px_rgba(52,211,153,0.3)]",
  "#FBBF24": "shadow-[0_0_8px_rgba(251,191,36,0.3)]",
};

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex justify-between items-center">
          <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.2em] text-slate-300 uppercase">{label}</span>
          <span className="font-[family-name:var(--font-mono)] text-xs text-slate-300">{value}</span>
        </div>
      )}
      <div className="h-[3px] w-full rounded-full bg-white/[0.08] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${STAT_BAR_GLOW[color] ?? ""}`}
          style={{ width: `${(value / 75) * 100}%`, backgroundColor: color || "#ffffff" }}
        />
      </div>
    </div>
  );
}

function StatCard({
  statKey, label, value, color = "#ffffff", expanded, onToggle, statXp, totalScore, cardCls,
}: {
  statKey: string; label: string; value: number; color?: string;
  expanded: boolean; onToggle: () => void;
  statXp?: number; totalScore?: number; cardCls?: string;
}) {
  const cfg = statConfig[statKey] ?? { improvements: [] };
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  const xpCost = totalScore !== undefined
    ? (totalScore >= 95 ? 20 : totalScore >= 75 ? 15 : 10)
    : 10;
  const xpAccum = statXp ?? 0;

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
          <span className="font-[family-name:var(--font-mono)] text-xs text-slate-500">/75</span>
          <span className="ml-auto font-[family-name:var(--font-mono)] text-[10px] text-slate-500">{expanded ? "▲" : "▼"}</span>
        </div>
        <StatBar label="" value={value} color={color} />
      </div>
      <div style={{ maxHeight: height, overflow: "hidden", transition: "max-height 300ms ease" }}>
        <div ref={contentRef} className="flex flex-col gap-4 pt-2 border-t border-white/[0.05]">
          {(() => {
            const tier = getTierAdvice(statKey, value);
            return (
              <>
                <p className="text-xs text-slate-300 italic leading-relaxed">{tier.description}</p>

                {/* XP progress toward next point */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500 uppercase tracking-[0.15em]">XP progress</span>
                    <span className="font-[family-name:var(--font-mono)] text-[10px]" style={{ color: color + "99" }}>
                      {xpAccum} / {xpCost} XP
                    </span>
                  </div>
                  <div className="h-[2px] w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (xpAccum / xpCost) * 100)}%`, backgroundColor: color }} />
                  </div>
                  <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500">
                    Complete goals targeting this stat to earn XP → score points
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.15em] text-slate-500 uppercase">Daily actions</p>
                  {tier.daily_actions.map((action) => (
                    <div key={action} className="flex items-start gap-2">
                      <span className="text-slate-500 mt-0.5 flex-shrink-0">→</span>
                      <span className="text-xs text-white/55 leading-relaxed">{action}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.15em] text-slate-500 uppercase">How to improve</p>
                  {cfg.improvements.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3 opacity-40">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs flex-shrink-0">🔒</span>
                        <span className="text-xs text-slate-200 truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-slate-300">{item.points}</span>
                        <span className="bg-white/[0.05] text-slate-400 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">soon</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ── SETTINGS PANEL ──────────────────────────────────────────────────────────
const ACCENT_SWATCHES = [
  { key: "cyan",    hex: "#67e8f9" },
  { key: "violet",  hex: "#c4b5fd" },
  { key: "emerald", hex: "#6ee7b7" },
  { key: "amber",   hex: "#fcd34d" },
] as const;

function SettingsPanel({
  handle,
  initial,
  onSaved,
  onAccentChange,
}: {
  handle: string;
  initial: { profile_public: boolean; goals_public: boolean; theme_accent: string };
  onSaved: (s: { profile_public: boolean; goals_public: boolean; theme_accent: string }) => void;
  onAccentChange: (accent: string) => void;
}) {
  const [profilePublic, setProfilePublic] = useState(initial.profile_public);
  const [goalsPublic, setGoalsPublic] = useState(initial.goals_public);
  const [themeAccent, setThemeAccent] = useState(initial.theme_accent);
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
        body: JSON.stringify({ handle, profile_public: profilePublic, goals_public: goalsPublic, theme_accent: themeAccent }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved({ profile_public: data.profile_public, goals_public: data.goals_public, theme_accent: data.theme_accent ?? themeAccent });
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
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200 ${
              profilePublic ? "left-[22px]" : "left-0.5"
            }`}
          />
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
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200 ${
              goalsPublic ? "left-[22px]" : "left-0.5"
            }`}
          />
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

// ── ENDORSEMENT CONTROLS ────────────────────────────────────────────────────
function EndorsementControls({ goal, viewerHandle }: { goal: Goal; viewerHandle: string }) {
  const [endorses, setEndorses] = useState(0);
  const [challenges, setChallenges] = useState(0);
  const [userAction, setUserAction] = useState<"endorse" | "challenge" | null>(null);
  const [busy, setBusy] = useState(false);
  const [showChallengeInput, setShowChallengeInput] = useState(false);
  const [challengeReason, setChallengeReason] = useState("");

  const isOwner = goal.handle === viewerHandle;

  useEffect(() => {
    console.log("EndorsementControls mount:", {
      goalId: goal.id,
      isPublic: goal.is_public,
      status: goal.status,
      owner: goal.handle,
      currentUser: viewerHandle,
      isOwner,
    });
    fetch(`/api/endorsements?goal_id=${goal.id}&viewer=${encodeURIComponent(viewerHandle)}`)
      .then((r) => r.json())
      .then((d) => {
        setEndorses(d.endorses ?? 0);
        setChallenges(d.challenges ?? 0);
        setUserAction(d.user_action ?? null);
      })
      .catch(() => {});
  }, [goal.id, viewerHandle, isOwner]);

  const act = async (type: "endorse" | "challenge", reason?: string) => {
    if (busy || userAction || isOwner) return;
    setBusy(true);
    try {
      const res = await fetch("/api/endorsements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal_id: goal.id, endorser_handle: viewerHandle, type, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setEndorses(data.counts.endorses);
        setChallenges(data.counts.challenges);
        setUserAction(type);
        setShowChallengeInput(false);
        setChallengeReason("");
      }
    } finally {
      setBusy(false);
    }
  };

  // Owner sees counts only
  if (isOwner) {
    return (
      <div className="flex items-center gap-3 pt-1">
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/35">
          <span className="text-emerald-500/50">✓ {endorses}</span>
          <span className="text-slate-500 mx-1.5">·</span>
          <span className="text-red-400/50">⚠ {challenges}</span>
        </span>
      </div>
    );
  }

  // Non-owner: show action buttons
  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-center gap-2">
        <button
          disabled={busy || !!userAction}
          onClick={() => act("endorse")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all ${
            userAction === "endorse"
              ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
              : "border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {userAction === "endorse" ? "Endorsed ✓" : `✓ Endorse`}
        </button>
        <button
          disabled={busy || !!userAction}
          onClick={() => { if (!userAction) setShowChallengeInput((v) => !v); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all ${
            userAction === "challenge"
              ? "border-red-500/40 text-red-400 bg-red-500/10"
              : "border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {userAction === "challenge" ? "Challenged ⚠" : `⚠ Challenge`}
        </button>
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-slate-300 ml-1">
          {endorses > 0 && <span className="text-emerald-500/60">{endorses} ✓</span>}
          {endorses > 0 && challenges > 0 && <span className="text-slate-500 mx-1">·</span>}
          {challenges > 0 && <span className="text-red-400/60">{challenges} ⚠</span>}
        </span>
      </div>

      {showChallengeInput && !userAction && (
        <div className="flex flex-col gap-2">
          <textarea
            autoFocus
            rows={2}
            placeholder="Why are you challenging this? (optional)"
            value={challengeReason}
            onChange={(e) => setChallengeReason(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-red-400/20 resize-none"
          />
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() => act("challenge", challengeReason.trim() || undefined)}
              className="flex-1 rounded-lg bg-red-500/[0.08] border border-red-500/20 py-1.5 text-sm text-red-400 hover:bg-red-500/[0.12] disabled:opacity-40 transition-all"
            >
              {busy ? "Submitting…" : "Submit challenge"}
            </button>
            <button
              onClick={() => { setShowChallengeInput(false); setChallengeReason(""); }}
              className="px-3 rounded-lg border border-white/[0.06] text-xs text-white/35 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="font-[family-name:var(--font-mono)] text-[9px] text-slate-500 leading-relaxed">
            3+ challenges removes points from the goal owner. Use this only if the goal is not credible.
          </p>
        </div>
      )}
    </div>
  );
}

// ── GOAL CARD ──────────────────────────────────────────────────────────────
function GoalCard({
  goal, handle, onComplete, onXPGained,
}: {
  goal: Goal; handle: string;
  onComplete: (id: string, proof: string) => Promise<{ xp_added: number; points_gained: number; xp_cost: number; new_stat_xp: number } | null>;
  onXPGained?: (xp: { xp_added: number; points_gained: number; xp_cost: number; new_stat_xp: number }) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [proofValue, setProofValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [xpFlash, setXpFlash] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const statDef = STATS.find((s) => s.key === goal.target_stat);

  const handleComplete = async () => {
    if (submitting) return;
    let proof = proofValue.trim();
    if (goal.proof_type === "screenshot" && file) {
      setSubmitting(true);
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("handle", handle);
        const res = await fetch("/api/upload-proof", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        proof = data.url;
      } catch (e) {
        alert(e instanceof Error ? e.message : "Upload failed");
        setSubmitting(false);
        return;
      }
    }
    if (!proof) return;
    setSubmitting(true);
    try {
      const xpResult = await onComplete(goal.id, proof);
      setXpFlash(true);
      setTimeout(() => setXpFlash(false), 1200);
      setShowProof(false);
      if (xpResult && onXPGained) onXPGained(xpResult);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to complete goal");
    } finally {
      setSubmitting(false);
    }
  };

  if (goal.status === "completed") {
    return (
      <div className="relative bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[#34D399] flex-shrink-0">✓</span>
            <span className="text-sm text-slate-300 truncate line-through">{goal.goal_text}</span>
          </div>
          {statDef && (
            <span
              className="font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ color: statDef.color, backgroundColor: statDef.color + "15" }}
            >
              {statDef.label}
            </span>
          )}
        </div>
        {goal.is_public && (
          <EndorsementControls goal={goal} viewerHandle={handle} />
        )}
        {xpFlash && (
          <span className="absolute right-4 -top-5 font-[family-name:var(--font-mono)] text-xs text-[#FBBF24] animate-bounce">+1 XP</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-slate-500 mt-0.5 flex-shrink-0">○</span>
          <span className="text-sm text-slate-200 leading-snug">{goal.goal_text}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {statDef && (
            <span
              className="font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-full"
              style={{ color: statDef.color, backgroundColor: statDef.color + "15" }}
            >
              {statDef.label}
            </span>
          )}
          <button
            onClick={() => setShowProof((v) => !v)}
            className="font-[family-name:var(--font-mono)] text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            {showProof ? "cancel" : "done →"}
          </button>
        </div>
      </div>
      {showProof && (
        <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.05]">
          <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.15em] text-slate-500 uppercase">
            Submit proof ({goal.proof_type})
          </p>
          {goal.proof_type === "link" ? (
            <input
              type="url" placeholder="https://..."
              value={proofValue} onChange={(e) => setProofValue(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-white/20"
            />
          ) : (
            <div
              className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 cursor-pointer hover:border-white/20 transition-all"
              onClick={() => fileRef.current?.click()}
            >
              <span className="text-slate-400 text-xs">{file ? file.name : "Choose screenshot…"}</span>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          )}
          <button
            disabled={submitting || (goal.proof_type === "link" ? !proofValue.trim() : !file)}
            onClick={handleComplete}
            className="w-full rounded-lg bg-white/[0.06] border border-white/[0.1] py-2 text-xs text-slate-200 hover:text-white/90 hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? "Submitting…" : "Mark complete"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── ADD GOAL FORM ──────────────────────────────────────────────────────────
function AddGoalForm({
  onAdd, defaultPublic,
}: {
  onAdd: (text: string, proof: "link" | "screenshot", stat: Goal["target_stat"], isPublic: boolean) => Promise<void>;
  defaultPublic: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [stat, setStat] = useState<Goal["target_stat"]>("focus");
  const [proofType, setProofType] = useState<"link" | "screenshot">("link");
  const [isPublic, setIsPublic] = useState(defaultPublic);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd(text.trim(), proofType, stat, isPublic);
      setText("");
      setOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add goal");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border border-dashed border-white/[0.08] rounded-xl py-3 text-xs text-slate-500 hover:text-slate-300 hover:border-white/[0.15] transition-all"
      >
        + add goal
      </button>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-4 flex flex-col gap-3">
      <input
        autoFocus type="text" placeholder="What will you do today?"
        value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/20"
      />
      <div className="flex items-center gap-2 flex-wrap">
        {STATS.map((s) => (
          <button key={s.key} onClick={() => setStat(s.key as Goal["target_stat"])}
            className="font-[family-name:var(--font-mono)] text-[10px] px-2.5 py-1 rounded-full transition-all"
            style={
              stat === s.key
                ? { color: s.color, backgroundColor: s.color + "20", border: `1px solid ${s.color}40` }
                : { color: "rgba(255,255,255,0.25)", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }
            }
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500 uppercase tracking-[0.15em]">Proof:</span>
          {(["link", "screenshot"] as const).map((p) => (
            <button key={p} onClick={() => setProofType(p)}
              className={`font-[family-name:var(--font-mono)] text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                proofType === p ? "border-white/20 text-slate-200 bg-white/[0.06]" : "border-white/[0.06] text-slate-500 hover:text-slate-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsPublic((v) => !v)}
          className={`ml-auto font-[family-name:var(--font-mono)] text-[10px] px-2.5 py-1 rounded-full border transition-all ${
            isPublic ? "border-white/20 text-slate-200 bg-white/[0.06]" : "border-white/[0.06] text-slate-500 hover:text-slate-300"
          }`}
        >
          {isPublic ? "🌍 Public" : "🔒 Private"}
        </button>
      </div>
      {isPublic && (
        <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500 leading-relaxed">
          Public goals can be endorsed and copied by the community
        </p>
      )}
      <div className="flex gap-2">
        <button
          disabled={!text.trim() || saving} onClick={submit}
          className="flex-1 rounded-lg bg-white/[0.06] border border-white/[0.1] py-2 text-xs text-slate-200 hover:text-white/90 hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          {saving ? "Saving…" : "Add goal"}
        </button>
        <button onClick={() => { setOpen(false); setText(""); }}
          className="px-3 rounded-lg border border-white/[0.06] text-xs text-slate-500 hover:text-slate-300 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── TRENDING GOALS ──────────────────────────────────────────────────────────
function TrendingGoals({
  handle, goalsCount, onUse, accentClass,
}: {
  handle: string; goalsCount: number;
  onUse: (text: string, proof: "link" | "screenshot", stat: Goal["target_stat"], templateId: string) => Promise<void>;
  accentClass: string;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [using, setUsing] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/goals?templates=true&limit=6")
      .then((r) => r.json())
      .then((d) => { console.log("Trending goals response:", d); setTemplates(d.templates ?? []); })
      .catch((e) => console.error("Trending goals error:", e))
      .finally(() => setLoading(false));
  }, []);

  const handleUse = async (t: Template) => {
    if (goalsCount >= 3 || using) return;
    setUsing(t.id);
    try {
      await onUse(t.goal_text, t.proof_type, t.target_stat, t.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to use goal");
    } finally {
      setUsing(null);
    }
  };

  return (
    <div>
      <div className="mb-3">
        <p className={`font-[family-name:var(--font-mono)] text-xs tracking-[0.25em] ${accentClass} uppercase`}>
          Trending in The Darkroom
        </p>
        <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500 mt-0.5">
          Goals other builders are crushing
        </p>
      </div>

      {loading ? (
        <div className="py-6 flex justify-center">
          <div className="w-4 h-4 rounded-full border border-white/15 border-t-white/40 animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl px-5 py-6 text-center">
          <p className="font-[family-name:var(--font-mono)] text-xs text-slate-500">
            Be the first to share a public goal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.filter((t) => t.handle !== handle).map((t) => {
            const statDef = STATS.find((s) => s.key === t.target_stat);
            const isUsing = using === t.id;
            return (
              <div key={t.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-3 hover:border-white/[0.1] transition-all">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-slate-200 leading-snug flex-1">{t.goal_text}</p>
                  {statDef && (
                    <span className="font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ color: statDef.color, backgroundColor: statDef.color + "15" }}>
                      {statDef.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500">@{t.handle}</span>
                    {t.copy_count > 0 && (
                      <span className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500">
                        · Copied {t.copy_count}×
                      </span>
                    )}
                  </div>
                  <button
                    disabled={goalsCount >= 3 || !!using}
                    onClick={() => handleUse(t)}
                    className="font-[family-name:var(--font-mono)] text-[10px] text-slate-300 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    {isUsing ? "Adding…" : "+ Use this"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── DAILY GOALS SECTION ─────────────────────────────────────────────────────
function DailyGoals({
  handle, streak, defaultPublic, onXPGained, onGoalCompleted, accentClass,
}: {
  handle: string; streak: StreakData | null; defaultPublic: boolean;
  onXPGained: (xp: { xp_added: number; points_gained: number; xp_cost: number; new_stat_xp: number }) => void;
  onGoalCompleted?: () => void;
  accentClass: string;
}) {
  const { goals, loading, addGoal, completeGoal } = useGoals(handle);
  const completed = goals.filter((g) => g.status === "completed").length;
  const canAdd = goals.length < 3;

  const handleComplete = useCallback(
    async (id: string, proof: string) => {
      const result = await completeGoal(id, proof);
      onGoalCompleted?.();
      return result;
    },
    [completeGoal, onGoalCompleted]
  );

  const handleAdd = useCallback(
    async (text: string, proof: "link" | "screenshot", stat: Goal["target_stat"], isPublic: boolean) => {
      await addGoal(text, proof, stat, isPublic);
    },
    [addGoal]
  );

  const handleUseTemplate = useCallback(
    async (text: string, proof: "link" | "screenshot", stat: Goal["target_stat"], templateId: string) => {
      await addGoal(text, proof, stat, false, templateId);
    },
    [addGoal]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Daily goals */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className={`font-[family-name:var(--font-mono)] text-xs tracking-[0.25em] ${accentClass} uppercase`}>
            Daily Goals
          </p>
          <div className="flex items-center gap-3">
            {streak && streak.current_streak > 0 && (
              <span className="font-[family-name:var(--font-mono)] text-xs text-slate-400">
                🔥 {streak.current_streak} day streak
              </span>
            )}
            <span className="font-[family-name:var(--font-mono)] text-xs text-slate-500">
              {completed}/3 today
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {loading && goals.length === 0 ? (
            <div className="py-4 text-center">
              <div className="w-4 h-4 rounded-full border border-white/15 border-t-white/40 animate-spin mx-auto" />
            </div>
          ) : (
            <>
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} handle={handle} onComplete={handleComplete} onXPGained={onXPGained} />
              ))}
              {canAdd && <AddGoalForm onAdd={handleAdd} defaultPublic={defaultPublic} />}
              {!canAdd && completed < 3 && (
                <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500 text-center py-1">
                  3 goals set · complete them to earn XP
                </p>
              )}
              {completed === 3 && (
                <p className="font-[family-name:var(--font-mono)] text-[10px] text-[#34D399]/60 text-center py-1">
                  All goals complete — well done.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Trending goals */}
      <TrendingGoals handle={handle} goalsCount={goals.length} onUse={handleUseTemplate} accentClass={accentClass} />
    </div>
  );
}

// ── CARD STYLE SYSTEM ──────────────────────────────────────────────────────
interface CardStyles {
  primaryCard:  string;
  scoreCard:    string;
  nestedCard:   string;
  tabActive:    string;
  primaryBtn:   string;
  secondaryBtn: string;
}

const CARD_STYLE_MAP: Record<string, CardStyles> = {
  cyan: {
    primaryCard:  "bg-gradient-to-br from-cyan-950/20 to-[#0c0c14] border border-cyan-500/10 shadow-[0_0_15px_rgba(0,200,255,0.04)] hover:shadow-[0_0_25px_rgba(0,200,255,0.08)] hover:border-cyan-500/15 transition-all",
    scoreCard:    "bg-gradient-to-b from-cyan-950/30 to-[#0c0c14] border border-cyan-500/10 shadow-[0_0_15px_rgba(0,200,255,0.04)]",
    nestedCard:   "bg-[#12121e] border border-white/[0.06] shadow-[0_0_15px_rgba(0,200,255,0.03)]",
    tabActive:    "border-cyan-400 shadow-[0_2px_10px_rgba(0,200,255,0.2)]",
    primaryBtn:   "border border-cyan-500/20 shadow-[0_0_20px_rgba(0,200,255,0.15)] hover:shadow-[0_0_30px_rgba(0,200,255,0.25)]",
    secondaryBtn: "border border-cyan-500/20 shadow-[0_0_12px_rgba(0,200,255,0.08)] hover:shadow-[0_0_20px_rgba(0,200,255,0.15)] hover:border-cyan-500/30 hover:bg-cyan-500/5",
  },
  violet: {
    primaryCard:  "bg-gradient-to-br from-violet-950/20 to-[#0c0c14] border border-violet-500/10 shadow-[0_0_15px_rgba(140,80,255,0.04)] hover:shadow-[0_0_25px_rgba(140,80,255,0.08)] hover:border-violet-500/15 transition-all",
    scoreCard:    "bg-gradient-to-b from-violet-950/30 to-[#0c0c14] border border-violet-500/10 shadow-[0_0_15px_rgba(140,80,255,0.04)]",
    nestedCard:   "bg-[#12121e] border border-white/[0.06] shadow-[0_0_15px_rgba(140,80,255,0.03)]",
    tabActive:    "border-violet-400 shadow-[0_2px_10px_rgba(140,80,255,0.2)]",
    primaryBtn:   "border border-violet-500/20 shadow-[0_0_20px_rgba(140,80,255,0.15)] hover:shadow-[0_0_30px_rgba(140,80,255,0.25)]",
    secondaryBtn: "border border-violet-500/20 shadow-[0_0_12px_rgba(140,80,255,0.08)] hover:shadow-[0_0_20px_rgba(140,80,255,0.15)] hover:border-violet-500/30 hover:bg-violet-500/5",
  },
  emerald: {
    primaryCard:  "bg-gradient-to-br from-emerald-950/20 to-[#0c0c14] border border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.04)] hover:shadow-[0_0_25px_rgba(16,185,129,0.08)] hover:border-emerald-500/15 transition-all",
    scoreCard:    "bg-gradient-to-b from-emerald-950/30 to-[#0c0c14] border border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.04)]",
    nestedCard:   "bg-[#12121e] border border-white/[0.06] shadow-[0_0_15px_rgba(16,185,129,0.03)]",
    tabActive:    "border-emerald-400 shadow-[0_2px_10px_rgba(16,185,129,0.2)]",
    primaryBtn:   "border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.25)]",
    secondaryBtn: "border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.08)] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:border-emerald-500/30 hover:bg-emerald-500/5",
  },
  amber: {
    primaryCard:  "bg-gradient-to-br from-amber-950/20 to-[#0c0c14] border border-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.04)] hover:shadow-[0_0_25px_rgba(245,158,11,0.08)] hover:border-amber-500/15 transition-all",
    scoreCard:    "bg-gradient-to-b from-amber-950/30 to-[#0c0c14] border border-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.04)]",
    nestedCard:   "bg-[#12121e] border border-white/[0.06] shadow-[0_0_15px_rgba(245,158,11,0.03)]",
    tabActive:    "border-amber-400 shadow-[0_2px_10px_rgba(245,158,11,0.2)]",
    primaryBtn:   "border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_30px_rgba(245,158,11,0.25)]",
    secondaryBtn: "border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.08)] hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:border-amber-500/30 hover:bg-amber-500/5",
  },
};

function getCardStyle(accent: string): CardStyles {
  return CARD_STYLE_MAP[accent] ?? CARD_STYLE_MAP.cyan;
}

function getButtonStyle(accent: string, variant: "primary" | "secondary"): string {
  const cs = getCardStyle(accent);
  return variant === "primary" ? cs.primaryBtn : cs.secondaryBtn;
}

const ACCENT_HEX: Record<string, string> = {
  cyan:    "#67e8f9",
  violet:  "#c4b5fd",
  emerald: "#6ee7b7",
  amber:   "#fcd34d",
};

const TABS = [
  { id: "id", label: "ID" },
  { id: "work", label: "Work" },
  { id: "settings", label: "Settings" },
] as const;

type TabId = typeof TABS[number]["id"];

// ── ONBOARDING BANNER ──────────────────────────────────────────────────────
function OnboardingBanner({
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
        {/* Left: title + count */}
        <div className="flex-shrink-0">
          <p className="text-sm font-bold text-white leading-tight">Getting started</p>
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
            {allDone ? "All done! You're set." : `${completed}/4 complete`}
          </p>
        </div>

        {/* Steps */}
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

        {/* Dismiss */}
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

// ── WORK TAB ───────────────────────────────────────────────────────────────
function WorkTab({
  handle, goalsPublic, accentClass, accent, onXPGained,
}: {
  handle: string;
  goalsPublic: boolean;
  accentClass: string;
  accent: string;
  onXPGained: (xp: { xp_added: number; points_gained: number; xp_cost: number; new_stat_xp: number }) => void;
}) {
  const cs = getCardStyle(accent);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [targetStat, setTargetStat] = useState<Goal["target_stat"]>("focus");
  const [isPublic, setIsPublic] = useState(goalsPublic);
  const [submitting, setSubmitting] = useState(false);
  const [works, setWorks] = useState<Goal[]>([]);
  const [loadingWorks, setLoadingWorks] = useState(true);

  useEffect(() => {
    fetch(`/api/goals?handle=${encodeURIComponent(handle)}&all=true&completed=true`)
      .then((r) => r.json())
      .then((d) => setWorks(d.goals ?? []))
      .catch(() => {})
      .finally(() => setLoadingWorks(false));
  }, [handle]);

  const submit = async () => {
    if (!url.trim() || !description.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle,
          goal_text: description,
          proof_type: "link",
          proof_value: url.trim(),
          target_stat: targetStat,
          is_public: isPublic,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setWorks((prev) => [data.goal, ...prev]);
      if (data.xp) onXPGained(data.xp);
      setUrl("");
      setDescription("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Add Proof of Work */}
      <div className={`${cs.primaryCard} rounded-xl p-5 flex flex-col gap-4`}>
        <p className={`font-[family-name:var(--font-mono)] text-xs tracking-[0.25em] ${accentClass} uppercase`}>
          Add Proof of Work
        </p>

        <input
          type="url"
          placeholder="https://github.com/..., x.com/..., youtube.com/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/20 transition-colors"
        />

        <div className="relative">
          <input
            type="text"
            placeholder="shipped a new feature, wrote an article, etc."
            value={description}
            maxLength={140}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 pr-16 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/20 transition-colors"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-[family-name:var(--font-mono)] text-[10px] text-slate-500 pointer-events-none">
            {description.length}/140
          </span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {STATS.map((s) => (
            <button
              key={s.key}
              onClick={() => setTargetStat(s.key as Goal["target_stat"])}
              className="font-[family-name:var(--font-mono)] text-[10px] px-2.5 py-1 rounded-full transition-all"
              style={
                targetStat === s.key
                  ? { color: s.color, backgroundColor: s.color + "20", border: `1px solid ${s.color}40` }
                  : { color: "rgba(255,255,255,0.25)", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }
              }
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPublic((v) => !v)}
            className={`font-[family-name:var(--font-mono)] text-[10px] px-2.5 py-1 rounded-full border transition-all ${
              isPublic ? "border-white/20 text-slate-200 bg-white/[0.06]" : "border-white/[0.06] text-slate-500 hover:text-slate-300"
            }`}
          >
            {isPublic ? "🌍 Public" : "🔒 Private"}
          </button>
          <button
            disabled={!url.trim() || !description.trim() || submitting}
            onClick={submit}
            className={`ml-auto rounded-lg bg-white/[0.06] px-5 py-2 text-sm text-slate-200 hover:text-white hover:bg-white/[0.1] disabled:opacity-30 disabled:cursor-not-allowed transition-all ${cs.primaryBtn}`}
          >
            {submitting ? "Submitting…" : "Submit →"}
          </button>
        </div>
      </div>

      {/* Section 2: Your Work */}
      <div>
        <p className={`font-[family-name:var(--font-mono)] text-xs tracking-[0.25em] ${accentClass} uppercase mb-3`}>
          Your Work
        </p>
        {loadingWorks ? (
          <div className="py-6 flex justify-center">
            <div className="w-4 h-4 rounded-full border border-white/15 border-t-white/40 animate-spin" />
          </div>
        ) : works.length === 0 ? (
          <div className={`${cs.nestedCard} rounded-xl px-5 py-8 text-center`}>
            <p className="font-[family-name:var(--font-mono)] text-xs text-slate-500">
              No work submitted yet. Start building.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {works.map((w) => {
              const statDef = STATS.find((s) => s.key === w.target_stat);
              return (
                <div key={w.id} className={`${cs.nestedCard} rounded-xl px-4 py-3 flex flex-col gap-2`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-slate-200 leading-snug flex-1">{w.goal_text}</p>
                    {statDef && (
                      <span
                        className="font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ color: statDef.color, backgroundColor: statDef.color + "15" }}
                      >
                        {statDef.label}
                      </span>
                    )}
                  </div>
                  {w.proof_value && (
                    <a
                      href={w.proof_value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-[family-name:var(--font-mono)] text-[11px] text-slate-400 hover:text-slate-200 truncate transition-colors"
                    >
                      {w.proof_value}
                    </a>
                  )}
                  <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500">
                    {new Date(w.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {w.is_public && <span className="ml-2 text-slate-600">· public</span>}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expandedStat, setExpandedStat] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("id");
  const [profilePublic, setProfilePublic] = useState(false);
  const [goalsPublic, setGoalsPublic] = useState(false);
  const [accent, setAccent] = useState("cyan");
  const [linkCopied, setLinkCopied] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [hasShared, setHasShared] = useState(false);
  const { messages: toastMessages, showToast } = useToast();

  const handleXPGained = useCallback(
    (xp: { xp_added: number; points_gained: number; xp_cost: number; new_stat_xp: number }) => {
      if (xp.points_gained > 0) {
        showToast(`+${xp.xp_added} XP → +${xp.points_gained} point${xp.points_gained > 1 ? "s" : ""}!`);
      } else {
        showToast(`+${xp.xp_added} XP (${xp.new_stat_xp}/${xp.xp_cost} to next point)`);
      }
    },
    [showToast]
  );

  const fetchDashboard = useCallback((handle: string) => {
    fetch(`/api/dashboard?handle=${encodeURIComponent(handle)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setNotFound(true); return; }
        setData(d);
        setProfilePublic(d.profile_public ?? false);
        setGoalsPublic(d.goals_public ?? false);
        setAccent(d.theme_accent ?? "cyan");
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus === "unauthenticated") { router.replace("/login"); return; }
    const handle = (session as any)?.handle as string | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!handle) { router.replace("/login"); return; }
    if (localStorage.getItem("darkroom_onboarding_complete") !== "true") setOnboardingVisible(true); // eslint-disable-line react-hooks/set-state-in-effect
    if (localStorage.getItem("darkroom_shared") === "true") setHasShared(true); // eslint-disable-line react-hooks/set-state-in-effect
    fetchDashboard(handle);
  }, [authStatus, session, router, fetchDashboard]);

  const dismissOnboarding = useCallback(() => {
    localStorage.setItem("darkroom_onboarding_complete", "true");
    setOnboardingVisible(false);
  }, []);

  const handleShare = useCallback(() => {
    localStorage.setItem("darkroom_shared", "true");
    setHasShared(true);
  }, []);

  const toggleStat = (key: string) => setExpandedStat((prev) => (prev === key ? null : key));

  if (authStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
        <Navbar />
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="text-center flex flex-col gap-4">
            <p className="text-slate-300 text-sm">No Darkroom ID found.</p>
            <a href="/darkroom-id"
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black hover:-translate-y-0.5 transition-all">
              Take the quiz →
            </a>
          </div>
        </main>
      </div>
    );
  }

  if (!data) return null;

  const bonusPoints = data.bonus_points ?? 0;
  const totalScore = data.total_score ?? data.score + bonusPoints;
  const accentCls = getAccent(accent).primary;
  const cs = getCardStyle(accent);
  const daysLeft = daysUntilReclaim(data.updated_at);
  const canReclaim = daysLeft <= 0;
  const streak = data.streak;
  const claimDate = formatDate(data);
  const profileLink = `${SITE_URL}/p/${data.handle}`;

  return (
    <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
      <Toast messages={toastMessages} />
      <Navbar />

      {/* ── TAB BAR — first thing after navbar ── */}
      <div className="sticky top-10 z-40 bg-[#050508] border-b border-white/5 py-3 pt-14">
        <div className="mx-auto max-w-md flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center px-6 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? `text-white border-b-2 ${cs.tabActive}`
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <main className="pb-24">
        {/* Onboarding banner */}
        {onboardingVisible && (
          <div className="mx-auto max-w-4xl px-6 pt-6">
            <OnboardingBanner
              handle={data.handle}
              profilePublic={profilePublic}
              hasShared={hasShared}
              accent={accent}
              onSwitchTab={setActiveTab}
              onDismiss={dismissOnboarding}
            />
          </div>
        )}

        {/* ── TAB 1: ID ── */}
        {activeTab === "id" && (
          <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">

            {/* Header card */}
            <div className={`${cs.primaryCard} rounded-2xl p-6 flex items-center gap-5`}>
              <ProfileImage url={data.profile_image_url} handle={data.handle} size={80} />
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-extrabold tracking-tight text-white">@{data.handle}</h1>
                  {streak && streak.current_streak > 0 && (
                    <span className="bg-white/[0.05] border border-white/[0.08] text-slate-300 text-xs px-2.5 py-1 rounded-full flex-shrink-0">
                      🔥 {streak.current_streak} day streak
                    </span>
                  )}
                </div>
                <p className="text-slate-200 font-semibold text-sm">{data.archetype}</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="font-[family-name:var(--font-mono)] text-2xl font-bold text-white">{totalScore}</span>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-slate-500">/100</span>
                </div>
              </div>
            </div>

            {/* Score overview */}
            <div className={`${cs.scoreCard} rounded-xl p-6 text-center flex flex-col gap-2`}>
              <p className={`font-[family-name:var(--font-mono)] text-xs tracking-[0.25em] ${accentCls} uppercase`}>
                Darkroom Score
              </p>
              <div className="font-[family-name:var(--font-mono)] text-[72px] lg:text-[96px] font-bold leading-none text-white">
                {totalScore}
              </div>
              {bonusPoints > 0 ? (
                <p className="font-[family-name:var(--font-mono)] text-xs text-slate-400">
                  Base: {data.score} + Bonus: {bonusPoints}
                </p>
              ) : (
                <p className="font-[family-name:var(--font-mono)] text-xs text-slate-500">
                  Base score · up to +25 pts from lessons &amp; certs
                </p>
              )}
              {(data.total_xp ?? 0) > 0 && (
                <p className="font-[family-name:var(--font-mono)] text-xs text-slate-500">
                  {data.total_xp} XP earned total
                </p>
              )}
              <div className="mt-3 text-lg font-extrabold tracking-tight text-white">{data.archetype}</div>
              <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.15em] text-white/45 uppercase">{data.tagline}</p>
            </div>

            {/* Stat cards */}
            <div>
              <p className={`font-[family-name:var(--font-mono)] text-xs tracking-[0.25em] ${accentCls} uppercase mb-3`}>Stats</p>
              <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500 mb-3">Tap a stat to expand</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {(() => {
                  const s = (data.stats ?? {}) as Record<string, number>;
                  return STATS.map((stat) => {
                    const value = s[stat.key] ?? s[stat.fallback] ?? 0;
                    return (
                      <div key={stat.key} className="h-fit">
                        <StatCard
                          statKey={stat.key} label={stat.label} value={value} color={stat.color}
                          expanded={expandedStat === stat.key} onToggle={() => toggleStat(stat.key)}
                          statXp={data.stat_xp?.[stat.key] ?? 0}
                          totalScore={totalScore}
                          cardCls={cs.primaryCard}
                        />
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Analysis */}
            <div className={`${cs.primaryCard} rounded-xl p-5`}>
              <p className={`font-[family-name:var(--font-mono)] text-xs tracking-[0.25em] ${accentCls} uppercase mb-3`}>Analysis</p>
              <p className="text-sm text-slate-200 leading-7">{data.analysis}</p>
              <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.1em] text-slate-300 italic mt-4">{data.darkroom_line}</p>
            </div>

            {/* Card preview */}
            <div>
              <p className={`font-[family-name:var(--font-mono)] text-xs tracking-[0.25em] ${accentCls} uppercase mb-3`}>Your Card</p>
              <div className="max-w-2xl">
                <CardGenerator
                  handle={data.handle} score={data.score} archetype={data.archetype}
                  tagline={data.tagline} stats={data.stats} analysis={data.analysis}
                  darkroomLine={data.darkroom_line} profileImageUrl={data.profile_image_url}
                  onShare={handleShare}
                />
              </div>
            </div>

            {/* Journey timeline */}
            <div className={`${cs.primaryCard} rounded-xl p-5`}>
              <p className={`font-[family-name:var(--font-mono)] text-xs tracking-[0.25em] ${accentCls} uppercase mb-4`}>Your Journey</p>
              <div className="flex flex-col gap-0">
                {Array.from({ length: data.claim_count }, (_, i) => {
                  const isLatest = i === data.claim_count - 1;
                  const isFirst = i === 0;
                  return (
                    <div key={i} className="flex items-start gap-4 relative">
                      <div className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${isLatest ? "bg-white/60" : "bg-white/20"}`} />
                        {i < data.claim_count - 1 && <div className="w-px flex-1 bg-white/[0.06] min-h-[28px]" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm text-white font-medium">
                          Claim #{i + 1}
                          {isLatest && data.claim_count > 1 && <span className="ml-2 text-xs text-slate-400">(latest)</span>}
                        </p>
                        <p className="font-[family-name:var(--font-mono)] text-xs text-slate-400 mt-0.5">
                          {isFirst ? claimDate : formatDate(data)} · Score {data.score}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-white/[0.05]">
                  {[{ label: "Lessons completed", value: "0" }, { label: "Certifications earned", value: "0" }].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center opacity-40">
                      <span className="text-xs text-slate-300">{label}</span>
                      <span className="font-[family-name:var(--font-mono)] text-xs text-slate-400">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Coming soon */}
            <div className={`${cs.nestedCard} rounded-xl px-5 py-4 text-center`}>
              <p className="font-[family-name:var(--font-mono)] text-xs text-slate-400">
                Lessons &amp; Certifications coming soon.
              </p>
              <p className="font-[family-name:var(--font-mono)] text-xs text-slate-500 mt-1">
                Your score has room to grow. Stay in The Darkroom.
              </p>
            </div>
          </div>
        )}

        {/* ── TAB 2: WORK ── */}
        {activeTab === "work" && (
          <div className="mx-auto max-w-4xl px-6 py-8">
            <WorkTab
              handle={data.handle}
              goalsPublic={goalsPublic}
              accentClass={accentCls}
              accent={accent}
              onXPGained={handleXPGained}
            />
          </div>
        )}

        {/* ── TAB 3: SETTINGS ── */}
        {activeTab === "settings" && (
          <div className="mx-auto max-w-lg px-6 py-8 space-y-6">

            {profilePublic && (
              <div className={`${cs.nestedCard} flex items-center justify-between gap-4 rounded-xl px-5 py-3`}>
                <p className="font-[family-name:var(--font-mono)] text-xs text-slate-300">
                  🌍 Your profile is public · <span className="text-slate-500">{profileLink}</span>
                </p>
                <button
                  onClick={() => { copyToClipboard(profileLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }}
                  className="flex-shrink-0 font-[family-name:var(--font-mono)] text-[10px] text-slate-400 hover:text-slate-200 border border-white/[0.06] hover:border-white/20 rounded-full px-3 py-1 transition-all"
                >
                  {linkCopied ? "Copied!" : "Copy link"}
                </button>
              </div>
            )}

            <SettingsPanel
              handle={data.handle}
              initial={{ profile_public: profilePublic, goals_public: goalsPublic, theme_accent: accent }}
              onSaved={(s) => { setProfilePublic(s.profile_public); setGoalsPublic(s.goals_public); setAccent(s.theme_accent); }}
              onAccentChange={setAccent}
            />

            {canReclaim ? (
              <button onClick={() => router.push("/darkroom-id")}
                className={`w-full rounded-xl px-5 py-3 text-sm text-slate-300 hover:text-white transition-all ${cs.secondaryBtn}`}>
                Reclaim ID →
              </button>
            ) : (
              <div className="w-full rounded-xl border border-white/[0.05] px-5 py-3 text-sm text-slate-500 text-center cursor-not-allowed select-none">
                Reclaim in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
              </div>
            )}

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors text-center py-2">
              Sign out
            </button>
          </div>
        )}

      </main>
    </div>
  );
}

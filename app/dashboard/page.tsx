"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Navbar from "../component/landing/Navbar";
import CardGenerator from "../component/darkroom-id/CardGenerator";
import { getAccent } from "../lib/theme";

// Dashboard sub-modules
import { Toast, useToast } from "./_Toast";
import { getCardStyle, getButtonStyle, ACCENT_HEX, TABS, formatDate, daysUntilReclaim, copyToClipboard } from "./_styles";
import type { TabId } from "./_styles";
import type { DashboardData } from "./_types";
import { SITE_URL } from "./_types";
import { SettingsPanel } from "./SettingsPanel";
import { WorkTab } from "./WorkTab";
import { ProofRing, getSocialAdvice, getBuilderAdvice } from "./StatsPanel";
import ChatWidget from "../component/ChatWidget";

// ── Local helpers (small, used only in this file) ──────────────────────────
function PfpPlaceholder({ handle, size }: { handle: string; size: number }) {
  return (
    <div
      className="rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="text-white/75 font-bold" style={{ fontSize: size * 0.38 }}>
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

// ── Tour steps ─────────────────────────────────────────────────────────────
const TOUR_STEPS = [
  {
    title: "Welcome to The Darkroom",
    icon: "◈",
    iconColor: "#c9a84c",
    content: "This is your Builder OS. Everything here is based on real signals — not vanity metrics. Let's walk through what you're looking at.",
    hint: null,
  },
  {
    title: "Social Proof",
    icon: "◉",
    iconColor: "#c9a84c",
    content: "Analyzes your X presence — posting consistency, engagement quality, and how clearly you're positioning yourself. Refreshed by Claude via your X activity.",
    hint: "Tap the ring anytime to get personalized advice on improving this score.",
  },
  {
    title: "Builder Proof",
    icon: "◉",
    iconColor: "#c9a84c",
    content: "Measures your technical builder signal — code shared, projects mentioned, build-in-public activity. The deeper your content, the higher this goes.",
    hint: "Tap the ring for tier-specific advice on what to post.",
  },
  {
    title: "Work Proof",
    icon: "◉",
    iconColor: "#c9a84c",
    content: "Unlike the other two, this score starts at 0 and is 100% in your hands. Submit links to real work you've done — projects, PRs, articles, prototypes.",
    hint: "Head to the Work tab to submit your first proof.",
  },
  {
    title: "Daily Refresh",
    icon: "↻",
    iconColor: "#c9a84c",
    content: "Once a day, you can refresh your Social and Builder scores. Claude re-analyzes your latest X activity. Make it a daily ritual — post something, then refresh.",
    hint: "The refresh button is in the Proof section header.",
  },
  {
    title: "Work Tab",
    icon: "⬡",
    iconColor: "#c9a84c",
    content: "Submit concrete proofs of work here — a GitHub link, a deployed project, a published article. Each validated proof grows your Work Proof score.",
    hint: "3 community endorsements = a validated proof.",
  },
] as const;

// ── Main page ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [proofModal, setProofModal] = useState<{ type: "social" | "builder"; value: number; color: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("id");
  const [profilePublic, setProfilePublic] = useState(false);
  const [goalsPublic, setGoalsPublic] = useState(false);
  const [accent, setAccent] = useState("cyan");
  const [openToOpportunities, setOpenToOpportunities] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const { messages: toastMessages, showToast } = useToast();

  const fetchDashboard = useCallback((handle: string) => {
    fetch(`/api/dashboard?handle=${encodeURIComponent(handle)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setNotFound(true); return; }
        setData(d);
        setProfilePublic(d.profile_public ?? false);
        setGoalsPublic(d.goals_public ?? false);
        setAccent(d.theme_accent ?? "cyan");
        setOpenToOpportunities(d.open_to_opportunities ?? false);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, []);

  const handleXPGained = useCallback(
    (xp: { xp_added: number; points_gained: number; xp_cost: number; new_stat_xp: number }) => {
      if (xp.points_gained > 0) {
        showToast(`+${xp.xp_added} XP → +${xp.points_gained} point${xp.points_gained > 1 ? "s" : ""}!`);
      } else {
        showToast(`+${xp.xp_added} XP (${xp.new_stat_xp}/${xp.xp_cost} to next point)`);
      }
      const handle = (session as { handle?: string } | null)?.handle;
      if (handle) fetchDashboard(handle);
    },
    [showToast, session, fetchDashboard]
  );

  const handleWorkProofRecalculated = useCallback(() => {
    const handle = (session as { handle?: string } | null)?.handle;
    if (handle) fetchDashboard(handle);
  }, [session, fetchDashboard]);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus === "unauthenticated") { router.replace("/login"); return; }
    const handle = session?.handle;
    if (!handle) { router.replace("/login"); return; }
    fetchDashboard(handle);
  }, [authStatus, session, router, fetchDashboard]);

  const handleShare = useCallback(() => {
    localStorage.setItem("darkroom_shared", "true");
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<string>).detail;
      if (tab === "id" || tab === "work" || tab === "settings") setActiveTab(tab as TabId);
    };
    window.addEventListener("darkroom:switchTab", handler);
    return () => window.removeEventListener("darkroom:switchTab", handler);
  }, []);

  // ── Loading / error states ──
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
            <p className="text-white/75 text-sm">No Darkroom ID found.</p>
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
      <ChatWidget
        handle={data.handle}
        accent={accent}
        profilePublic={profilePublic}
        onSwitchTab={(tab) => setActiveTab(tab as TabId)}
      />

      {/* ── LEFT SIDEBAR ── */}
      <div className="fixed left-0 top-12 bottom-0 z-40 w-16 lg:w-48 flex flex-col border-r border-white/[0.06]">
        <div className="flex flex-col gap-1 px-2 py-6 flex-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={isActive ? { borderColor: "rgba(201,168,76,0.45)", color: "#c9a84c" } : { borderColor: "transparent" }}
                className={`flex items-center gap-3 rounded-sm border px-3 py-2.5 transition-all w-full text-left ${
                  isActive ? "" : "text-white/50 hover:text-white hover:border-white/[0.15]"
                }`}
              >
                <span className="flex-shrink-0 w-5 h-5">
                  {tab.id === "id" && (
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  )}
                  {tab.id === "work" && (
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                    </svg>
                  )}
                  {tab.id === "settings" && (
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </span>
                <span className="hidden lg:block font-[family-name:var(--font-mono)] text-xs tracking-[0.15em] uppercase">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <main className="pt-12 pb-24 ml-16 lg:ml-48">

        {/* ── TAB 1: ID ── */}
        {activeTab === "id" && (
          <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">

            {/* Top row: score left + PFP right */}
            <div className="flex items-start justify-between gap-6">
              <div className={`${cs.scoreCard} rounded-xl p-5 flex flex-col gap-1 flex-1`}>
                <p className={`font-[family-name:var(--font-mono)] text-xs tracking-[0.25em] ${accentCls} uppercase`}>
                  Room Score
                </p>
                <div className="font-[family-name:var(--font-mono)] text-[64px] lg:text-[80px] font-bold leading-none text-white">
                  {totalScore}
                </div>
                {bonusPoints > 0 ? (
                  <p className="font-[family-name:var(--font-mono)] text-xs text-white/55">
                    Base {data.score} + {bonusPoints} bonus
                  </p>
                ) : (
                  <p className="font-[family-name:var(--font-mono)] text-xs text-white/40">
                    Base score · earn up to +25 from certs
                  </p>
                )}
                <div className="mt-2 text-base font-extrabold tracking-tight text-white">{data.archetype}</div>
                <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.15em] text-white/45 uppercase">{data.tagline}</p>
                {streak && streak.current_streak > 0 && (
                  <span className="mt-2 self-start bg-white/[0.05] border border-white/[0.08] text-white/75 text-xs px-2.5 py-1 rounded-full">
                    🔥 {streak.current_streak} day streak
                  </span>
                )}
              </div>

              {/* PFP with hover score overlay */}
              <div className="group relative flex flex-col items-center gap-1.5 flex-shrink-0 pt-1">
                <div className="relative">
                  <ProfileImage url={data.profile_image_url} handle={data.handle} size={72} />
                  <div className="absolute inset-0 rounded-full bg-black/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className={`font-[family-name:var(--font-mono)] text-xl font-bold ${accentCls}`}>{totalScore}</span>
                    <span className="font-[family-name:var(--font-mono)] text-[9px] text-white/55">/100</span>
                  </div>
                </div>
                <span className="text-sm font-medium text-white">@{data.handle}</span>
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/40">{data.archetype}</span>
                <span className="font-[family-name:var(--font-mono)] text-[9px] text-white/35">hover to see score</span>
              </div>
            </div>

            {/* Proof rings */}
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="flex justify-center gap-10">
                <ProofRing
                  value={data.social_proof ?? 0}
                  color="rgba(255,255,255,0.75)"
                  label="Social"
                  sublabel="Proof"
                  hint="tap for insights"
                  onClick={() => setProofModal({ type: "social", value: data.social_proof ?? 0, color: "rgba(255,255,255,0.75)" })}
                />
                <ProofRing
                  value={data.builder_proof ?? 0}
                  color="rgba(255,255,255,0.75)"
                  label="Builder"
                  sublabel="Proof"
                  hint="tap for insights"
                  onClick={() => setProofModal({ type: "builder", value: data.builder_proof ?? 0, color: "rgba(255,255,255,0.75)" })}
                />
              </div>

              {/* Work Proof ring — smaller, centered below */}
              {(() => {
                const wp = data.work_proof ?? 0;
                const size = 120;
                const strokeWidth = 6;
                const radius = (size - strokeWidth) / 2;
                const circumference = 2 * Math.PI * radius;
                const offset = circumference - (wp / 100) * circumference;
                return (
                  <div className="group flex flex-col items-center gap-2">
                    <div
                      className="relative transition-all duration-300 group-hover:scale-105"
                      style={{ width: size, height: size }}
                    >
                      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                        <circle cx={size / 2} cy={size / 2} r={radius}
                          fill="none" stroke="rgba(201,168,76,0.15)" strokeWidth={strokeWidth} />
                        <circle cx={size / 2} cy={size / 2} r={radius}
                          fill="none" stroke="#c9a84c" strokeWidth={strokeWidth}
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          style={{ transition: "stroke-dashoffset 700ms ease-out" }} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span
                          className="text-2xl font-bold"
                          style={{ color: "#c9a84c", opacity: wp === 0 ? 0.4 : 1 }}
                        >
                          {wp}
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.2em] uppercase" style={{ color: "#c9a84c" }}>WORK</p>
                      <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/40 tracking-[0.15em] uppercase">PROOF</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("work")}
                      className="font-[family-name:var(--font-mono)] text-[10px] text-white/35 hover:text-white/55 cursor-pointer transition-colors"
                    >
                      Submit proofs in Work tab →
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Analysis collapsible */}
            <div className={`${cs.primaryCard} rounded-xl p-5`}>
              <div className="flex items-center justify-between">
                <p className={`font-[family-name:var(--font-mono)] text-xs tracking-[0.25em] ${accentCls} uppercase`}>Analysis</p>
                <button
                  onClick={() => setAnalysisOpen((v) => !v)}
                  className="font-[family-name:var(--font-mono)] text-[10px] text-white/40 hover:text-white/75 transition-colors"
                >
                  {analysisOpen ? "Collapse ↑" : "Read analysis ↓"}
                </button>
              </div>
              <div
                style={{ maxHeight: analysisOpen ? "600px" : "0", overflow: "hidden", transition: "max-height 350ms ease" }}
              >
                <p className="text-sm text-slate-200 leading-7 mt-3">{data.analysis}</p>
                <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.1em] text-white/75 italic mt-4">{data.darkroom_line}</p>
              </div>
            </div>

            {/* 2-col: share card + journey */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
                <p className={`font-[family-name:var(--font-mono)] text-xs tracking-[0.25em] ${accentCls} uppercase mb-3`}>Your Card</p>
                <CardGenerator
                  handle={data.handle}
                  score={data.score}
                  archetype={data.archetype}
                  tagline={data.tagline}
                  analysis={data.analysis}
                  darkroomLine={data.darkroom_line}
                  profileImageUrl={data.profile_image_url}
                  socialProof={data.social_proof ?? 0}
                  builderProof={data.builder_proof ?? 0}
                  workProof={data.work_proof ?? 0}
                  onShare={handleShare}
                />
              </div>

              {data.updated_at && (Date.now() - new Date(data.updated_at).getTime()) > 7 * 24 * 60 * 60 * 1000 && (
                <button
                  onClick={() => { window.location.href = "/darkroom-id?reanalyze=1"; }}
                  className="w-full rounded-sm border border-white/[0.07] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04] py-3 font-[family-name:var(--font-mono)] text-xs text-white/55 hover:text-white transition-all tracking-widest uppercase"
                >
                  ↻ Re-analyze my ID
                </button>
              )}
            </div>

            {/* Coming soon */}
            <div className={`${cs.nestedCard} rounded-xl px-5 py-4 text-center`}>
              <p className="font-[family-name:var(--font-mono)] text-xs text-white/55">
                Lessons &amp; Certifications coming soon.
              </p>
              <p className="font-[family-name:var(--font-mono)] text-xs text-white/40 mt-1">
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
              onRecalculated={handleWorkProofRecalculated}
            />
          </div>
        )}

        {/* ── TAB 3: SETTINGS ── */}
        {activeTab === "settings" && (
          <div className="mx-auto max-w-lg px-6 py-8 space-y-6">

            {profilePublic && (
              <div className={`${cs.nestedCard} flex items-center justify-between gap-4 rounded-xl px-5 py-3`}>
                <p className="font-[family-name:var(--font-mono)] text-xs text-white/75">
                  🌍 Your profile is public · <span className="text-white/40">{profileLink}</span>
                </p>
                <button
                  onClick={() => { copyToClipboard(profileLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }}
                  className="flex-shrink-0 font-[family-name:var(--font-mono)] text-[10px] text-white/55 hover:text-slate-200 border border-white/[0.06] hover:border-white/20 rounded-full px-3 py-1 transition-all"
                >
                  {linkCopied ? "Copied!" : "Copy link"}
                </button>
              </div>
            )}

            <SettingsPanel
              handle={data.handle}
              initial={{ profile_public: profilePublic, goals_public: goalsPublic, theme_accent: accent, open_to_opportunities: openToOpportunities }}
              onSaved={(s) => { setProfilePublic(s.profile_public); setGoalsPublic(s.goals_public); setAccent(s.theme_accent); setOpenToOpportunities(s.open_to_opportunities); }}
              onAccentChange={setAccent}
            />

            {canReclaim ? (
              <button onClick={() => router.push("/darkroom-id?reanalyze=1")}
                className={`w-full rounded-xl px-5 py-3 text-sm text-white/75 hover:text-white transition-all ${cs.secondaryBtn}`}>
                Reclaim ID →
              </button>
            ) : (
              <div className="w-full rounded-xl border border-white/[0.05] px-5 py-3 text-sm text-white/40 text-center cursor-not-allowed select-none">
                Reclaim in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
              </div>
            )}

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full text-xs text-white/40 hover:text-white/75 transition-colors text-center py-2">
              Sign out
            </button>
          </div>
        )}

      </main>

      {/* ── TOUR BUTTON ── */}
      <button
        onClick={() => setTourStep(0)}
        className="fixed bottom-6 right-[4.5rem] z-40 text-xs font-[family-name:var(--font-mono)] px-3 py-2 rounded-sm bg-[#0c0c14] border border-white/10 text-white/55 hover:text-white hover:border-white/20 transition-all tracking-widest"
      >
        ◈ Discover
      </button>

      {/* ── TOUR MODAL ── */}
      {tourStep !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="max-w-sm w-full bg-[#0c0c14] border border-white/[0.10] rounded-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/35 tracking-widest">
                STEP {tourStep + 1} / {TOUR_STEPS.length}
              </span>
              <button onClick={() => setTourStep(null)} className="text-white/35 hover:text-white text-lg leading-none transition-colors">×</button>
            </div>
            <div className="w-full h-[2px] bg-white/5 rounded-full">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${((tourStep + 1) / TOUR_STEPS.length) * 100}%`,
                  backgroundColor: TOUR_STEPS[tourStep].iconColor,
                }}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl" style={{ color: TOUR_STEPS[tourStep].iconColor }}>
                {TOUR_STEPS[tourStep].icon}
              </span>
              <h3 className="text-white font-bold text-base">{TOUR_STEPS[tourStep].title}</h3>
            </div>
            <p className="text-white/75 text-sm leading-relaxed">
              {TOUR_STEPS[tourStep].content}
            </p>
            {TOUR_STEPS[tourStep].hint && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-sm px-4 py-3">
                <p className="font-[family-name:var(--font-mono)] text-white/40 text-xs leading-relaxed">
                  ◈ {TOUR_STEPS[tourStep].hint}
                </p>
              </div>
            )}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => tourStep > 0 ? setTourStep(tourStep - 1) : setTourStep(null)}
                className="font-[family-name:var(--font-mono)] text-xs text-white/40 hover:text-white transition-colors"
              >
                {tourStep > 0 ? "← Back" : "Skip"}
              </button>
              <button
                onClick={() => tourStep < TOUR_STEPS.length - 1 ? setTourStep(tourStep + 1) : setTourStep(null)}
                className="font-[family-name:var(--font-mono)] text-xs px-4 py-2 rounded-sm border transition-all tracking-widest"
                style={{
                  borderColor: TOUR_STEPS[tourStep].iconColor + "40",
                  color: TOUR_STEPS[tourStep].iconColor,
                }}
              >
                {tourStep < TOUR_STEPS.length - 1 ? "Next →" : "Got it ✓"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROOF ADVICE MODAL ── */}
      {proofModal && (() => {
        const advice = proofModal.type === "social"
          ? getSocialAdvice(proofModal.value)
          : getBuilderAdvice(proofModal.value);
        const proofType = proofModal.type === "social" ? "SOCIAL" : "BUILDER";
        return (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setProofModal(null)}
          >
            <div
              className="max-w-md w-full mx-4 bg-[#0c0c14] border border-white/10 rounded-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className="font-[family-name:var(--font-mono)] text-xs tracking-widest"
                  style={{ color: proofModal.color }}
                >
                  {proofType} PROOF — {proofModal.value}/100
                </span>
                <button
                  onClick={() => setProofModal(null)}
                  className="text-white/40 hover:text-white text-xl leading-none transition-colors"
                >
                  ×
                </button>
              </div>
              <div className="text-white font-bold text-lg mb-3">{advice.tierLabel}</div>
              <div className="text-white/75 text-sm leading-relaxed space-y-3">
                {advice.advice.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-white/5 font-[family-name:var(--font-mono)] text-xs text-white/40">
                {advice.actionHint}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

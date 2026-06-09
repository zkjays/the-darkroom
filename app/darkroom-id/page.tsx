"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "../component/landing/Navbar";
import CardGenerator from "../component/darkroom-id/CardGenerator";
import type { DarkroomResult } from "../api/generate/route";

type Answers = {
  handle: string;
  goals: string[];
};

const GOAL_OPTIONS = [
  { emoji: "🎯", text: "My personal brand",     value: "brand" },
  { emoji: "🧠", text: "My skills",             value: "skills" },
  { emoji: "🛠️", text: "A project",             value: "project" },
  { emoji: "🌍", text: "A community",           value: "community" },
  { emoji: "💰", text: "My financial freedom",  value: "freedom" },
  { emoji: "🔍", text: "Still figuring it out", value: "exploring" },
];

const LOADING_STEPS = [
  "Fetching X profile...",
  "Analyzing recent tweets...",
  "Processing your goals...",
  "Generating your Darkroom ID...",
  "Finalizing...",
];

type StepStatus = "waiting" | "active" | "done" | "error";

function LoadingStepRow({ label, status }: { label: string; status: StepStatus }) {
  const icon =
    status === "done"   ? <span className="text-green-400 text-sm leading-none">✓</span>
    : status === "error"  ? <span className="text-red-400 text-sm leading-none">✗</span>
    : status === "active" ? <span className="text-slate-200 text-sm leading-none animate-pulse">⚡</span>
    :                       <span className="text-slate-500 text-sm leading-none">·</span>;

  const textColor =
    status === "done"   ? "text-slate-300 line-through"
    : status === "error"  ? "text-red-400/80"
    : status === "active" ? "text-white"
    :                       "text-slate-500";

  return (
    <div className="flex items-center gap-3">
      <div className="w-4 shrink-0 flex items-center justify-center">{icon}</div>
      <span className={`font-[family-name:var(--font-mono)] text-xs tracking-wide transition-colors duration-300 ${textColor}`}>
        {label}
      </span>
    </div>
  );
}

function DarkroomIDContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: authStatus } = useSession();

  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [answers, setAnswers] = useState<Answers>({ handle: "", goals: [] });
  const [result, setResult] = useState<DarkroomResult | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [errorDetail, setErrorDetail] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [claimState, setClaimState] = useState<"idle" | "loading" | "cooldown">("idle");
  const [cooldownDays, setCooldownDays] = useState(0);
  const [referrerHandle, setReferrerHandle] = useState<string | null>(null);
  const [showAlreadyClaimed, setShowAlreadyClaimed] = useState(false);
  const [alreadyClaimedDays, setAlreadyClaimedDays] = useState(0);
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && ref.length >= 2) setReferrerHandle(ref);
  }, [searchParams]);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus === "unauthenticated") {
      router.replace("/login");
      return;
    }
    const handle = session?.handle;
    if (handle) {
      setAnswers((prev) => ({ ...prev, handle }));
      setStep(1);
      setVisible(true);
    }
  }, [authStatus, session, router]);

  useEffect(() => {
    const handle = session?.handle;
    if (!handle) return;
    fetch(`/api/check-claim?handle=${encodeURIComponent(handle)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.already_claimed && data.days_until_reclaim > 0) {
          setAlreadyClaimedDays(data.days_until_reclaim);
          setShowAlreadyClaimed(true);
        }
      })
      .catch(() => {});
  }, [session]);

  const goTo = (next: number) => {
    setVisible(false);
    setTimeout(() => { setStep(next); setVisible(true); }, 300);
  };

  const toggleGoal = (value: string) => {
    setAnswers((prev) => {
      const goals = prev.goals.includes(value)
        ? prev.goals.filter((g) => g !== value)
        : [...prev.goals, value];
      return { ...prev, goals };
    });
  };

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const submitQuiz = async (finalAnswers: Answers) => {
    setResult(null);
    setLoadError(false);
    setErrorDetail("");
    clearTimers();

    setLoadingStep(1);
    [2, 3, 4].forEach((s, i) => {
      const t = setTimeout(() => setLoadingStep(s), 1500 * (i + 1));
      timersRef.current.push(t);
    });

    const safetyTimer = setTimeout(() => {
      clearTimers();
      setLoadError(true);
      setErrorDetail("Request timed out. Try again or check your connection.");
    }, 20000);
    timersRef.current.push(safetyTimer);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalAnswers),
      });

      clearTimers();

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data: DarkroomResult = await res.json();
      setLoadingStep(5);
      await new Promise((r) => setTimeout(r, 700));
      setResult(data);
    } catch (e) {
      clearTimers();
      if (!loadError) {
        setLoadError(true);
        setErrorDetail(e instanceof Error ? e.message : "Something went wrong");
      }
    }
  };

  const retry = () => {
    setLoadError(false);
    setErrorDetail("");
    setLoadingStep(0);
    submitQuiz(answers);
  };

  const startOver = () => {
    clearTimers();
    setResult(null);
    setLoadError(false);
    setErrorDetail("");
    setLoadingStep(0);
    setClaimState("idle");
    const handle = session?.handle;
    setAnswers({ handle: handle ?? "", goals: [] });
    setStep(1);
    setVisible(true);
  };

  const claimId = async () => {
    if (!result) return;
    setClaimState("loading");
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: answers.handle,
          score: result.score,
          archetype: result.archetype,
          tagline: result.tagline,
          social_proof: result.socialProof,
          builder_proof: result.builderProof,
          work_proof: result.workProof,
          analysis: result.analysis,
          darkroom_line: result.darkroom_line,
          profile_image_url: result.profile_image_url ?? result.profileImageUrl ?? null,
        }),
      });
      const data = await res.json();
      if (data.error === "reclaim_cooldown") {
        setClaimState("cooldown");
        setCooldownDays(data.days_remaining);
      } else if (data.success) {
        if (referrerHandle) {
          fetch("/api/referrals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ referrer_handle: referrerHandle, referred_handle: answers.handle }),
          }).catch(() => {});
        }
        router.push("/dashboard");
      } else {
        setClaimState("idle");
      }
    } catch {
      setClaimState("idle");
    }
  };

  const handleDownload = () => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `darkroom-${answers.handle}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/p/${answers.handle}`;
    const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
    if (navigator.share) {
      try {
        if (canvas) {
          canvas.toBlob(async (blob) => {
            if (!blob) return;
            const file = new File([blob], `darkroom-${answers.handle}.png`, { type: "image/png" });
            try {
              await navigator.share({ title: "My Darkroom ID", url, files: [file] });
            } catch {
              await navigator.share({ title: "My Darkroom ID", url });
            }
          });
        } else {
          await navigator.share({ title: "My Darkroom ID", url });
        }
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  const getStepStatus = (index: number): StepStatus => {
    if (loadError && index === loadingStep) return "error";
    if (index < loadingStep) return "done";
    if (index === loadingStep) return "active";
    return "waiting";
  };

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
      </div>
    );
  }

  const progressWidth = step === 0 ? "0%" : step === 1 ? "50%" : "100%";
  const isResults = step === 2 && !!result;

  return (
    <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
      <Navbar />

      {/* Progress bar — hidden once results are shown */}
      {!isResults && (
        <div className="fixed top-[88px] left-0 right-0 z-40 h-[2px] bg-white/20">
          <div
            className="h-full bg-white transition-all duration-500 ease-out"
            style={{ width: progressWidth }}
          />
        </div>
      )}

      {/* ── RESULTS LAYOUT — card as hero, full viewport ── */}
      {isResults && result && (
        <>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes fadeScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
          `}</style>

          <main
            className="flex flex-col items-center justify-center min-h-screen px-4 py-8 pt-24"
            style={{ animation: "fadeIn 400ms ease-out forwards" }}
          >
            {/* 1. Header */}
            <p className="font-[family-name:var(--font-mono)] text-sm text-slate-400 mb-4 text-center">
              @{answers.handle} · {result.archetype}
            </p>

            {/* 2. Card preview — hero element */}
            <div className="max-w-2xl w-full mx-auto rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(0,204,255,0.08)]">
              <CardGenerator
                handle={answers.handle}
                score={result.score}
                archetype={result.archetype}
                tagline={result.tagline}
                analysis={result.analysis}
                darkroomLine={result.darkroom_line}
                profileImageUrl={result.profile_image_url ?? result.profileImageUrl}
                socialProof={result.socialProof}
                builderProof={result.builderProof}
                workProof={result.workProof}
              />
            </div>

            {/* 3. Proof bars — same width as card */}
            <div className="max-w-2xl w-full mx-auto mt-5 flex gap-6">
              {[
                { label: "Social Proof",  color: "#a78bfa", value: result.socialProof },
                { label: "Builder Proof", color: "#60a5fa", value: result.builderProof },
              ].map(({ label, color, value }) => (
                <div key={label} className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10px] text-slate-400 uppercase tracking-[0.15em]">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      {label}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-xs text-slate-400">{value}</span>
                  </div>
                  <div className="h-px w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${value}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 4. Action buttons */}
            <div className="flex items-center gap-3 mt-4">
              {claimState === "cooldown" ? (
                <span className="font-[family-name:var(--font-mono)] text-xs px-4 py-2 rounded-lg border border-white/10 text-slate-500">
                  Reclaim in {cooldownDays}d
                </span>
              ) : (
                <button
                  onClick={claimId}
                  disabled={claimState === "loading"}
                  className="font-[family-name:var(--font-mono)] text-xs px-4 py-2 rounded-lg border border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {claimState === "loading" ? "Claiming…" : "Claim your ID"}
                </button>
              )}
              <button
                onClick={handleDownload}
                className="font-[family-name:var(--font-mono)] text-xs px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all"
              >
                Download card
              </button>
              <button
                onClick={handleShare}
                className="font-[family-name:var(--font-mono)] text-xs px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all"
              >
                Share
              </button>
            </div>

            {/* 5. Analysis trigger */}
            <button
              onClick={() => setAnalysisOpen(true)}
              className="font-[family-name:var(--font-mono)] text-xs text-slate-500 hover:text-slate-300 cursor-pointer underline-offset-4 hover:underline mt-6 transition-colors"
            >
              Read your analysis →
            </button>
          </main>

          {/* Analysis modal */}
          {analysisOpen && (
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
              onClick={() => setAnalysisOpen(false)}
            >
              <div
                className="max-w-lg w-full mx-4 bg-[#0c0c14] border border-white/10 rounded-2xl p-8 relative"
                style={{ animation: "fadeScale 200ms ease-out forwards" }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setAnalysisOpen(false)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-white text-xl leading-none transition-colors"
                >
                  ×
                </button>
                <p className="font-[family-name:var(--font-mono)] text-sm tracking-widest text-cyan-400 mb-3">
                  {result.archetype}
                </p>
                <p className="text-white font-bold text-lg mb-4">{result.darkroom_line}</p>
                <p className="text-slate-300 text-sm leading-relaxed">{result.analysis}</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── STEP LAYOUT — handle / goals / loading ── */}
      {!isResults && (
        <main className="flex min-h-screen items-center justify-center px-6 pt-24 pb-16">
          <div className="w-full max-w-md">

            {/* Already claimed screen */}
            {showAlreadyClaimed && (
              <div className="flex flex-col items-center text-center gap-5">
                <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.3em] text-slate-400 uppercase">
                  Already claimed
                </p>
                <h1 className="text-2xl font-bold text-white leading-snug">
                  You&apos;re already in the room.
                </h1>
                <p className="text-slate-300 text-sm leading-relaxed max-w-xs">
                  You&apos;ve already claimed your Darkroom ID. Reclaim available in {alreadyClaimedDays} day{alreadyClaimedDays !== 1 ? "s" : ""}.
                </p>
                <p className="font-[family-name:var(--font-mono)] text-sm text-slate-200">
                  @{answers.handle}
                </p>
                <div className="flex flex-col gap-3 w-full">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="w-full rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)]"
                  >
                    Go to Dashboard →
                  </button>
                </div>
              </div>
            )}

            {/* Screen 1: Goals */}
            {!showAlreadyClaimed && step === 1 && (
              <div className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                {referrerHandle && (
                  <div className="mb-6 inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5">
                    <span className="text-slate-400 text-xs">Invited by</span>
                    <span className="font-[family-name:var(--font-mono)] text-xs text-slate-200">@{referrerHandle}</span>
                  </div>
                )}
                <h2 className="text-2xl font-bold text-white mb-1 leading-snug">
                  What are you building toward?
                </h2>
                <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.2em] text-slate-400 uppercase mb-2">
                  select all that apply
                </p>
                <p className="font-[family-name:var(--font-mono)] text-xs text-slate-500 mb-6">
                  Analyzing @{answers.handle}
                </p>

                <div className="flex flex-col gap-3 mb-8">
                  {GOAL_OPTIONS.map((option) => {
                    const selected = answers.goals.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => toggleGoal(option.value)}
                        className={`flex items-center gap-4 rounded-xl p-4 border text-left transition-all duration-200 cursor-pointer ${
                          selected
                            ? "bg-white/[0.08] border-white/[0.15]"
                            : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1]"
                        }`}
                      >
                        <span className="text-xl leading-none">{option.emoji}</span>
                        <span className="flex-1 text-sm text-white leading-snug">{option.text}</span>
                        {selected && (
                          <span className="text-white text-xs font-bold flex-shrink-0">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => { goTo(2); submitQuiz(answers); }}
                  disabled={answers.goals.length === 0}
                  className="w-full rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  Get my ID →
                </button>
              </div>
            )}

            {/* Screen 2: Loading / Error */}
            {!showAlreadyClaimed && step === 2 && (
              <div className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
                <div className="flex flex-col items-center">
                  {!loadError && (
                    <div className="mb-8 w-7 h-7 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
                  )}
                  <div className="w-full max-w-sm flex flex-col gap-3 mb-6">
                    {LOADING_STEPS.map((label, i) => (
                      <LoadingStepRow key={label} label={label} status={getStepStatus(i + 1)} />
                    ))}
                  </div>
                  {loadError && (
                    <div className="w-full max-w-sm flex flex-col gap-4 pt-2">
                      {errorDetail && (
                        <p className="font-[family-name:var(--font-mono)] text-xs text-red-400/60">
                          {errorDetail}
                        </p>
                      )}
                      <div className="flex gap-3">
                        <button
                          onClick={retry}
                          className="flex-1 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)]"
                        >
                          Retry
                        </button>
                        <button
                          onClick={startOver}
                          className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300 hover:text-slate-200 hover:border-white/20 transition-all"
                        >
                          Start over
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
      )}
    </div>
  );
}

export default function DarkroomID() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
      </div>
    }>
      <DarkroomIDContent />
    </Suspense>
  );
}

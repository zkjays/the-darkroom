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
  { emoji: "🎯", text: "My personal brand",    value: "brand" },
  { emoji: "🧠", text: "My skills",            value: "skills" },
  { emoji: "🛠️", text: "A project",            value: "project" },
  { emoji: "🌍", text: "A community",          value: "community" },
  { emoji: "💰", text: "My financial freedom", value: "freedom" },
  { emoji: "🔍", text: "Still figuring it out", value: "exploring" },
];

const LOADING_STEPS = [
  "Fetching X profile...",
  "Analyzing recent tweets...",
  "Processing your goals...",
  "Generating your Darkroom ID...",
  "Finalizing...",
];

const statColors: Record<string, string> = {
  focus:       "bg-blue-400",
  consistency: "bg-purple-400",
  reliability: "bg-emerald-400",
  growth:      "bg-amber-400",
};

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="font-mono text-[10px] tracking-[0.2em] text-slate-300 uppercase">{label}</span>
        <span className="font-mono text-xs text-slate-300">{value}</span>
      </div>
      <div className="h-0.75 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${(value / 75) * 100}%` }}
        />
      </div>
    </div>
  );
}

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

  // Step 0 = handle input (shown briefly while session loads, then skipped)
  // Step 1 = goals, Step 2 = loading/results
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

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && ref.length >= 2) setReferrerHandle(ref);
  }, [searchParams]);

  // Redirect unauthenticated users; pre-fill handle and jump to goals if signed in
  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus === "unauthenticated") {
      router.replace("/login");
      return;
    }
    const handle = (session as any)?.handle as string | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (handle) {
      setAnswers((prev) => ({ ...prev, handle }));
      setStep(1);
      setVisible(true);
    }
  }, [authStatus, session, router]);

  // Check if handle is already claimed when session loads
  useEffect(() => {
    const handle = (session as any)?.handle as string | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
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
    const handle = (session as any)?.handle as string | undefined; // eslint-disable-line @typescript-eslint/no-explicit-any
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
          stats: result.stats,
          analysis: result.analysis,
          darkroom_line: result.darkroom_line,
          profile_image_url: result.profile_image_url ?? null,
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

  const getStepStatus = (index: number): StepStatus => {
    if (loadError && index === loadingStep) return "error";
    if (index < loadingStep) return "done";
    if (index === loadingStep) return "active";
    return "waiting";
  };

  // Show spinner while session is loading
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
      </div>
    );
  }

  // Progress bar: step 1 = 50%, step 2 = 100% (step 0 is skipped)
  const progressWidth = step === 0 ? "0%" : step === 1 ? "50%" : "100%";

  return (
    <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
      <Navbar />

      {/* Progress bar */}
      <div className="fixed top-[88px] left-0 right-0 z-40 h-[2px] bg-white/20">
        <div
          className="h-full bg-white transition-all duration-500 ease-out"
          style={{ width: progressWidth }}
        />
      </div>

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

          {/* Screen 1: Multi-select goals */}
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

          {/* Screen 2: Loading + Results */}
          {!showAlreadyClaimed && step === 2 && (
            <div className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>

              {/* Loading / error state */}
              {!result && (
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
              )}

              {/* Results */}
              {result && (
                <div className="flex flex-col gap-8">
                  {/* Score + archetype */}
                  <div className="text-center">
                    <div className="font-[family-name:var(--font-mono)] text-[72px] font-bold leading-none text-white mb-2">
                      {result.score}
                    </div>
                    <div className="font-[family-name:var(--font-mono)] text-xs tracking-[0.3em] text-slate-400 uppercase mb-4">
                      darkroom score
                    </div>
                    <div className="text-2xl font-extrabold tracking-tight text-white mb-2">
                      {result.archetype}
                    </div>
                    <div className="font-[family-name:var(--font-mono)] text-xs tracking-[0.15em] text-slate-300 uppercase">
                      {result.tagline}
                    </div>
                  </div>

                  {/* Stat bars */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 flex flex-col gap-4">
                    {(Object.entries(result.stats) as [keyof typeof result.stats, number][]).map(([key, val]) => (
                      <StatBar key={key} label={key} value={val} color={statColors[key] ?? "bg-white"} />
                    ))}
                  </div>

                  {/* Analysis */}
                  <div className="text-sm text-slate-200 leading-7">{result.analysis}</div>

                  {/* Darkroom line */}
                  <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.15em] text-slate-400 italic text-center">
                    {result.darkroom_line}
                  </p>

                  {/* Card + share actions */}
                  <CardGenerator
                    handle={answers.handle}
                    score={result.score}
                    archetype={result.archetype}
                    tagline={result.tagline}
                    stats={result.stats}
                    analysis={result.analysis}
                    darkroomLine={result.darkroom_line}
                    profileImageUrl={result.profile_image_url}
                  />

                  {/* Claim */}
                  {claimState === "cooldown" ? (
                    <div className="w-full rounded-xl border border-white/[0.05] px-5 py-3 text-sm text-slate-500 text-center">
                      You can reclaim in {cooldownDays} day{cooldownDays !== 1 ? "s" : ""}
                    </div>
                  ) : (
                    <button
                      onClick={claimId}
                      disabled={claimState === "loading"}
                      className="w-full rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    >
                      {claimState === "loading" ? "Claiming…" : "Claim my ID →"}
                    </button>
                  )}

                  <button
                    onClick={startOver}
                    className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300 hover:text-white hover:border-white/20 transition-all"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
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

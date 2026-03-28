"use client";

import { useState, useRef } from "react";
import Navbar from "../component/landing/Navbar";
import type { DarkroomResult } from "../api/generate/route";

type Answers = {
  handle: string;
  q1: string;
  q2: string;
  q3: string;
};

const questions = [
  {
    key: "q1" as keyof Answers,
    label: "01 / 03",
    title: "How do you build?",
    options: [
      { emoji: "🔨", text: "Ship fast, fix later" },
      { emoji: "🧱", text: "Plan everything, then execute" },
      { emoji: "🌙", text: "Late nights, no announcements" },
      { emoji: "👀", text: "Still learning, watching for now" },
    ],
  },
  {
    key: "q2" as keyof Answers,
    label: "02 / 03",
    title: "A project asks for your identity. You...",
    options: [
      { emoji: "🔥", text: "Close the tab instantly" },
      { emoji: "🔐", text: "Only if it's zero-knowledge" },
      { emoji: "🤷", text: "Depends on the upside" },
      { emoji: "✅", text: "No problem if legit" },
    ],
  },
  {
    key: "q3" as keyof Answers,
    label: "03 / 03",
    title: "How do you interact with crypto?",
    options: [
      { emoji: "🛡️", text: "Privacy wallets, own nodes, self-sovereign" },
      { emoji: "⚡", text: "DeFi, swaps, onchain daily" },
      { emoji: "📱", text: "Hold and check prices sometimes" },
      { emoji: "🤔", text: "Still figuring it out" },
    ],
  },
];

const LOADING_STEPS = [
  "Fetching X profile...",
  "Analyzing recent tweets...",
  "Processing quiz answers...",
  "Generating your Darkroom ID...",
  "Finalizing...",
];

const statColors: Record<string, string> = {
  builder: "bg-blue-400",
  privacy: "bg-purple-400",
  crypto: "bg-emerald-400",
  community: "bg-amber-400",
};

function StatBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.2em] text-white/40 uppercase">
          {label}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-xs text-white/50">
          {value}
        </span>
      </div>
      <div className="h-[3px] w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

type StepStatus = "waiting" | "active" | "done" | "error";

function LoadingStepRow({
  label,
  status,
}: {
  label: string;
  status: StepStatus;
}) {
  const icon =
    status === "done" ? (
      <span className="text-green-400 text-sm leading-none">✓</span>
    ) : status === "error" ? (
      <span className="text-red-400 text-sm leading-none">✗</span>
    ) : status === "active" ? (
      <span className="text-white/70 text-sm leading-none animate-pulse">⚡</span>
    ) : (
      <span className="text-white/20 text-sm leading-none">·</span>
    );

  const textColor =
    status === "done"
      ? "text-white/40 line-through"
      : status === "error"
      ? "text-red-400/80"
      : status === "active"
      ? "text-white/80"
      : "text-white/20";

  return (
    <div className="flex items-center gap-3">
      <div className="w-4 flex-shrink-0 flex items-center justify-center">
        {icon}
      </div>
      <span
        className={`font-[family-name:var(--font-mono)] text-xs tracking-wide transition-colors duration-300 ${textColor}`}
      >
        {label}
      </span>
    </div>
  );
}

export default function DarkroomID() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [answers, setAnswers] = useState<Answers>({
    handle: "",
    q1: "",
    q2: "",
    q3: "",
  });
  const [pendingAdvance, setPendingAdvance] = useState(false);
  const [result, setResult] = useState<DarkroomResult | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [errorDetail, setErrorDetail] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const goTo = (next: number) => {
    setVisible(false);
    setTimeout(() => {
      setStep(next);
      setVisible(true);
    }, 300);
  };

  const handleOptionSelect = (key: keyof Answers, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (!pendingAdvance) {
      setPendingAdvance(true);
      setTimeout(() => {
        setPendingAdvance(false);
        goTo(step + 1);
      }, 400);
    }
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

    // Kick off simulated step progression
    setLoadingStep(1);
    [2, 3, 4].forEach((s, i) => {
      const t = setTimeout(() => setLoadingStep(s), 1500 * (i + 1));
      timersRef.current.push(t);
    });

    // Safety valve: if no response after 20s, surface an error
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

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data: DarkroomResult = await res.json();

      // Step 5 = finalizing, brief pause before reveal
      setLoadingStep(5);
      await new Promise((r) => setTimeout(r, 700));
      setResult(data);
    } catch (e) {
      clearTimers();
      // Don't overwrite the safety timeout message if it already fired
      if (!loadError) {
        setLoadError(true);
        setErrorDetail(e instanceof Error ? e.message : "Something went wrong");
      }
    }
  };

  const goToResults = () => {
    goTo(4);
    submitQuiz(answers);
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
    setAnswers({ handle: "", q1: "", q2: "", q3: "" });
    setStep(0);
    setVisible(true);
  };

  const getStepStatus = (index: number): StepStatus => {
    // index is 1-based (matches loadingStep)
    if (loadError && index === loadingStep) return "error";
    if (index < loadingStep) return "done";
    if (index === loadingStep) return "active";
    return "waiting";
  };

  const currentQuestion = step >= 1 && step <= 3 ? questions[step - 1] : null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.key] : "";
  const progressWidth = `${(step / 4) * 100}%`;

  const shareText = result
    ? `I just got my Darkroom ID: "${result.archetype}" — score ${result.score}/98.\n\n${result.tagline}\n\nGet yours 👇\nthedarkroom.xyz/darkroom-id`
    : "";

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

          {/* Screen 0: Handle input */}
          {step === 0 && (
            <div
              className={`transition-all duration-500 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <h1 className="text-3xl font-extrabold tracking-tight text-white mb-3">
                Drop your handle
              </h1>
              <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.2em] text-white/30 uppercase mb-8">
                we&apos;ll peek at your profile. no data stored.
              </p>

              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-8 focus-within:border-white/20 transition-colors">
                <span className="text-white/30 font-[family-name:var(--font-mono)] text-sm">
                  @
                </span>
                <input
                  type="text"
                  value={answers.handle}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, handle: e.target.value }))
                  }
                  placeholder="yourhandle"
                  className="flex-1 bg-transparent text-white placeholder:text-white/20 outline-none text-sm font-[family-name:var(--font-mono)]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && answers.handle.length >= 2) goTo(1);
                  }}
                />
              </div>

              <button
                onClick={() => goTo(1)}
                disabled={answers.handle.length < 2}
                className="w-full rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                Continue →
              </button>
            </div>
          )}

          {/* Screens 1–3: Questions */}
          {step >= 1 && step <= 3 && currentQuestion && (
            <div
              className={`transition-all duration-500 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.25em] text-white/30 uppercase mb-4">
                {currentQuestion.label}
              </p>

              <h2 className="text-2xl font-bold text-white mb-6 leading-snug">
                {currentQuestion.title}
              </h2>

              <div className="flex flex-col gap-3 mb-8">
                {currentQuestion.options.map((option) => {
                  const selected = currentAnswer === option.text;
                  return (
                    <button
                      key={option.text}
                      onClick={() =>
                        handleOptionSelect(currentQuestion.key, option.text)
                      }
                      className={`group flex items-center gap-4 rounded-xl p-4 border text-left transition-all duration-200 cursor-pointer ${
                        selected
                          ? "bg-white/[0.08] border-white/[0.15]"
                          : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1]"
                      }`}
                    >
                      <span className="text-xl leading-none">{option.emoji}</span>
                      <span className="flex-1 text-sm text-white/80 leading-snug">
                        {option.text}
                      </span>
                      {selected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => goTo(step - 1)}
                  className="text-sm text-white/40 hover:text-white/60 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={step === 3 ? goToResults : () => goTo(step + 1)}
                  disabled={!currentAnswer}
                  className="flex-1 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  {step === 3 ? "Get my ID →" : "Continue →"}
                </button>
              </div>
            </div>
          )}

          {/* Screen 4: Loading + Results */}
          {step === 4 && (
            <div
              className={`transition-all duration-500 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              {/* Loading / error state */}
              {!result && (
                <div className="flex flex-col items-center">
                  {/* Spinner (hidden on error) */}
                  {!loadError && (
                    <div className="mb-8 w-7 h-7 rounded-full border-2 border-white/15 border-t-white/60 animate-spin" />
                  )}

                  {/* Step list */}
                  <div className="w-full max-w-sm flex flex-col gap-3 mb-6">
                    {LOADING_STEPS.map((label, i) => (
                      <LoadingStepRow
                        key={label}
                        label={label}
                        status={getStepStatus(i + 1)}
                      />
                    ))}
                  </div>

                  {/* Error detail + retry */}
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
                          className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/40 hover:text-white/70 hover:border-white/20 transition-all"
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
                    <div className="font-[family-name:var(--font-mono)] text-xs tracking-[0.3em] text-white/30 uppercase mb-4">
                      darkroom score
                    </div>
                    <div className="text-2xl font-extrabold tracking-tight text-white mb-2">
                      {result.archetype}
                    </div>
                    <div className="font-[family-name:var(--font-mono)] text-xs tracking-[0.15em] text-white/40 uppercase">
                      {result.tagline}
                    </div>
                  </div>

                  {/* Stat bars */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 flex flex-col gap-4">
                    {(
                      Object.entries(result.stats) as [
                        keyof typeof result.stats,
                        number
                      ][]
                    ).map(([key, val]) => (
                      <StatBar
                        key={key}
                        label={key}
                        value={val}
                        color={statColors[key] ?? "bg-white"}
                      />
                    ))}
                  </div>

                  {/* Analysis */}
                  <div className="text-sm text-white/60 leading-7">
                    {result.analysis}
                  </div>

                  {/* Darkroom line */}
                  <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.15em] text-white/30 italic text-center">
                    {result.darkroom_line}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)]"
                    >
                      Share on X →
                    </a>
                    <button
                      onClick={startOver}
                      className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

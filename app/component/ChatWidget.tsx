"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Step {
  id: string;
  label: string;
  description: string;
  cta: string;
  tab?: string;
  href?: string;
}

const STEPS: Step[] = [
  {
    id: "score",
    label: "Check your score",
    description:
      "Your Darkroom score reflects your real builder signal — social proof, builder proof, work proof. Explore each ring to understand how it's calculated.",
    cta: "View my score",
    tab: "id",
  },
  {
    id: "proof",
    label: "Submit your first proof",
    description:
      "Submit a link to something you built, wrote, shipped or released. The room validates it — 3 endorsements = Validated proof. This is how you build your signal.",
    cta: "Submit a proof",
    tab: "work",
  },
  {
    id: "public",
    label: "Go public",
    description:
      "Make your profile visible so other builders can find you, endorse your work, and see your Darkroom ID. Private profiles can't receive endorsements.",
    cta: "Open settings",
    tab: "settings",
  },
  {
    id: "share",
    label: "Share your Darkroom ID",
    description:
      "Your Darkroom ID is your proof-of-work resume. Share it in your bio, your next post, or anywhere builders look. It's earned, not self-reported.",
    cta: "See my ID",
    href: "/darkroom-id",
  },
];

const LS_KEY = "darkroom_onboarding_dismissed";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
}

export default function ChatWidget({
  handle,
  profilePublic,
}: {
  handle: string;
  accent?: string;
  profilePublic: boolean;
  onSwitchTab?: (tab: string) => void;
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(true);
  const [hasWork, setHasWork] = useState(false);
  const [hasShared, setHasShared] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"guide" | "chat">("guide");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const accentColor = "#c9a84c";

  useEffect(() => {
    setDismissed(localStorage.getItem(LS_KEY) === "true");
    setHasShared(localStorage.getItem("darkroom_shared") === "true");

    let sid = sessionStorage.getItem("darkroom_chat_session");
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("darkroom_chat_session", sid);
    }
    setSessionId(sid);

    const savedTab = sessionStorage.getItem("darkroom_widget_tab") as "guide" | "chat" | null;
    if (savedTab) setActiveTab(savedTab);

    const saved = sessionStorage.getItem("darkroom_chat_messages");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (!handle) return;
    fetch(`/api/goals?handle=${encodeURIComponent(handle)}&all=true&completed=true`)
      .then((r) => r.json())
      .then((d) => setHasWork((d.goals ?? []).length > 0))
      .catch(() => {});
  }, [handle]);

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem("darkroom_chat_messages", JSON.stringify(messages.slice(-20)));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const stepDone: Record<string, boolean> = {
    score: true,
    proof: hasWork,
    public: profilePublic,
    share: hasShared,
  };

  const completed = STEPS.filter((s) => stepDone[s.id]).length;
  const allDone = completed === STEPS.length;

  const switchTab = (tab: "guide" | "chat") => {
    setActiveTab(tab);
    sessionStorage.setItem("darkroom_widget_tab", tab);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sessionId, handle }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: data.response ?? "Something went wrong." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: "Couldn't reach the assistant. Try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="fixed bottom-6 right-6 z-[70] flex h-10 w-10 items-center justify-center rounded-full bg-[#0c0c14] border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.5)] hover:border-white/20 transition-all"
        title="Open assistant"
      >
        <span className="text-base">◈</span>
        {!allDone && (
          <span
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-black"
            style={{ background: accentColor }}
          >
            {STEPS.length - completed}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[70] flex flex-col items-end gap-2">
      <div className="w-80 rounded-2xl bg-[#0a0a12] border border-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden animate-fade-in-up">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => switchTab("guide")}
              className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest px-2 py-0.5 rounded transition-colors"
              style={{ color: activeTab === "guide" ? accentColor : "rgba(255,255,255,0.25)" }}
            >
              Guide
              {activeTab === "guide" && (
                <span
                  className="ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-black"
                  style={{ background: accentColor }}
                >
                  {completed}/{STEPS.length}
                </span>
              )}
            </button>
            <span className="text-white/15 text-xs">|</span>
            <button
              onClick={() => switchTab("chat")}
              className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest px-2 py-0.5 rounded transition-colors"
              style={{ color: activeTab === "chat" ? accentColor : "rgba(255,255,255,0.25)" }}
            >
              Ask
              {messages.length > 0 && activeTab === "guide" && (
                <span
                  className="ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-black"
                  style={{ background: accentColor }}
                >
                  ·
                </span>
              )}
            </button>
          </div>
          <button
            onClick={() => {
              setDismissed(true);
              localStorage.setItem(LS_KEY, "true");
            }}
            className="text-white/20 hover:text-white/50 transition-colors text-sm leading-none"
          >
            ×
          </button>
        </div>

        {/* Guide tab */}
        {activeTab === "guide" && (
          <>
            <div className="h-[2px] bg-white/[0.04]">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${(completed / STEPS.length) * 100}%`, background: accentColor }}
              />
            </div>

            <div className="flex flex-col divide-y divide-white/[0.04]">
              {STEPS.map((step) => {
                const done = stepDone[step.id];
                const isActive = activeStep === step.id;
                return (
                  <div key={step.id} className="flex flex-col">
                    <button
                      onClick={() => setActiveStep(isActive ? null : step.id)}
                      className="flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors group"
                    >
                      <div
                        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold border transition-colors"
                        style={
                          done
                            ? { background: accentColor, borderColor: accentColor, color: "#000" }
                            : { background: "transparent", borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.3)" }
                        }
                      >
                        {done ? "✓" : ""}
                      </div>
                      <span
                        className="text-sm transition-colors"
                        style={{ color: done ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.75)" }}
                      >
                        {done ? <s>{step.label}</s> : step.label}
                      </span>
                      <span className="ml-auto text-white/20 text-xs group-hover:text-white/40 transition-colors">
                        {isActive ? "▲" : "▼"}
                      </span>
                    </button>
                    {isActive && (
                      <div className="px-4 pb-4 flex flex-col gap-3 bg-white/[0.01]">
                        <p className="text-xs leading-5 text-white/40">{step.description}</p>
                        <button
                          onClick={() => {
                            if (step.id === "share") {
                              localStorage.setItem("darkroom_shared", "true");
                              setHasShared(true);
                            }
                            if (step.href) {
                              router.push(step.href);
                            } else if (step.tab) {
                              window.dispatchEvent(
                                new CustomEvent("darkroom:switchTab", { detail: step.tab })
                              );
                            }
                          }}
                          className="self-start rounded-lg border border-white/10 px-3 py-1.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/60 hover:text-white hover:border-white/20 transition-all"
                        >
                          {step.cta} →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {allDone && (
              <div className="px-4 py-3 border-t border-white/[0.06] text-center">
                <p
                  className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest"
                  style={{ color: accentColor }}
                >
                  You're in the room ✓
                </p>
              </div>
            )}

            <div className="px-4 py-2 border-t border-white/[0.04]">
              <button
                onClick={() => switchTab("chat")}
                className="w-full text-left font-[family-name:var(--font-mono)] text-[10px] text-white/25 hover:text-white/45 transition-colors"
              >
                Ask anything → type /help to start
              </button>
            </div>
          </>
        )}

        {/* Chat tab */}
        {activeTab === "chat" && (
          <div className="flex flex-col h-72">
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
              {messages.length === 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-xs text-white/30 text-center font-[family-name:var(--font-mono)]">
                    Ask anything about The Darkroom
                  </p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {["/help", "/score", "/archetype"].map((cmd) => (
                      <button
                        key={cmd}
                        onClick={() => setInput(cmd)}
                        className="font-[family-name:var(--font-mono)] text-[9px] px-2 py-1 rounded border border-white/10 text-white/35 hover:text-white/60 hover:border-white/20 transition-all"
                      >
                        {cmd}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-5 whitespace-pre-wrap break-words ${
                      msg.role === "user"
                        ? "bg-white/[0.08] text-white/75"
                        : "bg-white/[0.03] border border-white/[0.06] text-white/60"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 animate-pulse">
                      ◈ ···
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-white/[0.06] px-3 py-2 flex gap-2 items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask or type /help…"
                className="flex-1 bg-transparent text-xs text-white/70 placeholder-white/20 outline-none font-[family-name:var(--font-mono)]"
                disabled={chatLoading}
              />
              <button
                onClick={sendMessage}
                disabled={chatLoading || !input.trim()}
                className="font-[family-name:var(--font-mono)] text-[10px] disabled:opacity-30 transition-colors"
                style={{ color: input.trim() ? accentColor : "rgba(255,255,255,0.3)" }}
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setDismissed(true)}
        className="self-end flex h-10 w-10 items-center justify-center rounded-full bg-[#0c0c14] border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.5)] hover:border-white/20 transition-all"
      >
        <span className="text-base">◈</span>
        {!allDone && (
          <span
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-black"
            style={{ background: accentColor }}
          >
            {STEPS.length - completed}
          </span>
        )}
      </button>
    </div>
  );
}

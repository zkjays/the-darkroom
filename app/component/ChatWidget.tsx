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
      "Submit a link to something you built, wrote, shipped or released. The room validates it — 3 endorsements = Validated proof.",
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
      "Your Darkroom ID is your proof-of-work resume. Share it in your bio, your next post, or anywhere builders look.",
    cta: "See my ID",
    href: "/darkroom-id",
  },
];

const LS_KEY = "darkroom_onboarding_dismissed";
const ACCENT = "#c9a84c";

interface ChatMessage {
  role: "user" | "agent";
  text: string;
}

type OpenPanel = "chat" | "guide" | null;

function IconRobot({ active }: { active: boolean }) {
  const color = active ? "#0a0a0a" : ACCENT;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* antenna */}
      <line x1="12" y1="2" x2="12" y2="6" />
      <circle cx="12" cy="2" r="1" fill={color} stroke="none" />
      {/* head */}
      <rect x="4" y="6" width="16" height="12" rx="3" />
      {/* eyes */}
      <circle cx="9" cy="12" r="1.5" fill={color} stroke="none" />
      <circle cx="15" cy="12" r="1.5" fill={color} stroke="none" />
      {/* mouth */}
      <line x1="9" y1="16" x2="15" y2="16" />
    </svg>
  );
}

function IconTasks({ active }: { active: boolean }) {
  const color = active ? "#0a0a0a" : ACCENT;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* lines */}
      <line x1="9" y1="7" x2="20" y2="7" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="17" x2="20" y2="17" />
      {/* dots left */}
      <circle cx="4.5" cy="7" r="1.5" fill={color} stroke="none" />
      <circle cx="4.5" cy="12" r="1.5" fill={color} stroke="none" />
      <circle cx="4.5" cy="17" r="1.5" fill={color} stroke="none" />
    </svg>
  );
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
  const [hasWork, setHasWork] = useState(false);
  const [hasShared, setHasShared] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);

  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasShared(localStorage.getItem("darkroom_shared") === "true");
    // suppress unused LS_KEY warning
    void LS_KEY;

    let sid = sessionStorage.getItem("darkroom_chat_session");
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("darkroom_chat_session", sid);
    }
    setSessionId(sid);

    const saved = sessionStorage.getItem("darkroom_chat_messages");
    if (saved) {
      try { setMessages(JSON.parse(saved)); } catch { /* ignore */ }
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
  const remaining = STEPS.length - completed;

  const togglePanel = (panel: OpenPanel) => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
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
      setMessages((prev) => [...prev, { role: "agent", text: data.response ?? "Something went wrong." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "agent", text: "Couldn't reach the assistant. Try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <>
      {/* ── Panel — appears to the left of the button cluster ── */}
      {openPanel && (
        <div className="fixed right-20 z-[70] w-80 rounded-2xl bg-[#0a0a12] border border-white/[0.10] shadow-[0_8px_48px_rgba(0,0,0,0.75)] overflow-hidden"
          style={{ top: "50%", transform: "translateY(-50%)" }}
        >
          {/* Chat panel */}
          {openPanel === "chat" && (
            <div className="flex flex-col h-[420px]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
                <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>
                  AI Assistant
                </span>
                <button onClick={() => setOpenPanel(null)} className="text-white/25 hover:text-white/60 transition-colors leading-none">×</button>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
                {messages.length === 0 && (
                  <div className="flex flex-col gap-3 mt-4">
                    <p className="text-xs text-white/30 text-center font-[family-name:var(--font-mono)]">
                      Ask anything about The Darkroom
                    </p>
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {["/help", "/score", "/archetype"].map((cmd) => (
                        <button
                          key={cmd}
                          onClick={() => setInput(cmd)}
                          className="font-[family-name:var(--font-mono)] text-[9px] px-2.5 py-1 rounded-sm border border-white/10 text-white/35 hover:text-white/60 hover:border-white/20 transition-all"
                        >
                          {cmd}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
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
                      <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/30 animate-pulse">◈ ···</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-white/[0.06] px-3 py-2.5 flex gap-2 items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Ask or type /help…"
                  className="flex-1 bg-transparent text-xs text-white/70 placeholder-white/20 outline-none font-[family-name:var(--font-mono)]"
                  disabled={chatLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={chatLoading || !input.trim()}
                  className="font-[family-name:var(--font-mono)] text-[10px] disabled:opacity-30 transition-colors"
                  style={{ color: input.trim() ? ACCENT : "rgba(255,255,255,0.3)" }}
                >
                  →
                </button>
              </div>
            </div>
          )}

          {/* Guide panel */}
          {openPanel === "guide" && (
            <>
              <div className="h-[2px] bg-white/[0.04]">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${(completed / STEPS.length) * 100}%`, background: ACCENT }}
                />
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>
                    Guide
                  </span>
                  <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-black" style={{ background: ACCENT }}>
                    {completed}/{STEPS.length}
                  </span>
                </div>
                <button onClick={() => setOpenPanel(null)} className="text-white/25 hover:text-white/60 transition-colors leading-none">×</button>
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
                              ? { background: ACCENT, borderColor: ACCENT, color: "#000" }
                              : { background: "transparent", borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.3)" }
                          }
                        >
                          {done ? "✓" : ""}
                        </div>
                        <span className="text-sm transition-colors" style={{ color: done ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.75)" }}>
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
                              if (step.id === "share") { localStorage.setItem("darkroom_shared", "true"); setHasShared(true); }
                              if (step.href) { router.push(step.href); }
                              else if (step.tab) {
                                window.dispatchEvent(new CustomEvent("darkroom:switchTab", { detail: step.tab }));
                              }
                            }}
                            className="self-start rounded-sm border border-white/10 px-3 py-1.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/60 hover:text-white hover:border-white/20 transition-all"
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
                  <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>
                    You&apos;re in the room ✓
                  </p>
                </div>
              )}

              <div className="px-4 py-2.5 border-t border-white/[0.04]">
                <button
                  onClick={() => setOpenPanel("chat")}
                  className="w-full text-left font-[family-name:var(--font-mono)] text-[10px] text-white/25 hover:text-white/45 transition-colors"
                >
                  Ask the AI → type /help to start
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Button cluster — vertically centered, right edge ── */}
      <div
        className="fixed right-5 z-[70] flex flex-col items-center gap-3"
        style={{ top: "50%", transform: "translateY(-50%)" }}
      >
        {/* AI Agent */}
        <button
          onClick={() => togglePanel("chat")}
          title="AI Assistant"
          className="relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200"
          style={{
            background: openPanel === "chat" ? ACCENT : "#0e0e16",
            border: `1.5px solid ${openPanel === "chat" ? ACCENT : "rgba(201,168,76,0.5)"}`,
            boxShadow: openPanel === "chat"
              ? `0 0 0 4px rgba(201,168,76,0.15), 0 4px 24px rgba(201,168,76,0.3)`
              : `0 2px 16px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.1)`,
          }}
        >
          <IconRobot active={openPanel === "chat"} />
          {messages.length > 0 && openPanel !== "chat" && (
            <span
              className="absolute -top-1 -right-1 h-3 w-3 rounded-full"
              style={{ background: ACCENT }}
            />
          )}
        </button>

        {/* Separator */}
        <div className="w-px h-4" style={{ background: "rgba(201,168,76,0.15)" }} />

        {/* Tasks / Guide */}
        <button
          onClick={() => togglePanel("guide")}
          title="Builder Guide"
          className="relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200"
          style={{
            background: openPanel === "guide" ? ACCENT : "#0e0e16",
            border: `1.5px solid ${openPanel === "guide" ? ACCENT : "rgba(201,168,76,0.5)"}`,
            boxShadow: openPanel === "guide"
              ? `0 0 0 4px rgba(201,168,76,0.15), 0 4px 24px rgba(201,168,76,0.3)`
              : `0 2px 16px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.1)`,
          }}
        >
          <IconTasks active={openPanel === "guide"} />
          {!allDone && (
            <span
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-black"
              style={{ background: ACCENT }}
            >
              {remaining}
            </span>
          )}
          {allDone && (
            <span
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-black"
              style={{ background: ACCENT }}
            >
              ✓
            </span>
          )}
        </button>
      </div>
    </>
  );
}

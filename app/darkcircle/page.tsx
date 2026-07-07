"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../component/landing/Navbar";
import { sanitizeHandle, isValidHandle } from "../lib/sanitize";
import { PROOF_CATEGORY_MAP } from "../dashboard/_work-constants";
import { plugTier } from "../lib/plug";
import type { WorkProof, DarkCircleEntry } from "../dashboard/_types";

interface SearchResult {
  handle: string;
  profile_image_url?: string;
  archetype?: string;
  total_score?: number;
}

const ORBIT_SIZE = 560;
const ORBIT_RADIUS = 200;
const CENTER = ORBIT_SIZE / 2;
const PLUG_CAP = 15; // same top-end threshold as plugTier's elite halo

// Size is driven by plugs received, not score — DarkCircle is about who's
// getting real traction, not raw score. Capped at PLUG_CAP so one runaway
// account doesn't swallow the orbit.
function bubbleSize(plugs?: number) {
  return 40 + (Math.min(PLUG_CAP, Math.max(0, plugs ?? 0)) / PLUG_CAP) * 44;
}

// Deterministic per-handle pseudo-random, so float params stay stable across
// re-renders instead of jumping every time entries reload.
function seedFrom(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function Avatar({ url, handle, size }: { url?: string; handle: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div
        className="rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size, boxShadow: "0 0 0 1px rgba(255,255,255,0.12)" }}
      >
        <span className="text-slate-300 font-bold" style={{ fontSize: size * 0.36 }}>
          {handle.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={handle}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size, boxShadow: "0 0 0 1px rgba(255,255,255,0.12)" }}
    />
  );
}

export default function DarkCirclePage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const handle = (session as { handle?: string } | null)?.handle;
  const prefersReducedMotion = useReducedMotion();

  const [hasBuilderProof, setHasBuilderProof] = useState<boolean | null>(null);
  const [ownAvatar, setOwnAvatar] = useState<string | undefined>(undefined);
  const [entries, setEntries] = useState<DarkCircleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingHandle, setRemovingHandle] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus === "unauthenticated") router.replace("/login");
  }, [authStatus, router]);

  useEffect(() => {
    if (!handle) return;
    fetch(`/api/goals?handle=${encodeURIComponent(handle)}&all=true&completed=true`)
      .then((r) => r.json())
      .then((d: { goals?: WorkProof[] }) => {
        const proofs = d.goals ?? [];
        setHasBuilderProof(proofs.some((p) => (PROOF_CATEGORY_MAP[p.proof_type] ?? "builder") === "builder"));
      })
      .catch(() => setHasBuilderProof(false));
    fetch(`/api/dashboard?handle=${encodeURIComponent(handle)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { profile_image_url?: string }) => setOwnAvatar(d.profile_image_url))
      .catch(() => {});
  }, [handle]);

  const load = () => {
    if (!handle) return;
    setLoading(true);
    fetch(`/api/darkcircle?handle=${encodeURIComponent(handle)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => setEntries(json.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (handle && hasBuilderProof) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, hasBuilderProof]);

  useEffect(() => {
    const q = sanitizeHandle(input);
    if (!q) {
      setSuggestions([]);
      return;
    }
    const watchedHandles = new Set(entries.map((e) => e.watched_handle));
    const timer = setTimeout(() => {
      fetch(`/api/darkcircle/search?q=${encodeURIComponent(q)}`, { credentials: "include" })
        .then((r) => r.json())
        .then((json: { results?: SearchResult[] }) => {
          const results = (json.results ?? []).filter((r) => r.handle !== handle && !watchedHandles.has(r.handle));
          setSuggestions(results);
        })
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [input, handle, entries]);

  const positioned = useMemo(
    () =>
      entries.map((entry, i) => {
        const angle = (2 * Math.PI * i) / Math.max(1, entries.length) - Math.PI / 2;
        const seed = seedFrom(entry.watched_handle);
        return {
          entry,
          x: CENTER + ORBIT_RADIUS * Math.cos(angle),
          y: CENTER + ORBIT_RADIUS * Math.sin(angle),
          float: {
            ampX: 6 + (seed % 9), // 6–14px
            ampY: 6 + ((seed >> 4) % 9),
            duration: 5 + ((seed >> 8) % 6), // 5–10s
            delay: ((seed >> 12) % 30) / 10, // 0–2.9s, desyncs the bubbles
          },
        };
      }),
    [entries]
  );

  const addToCircle = async (target?: string) => {
    if (!handle) return;
    const watched = sanitizeHandle(target ?? input);
    if (!watched || !isValidHandle(watched)) {
      setMsg("Enter a valid handle.");
      return;
    }
    if (watched === handle) {
      setMsg("You can't add yourself.");
      return;
    }
    setAdding(true);
    setMsg(null);
    setSuggestOpen(false);
    try {
      const res = await fetch("/api/darkcircle", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_handle: handle, watched_handle: watched }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error ?? "Failed to add.");
        return;
      }
      setInput("");
      setSuggestions([]);
      load();
    } catch {
      setMsg("Failed to add — try again.");
    } finally {
      setAdding(false);
    }
  };

  const removeFromCircle = async (watched: string) => {
    if (!handle) return;
    setRemovingHandle(watched);
    setEntries((prev) => prev.filter((e) => e.watched_handle !== watched));
    try {
      const res = await fetch("/api/darkcircle", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_handle: handle, watched_handle: watched }),
      });
      if (!res.ok) load();
    } catch {
      load();
    } finally {
      setRemovingHandle(null);
    }
  };

  if (authStatus === "loading" || hasBuilderProof === null) {
    return <div className="min-h-screen bg-[#050508]" />;
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)]">
      <Navbar />
      <main className="pt-24 pb-24 px-6 max-w-3xl mx-auto flex flex-col items-center">
        <p className="font-[family-name:var(--font-mono)] text-xs text-white/40 tracking-[0.3em] uppercase mb-1">◐ DarkCircle</p>
        <p className="font-[family-name:var(--font-mono)] text-[11px] text-white/30 mb-10 text-center max-w-md">
          Your private watchlist of other builders. Never visible to anyone but you.
        </p>

        {!hasBuilderProof ? (
          <div className="border border-white/[0.08] rounded-2xl bg-white/[0.02] px-8 py-14 text-center max-w-md">
            <p className="text-sm text-white/60 mb-2">DarkCircle is locked.</p>
            <p className="font-[family-name:var(--font-mono)] text-xs text-white/40 mb-6">
              Submit your first work proof to unlock it — you track other builders once you&apos;ve proven you&apos;re one yourself.
            </p>
            <a
              href="/dashboard?tab=work"
              className="inline-block font-[family-name:var(--font-mono)] text-[11px] tracking-widest uppercase text-slate-300 hover:text-white border border-white/10 hover:border-white/25 rounded-sm px-5 py-2.5 transition-all"
            >
              Go to Work tab →
            </a>
          </div>
        ) : (
          <>
            <div className="relative w-full max-w-sm mb-10">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setSuggestOpen(true);
                  }}
                  onFocus={() => setSuggestOpen(true)}
                  onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addToCircle();
                  }}
                  placeholder="@handle to watch"
                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-sm px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]/50 focus:border-white/25 transition-colors"
                />
                <button
                  onClick={() => addToCircle()}
                  disabled={adding || !input.trim()}
                  className="font-[family-name:var(--font-mono)] text-[11px] tracking-widest uppercase text-slate-300 hover:text-white border border-white/10 hover:border-white/25 rounded-sm px-4 py-2 transition-all disabled:opacity-40"
                >
                  {adding ? "Adding…" : "Add"}
                </button>
              </div>

              {suggestOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 border border-white/10 bg-[#0a0a0d] rounded-sm overflow-hidden z-10">
                  {suggestions.map((s) => (
                    <button
                      key={s.handle}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addToCircle(s.handle)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.05] transition-colors text-left"
                    >
                      <Avatar url={s.profile_image_url} handle={s.handle} size={24} />
                      <span className="text-sm text-white flex-1 truncate">@{s.handle}</span>
                      {s.archetype && (
                        <span className="font-[family-name:var(--font-mono)] text-[9px] text-white/30 uppercase truncate">{s.archetype}</span>
                      )}
                      {typeof s.total_score === "number" && (
                        <span className="font-[family-name:var(--font-mono)] text-[10px] font-medium flex-shrink-0" style={{ color: "#c9a84c" }}>
                          {s.total_score}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {msg && <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/40 -mt-8 mb-8">{msg}</p>}

            <div className="relative mb-10" style={{ width: ORBIT_SIZE, height: ORBIT_SIZE, maxWidth: "100%" }}>
              <svg
                className="absolute inset-0 pointer-events-none"
                width="100%"
                height="100%"
                viewBox={`0 0 ${ORBIT_SIZE} ${ORBIT_SIZE}`}
              >
                {positioned.map(({ entry, x, y }) => (
                  <line key={entry.watched_handle} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
                ))}
              </svg>

              {/* Center — you */}
              <div
                className="absolute flex flex-col items-center gap-2"
                style={{ left: CENTER, top: CENTER, transform: "translate(-50%, -50%)" }}
              >
                <div className="rounded-full p-[3px]" style={{ boxShadow: "0 0 0 2px #c9a84c" }}>
                  <Avatar url={ownAvatar} handle={handle ?? "you"} size={72} />
                </div>
                <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-widest uppercase" style={{ color: "#c9a84c" }}>
                  You
                </span>
              </div>

              {loading && entries.length === 0 && (
                <p className="absolute font-[family-name:var(--font-mono)] text-xs text-white/30" style={{ left: CENTER, top: CENTER + 90, transform: "translateX(-50%)" }}>
                  Loading…
                </p>
              )}

              {!loading && entries.length === 0 && (
                <p
                  className="absolute font-[family-name:var(--font-mono)] text-xs text-white/30 text-center w-56"
                  style={{ left: CENTER, top: CENTER + 90, transform: "translateX(-50%)" }}
                >
                  Empty — add builders you want to keep an eye on below.
                </p>
              )}

              {positioned.map(({ entry, x, y, float }) => {
                const size = bubbleSize(entry.plugs);
                const tier = plugTier(entry.plugs ?? 0);
                return (
                  <div
                    key={entry.watched_handle}
                    className="absolute"
                    style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
                  >
                  <motion.div
                    className="flex flex-col items-center gap-1.5 group"
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={
                      prefersReducedMotion
                        ? { opacity: 1, scale: 1 }
                        : { opacity: 1, scale: 1, x: [0, float.ampX, 0, -float.ampX, 0], y: [0, -float.ampY, 0, float.ampY, 0] }
                    }
                    transition={
                      prefersReducedMotion
                        ? { duration: 0.3 }
                        : {
                            opacity: { duration: 0.3 },
                            scale: { duration: 0.3 },
                            x: { duration: float.duration, delay: float.delay, repeat: Infinity, ease: "easeInOut" },
                            y: { duration: float.duration * 1.15, delay: float.delay, repeat: Infinity, ease: "easeInOut" },
                          }
                    }
                  >
                    <a href={`/p/${entry.watched_handle}`} className="relative">
                      <div
                        className="rounded-full"
                        style={{ boxShadow: tier.glow > 0 ? `0 0 ${8 + tier.glow * 14}px ${tier.halo ? 3 : 1}px ${tier.color}` : "none" }}
                      >
                        <Avatar url={entry.profile_image_url} handle={entry.watched_handle} size={size} />
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeFromCircle(entry.watched_handle);
                        }}
                        disabled={removingHandle === entry.watched_handle}
                        title="Remove from DarkCircle"
                        aria-label={`Remove @${entry.watched_handle} from DarkCircle`}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0a0a0a] border border-white/20 text-white/40 hover:text-red-400 hover:border-red-400/40 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40"
                      >
                        ✕
                      </button>
                    </a>
                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/50 whitespace-nowrap">@{entry.watched_handle}</span>
                    <span className="flex items-center gap-2">
                      {typeof entry.total_score === "number" && (
                        <span className="font-[family-name:var(--font-mono)] text-[9px] font-medium" style={{ color: "#c9a84c" }}>
                          {entry.total_score}
                        </span>
                      )}
                      {!!entry.plugs && (
                        <span className="font-[family-name:var(--font-mono)] text-[9px] font-medium" style={{ color: tier.color }}>
                          ◐ {entry.plugs}
                        </span>
                      )}
                    </span>
                  </motion.div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "../component/landing/Navbar";
import { sanitizeHandle, isValidHandle } from "../lib/sanitize";
import { PROOF_CATEGORY_MAP } from "../dashboard/_work-constants";
import type { WorkProof, DarkCircleEntry } from "../dashboard/_types";

const ORBIT_SIZE = 560;
const ORBIT_RADIUS = 220;
const CENTER = ORBIT_SIZE / 2;

function bubbleSize(score?: number) {
  return 44 + (Math.min(100, Math.max(0, score ?? 0)) / 100) * 40;
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

  const [hasBuilderProof, setHasBuilderProof] = useState<boolean | null>(null);
  const [ownAvatar, setOwnAvatar] = useState<string | undefined>(undefined);
  const [entries, setEntries] = useState<DarkCircleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingHandle, setRemovingHandle] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

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

  const positioned = useMemo(
    () =>
      entries.map((entry, i) => {
        const angle = (2 * Math.PI * i) / Math.max(1, entries.length) - Math.PI / 2;
        return {
          entry,
          x: CENTER + ORBIT_RADIUS * Math.cos(angle),
          y: CENTER + ORBIT_RADIUS * Math.sin(angle),
        };
      }),
    [entries]
  );

  const addToCircle = async () => {
    if (!handle) return;
    const watched = sanitizeHandle(input);
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
            <div className="flex items-center gap-2 w-full max-w-sm mb-10">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addToCircle();
                }}
                placeholder="@handle to watch"
                className="flex-1 bg-white/[0.03] border border-white/10 rounded-sm px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors"
              />
              <button
                onClick={addToCircle}
                disabled={adding || !input.trim()}
                className="font-[family-name:var(--font-mono)] text-[11px] tracking-widest uppercase text-slate-300 hover:text-white border border-white/10 hover:border-white/25 rounded-sm px-4 py-2 transition-all disabled:opacity-40"
              >
                {adding ? "Adding…" : "Add"}
              </button>
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

              {positioned.map(({ entry, x, y }) => {
                const size = bubbleSize(entry.total_score);
                return (
                  <div
                    key={entry.watched_handle}
                    className="absolute flex flex-col items-center gap-1.5 group"
                    style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
                  >
                    <a href={`/p/${entry.watched_handle}`} className="relative">
                      <Avatar url={entry.profile_image_url} handle={entry.watched_handle} size={size} />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeFromCircle(entry.watched_handle);
                        }}
                        disabled={removingHandle === entry.watched_handle}
                        title="Remove from DarkCircle"
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0a0a0a] border border-white/20 text-white/40 hover:text-red-400 hover:border-red-400/40 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40"
                      >
                        ✕
                      </button>
                    </a>
                    <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/50 whitespace-nowrap">@{entry.watched_handle}</span>
                    {typeof entry.total_score === "number" && (
                      <span className="font-[family-name:var(--font-mono)] text-[9px] font-medium" style={{ color: "#c9a84c" }}>
                        {entry.total_score}
                      </span>
                    )}
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

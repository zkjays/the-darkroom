"use client";

import { useEffect, useState } from "react";
import { sanitizeHandle, isValidHandle } from "@/app/lib/sanitize";
import type { DarkCircleEntry } from "../../dashboard/_types";

// DarkCircle — a builder's private watchlist of other handles. Only ever
// rendered by ProfileView when `owner` is true, i.e. only the logged-in
// owner of a profile can see or edit their own DarkCircle.
export function DarkCircle({ handle }: { handle: string }) {
  const [entries, setEntries] = useState<DarkCircleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingHandle, setRemovingHandle] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/darkcircle?handle=${encodeURIComponent(handle)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => setEntries(json.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [handle]);

  const addToCircle = async () => {
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
    setRemovingHandle(watched);
    // Optimistic removal
    setEntries((prev) => prev.filter((e) => e.watched_handle !== watched));
    try {
      const res = await fetch("/api/darkcircle", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_handle: handle, watched_handle: watched }),
      });
      if (!res.ok) load(); // revert on failure
    } catch {
      load();
    } finally {
      setRemovingHandle(null);
    }
  };

  return (
    <div className="border border-white/[0.08] rounded-2xl bg-white/[0.02] px-5 py-5">
      <div className="flex items-center justify-between mb-4">
        <p className="font-[family-name:var(--font-mono)] text-xs text-white/40 tracking-[0.2em] uppercase">
          ◐ DarkCircle
        </p>
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/25">
          {entries.length} watched
        </span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addToCircle(); }}
          placeholder="@handle to watch"
          className="flex-1 bg-white/[0.03] border border-white/10 rounded-sm px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-colors"
        />
        <button
          onClick={addToCircle}
          disabled={adding || !input.trim()}
          className="font-[family-name:var(--font-mono)] text-[11px] tracking-widest uppercase text-slate-300 hover:text-white border border-white/10 hover:border-white/25 rounded-sm px-4 py-2 transition-all disabled:opacity-40 disabled:hover:text-slate-300 disabled:hover:border-white/10"
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </div>

      {msg && (
        <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/40 mb-3">{msg}</p>
      )}

      {loading ? (
        <p className="font-[family-name:var(--font-mono)] text-xs text-white/30 text-center py-4">Loading…</p>
      ) : entries.length === 0 ? (
        <div className="border border-white/[0.06] rounded-sm px-5 py-8 text-center">
          <p className="font-[family-name:var(--font-mono)] text-xs text-white/40">
            Your DarkCircle is empty — add builders you want to keep an eye on.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map((entry) => (
            <div
              key={entry.watched_handle}
              className="flex items-center justify-between gap-3 rounded-sm border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
            >
              <a
                href={`/p/${entry.watched_handle}`}
                className="flex items-center gap-3 min-w-0 group"
              >
                {entry.profile_image_url ? (
                  <img
                    src={entry.profile_image_url}
                    alt={entry.watched_handle}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.12)" }}
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0"
                    style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.12)" }}
                  >
                    <span className="text-slate-300 font-bold text-xs">
                      {entry.watched_handle.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm text-white truncate group-hover:underline">@{entry.watched_handle}</p>
                  {entry.archetype && (
                    <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500 truncate">{entry.archetype}</p>
                  )}
                </div>
              </a>
              <div className="flex items-center gap-3 flex-shrink-0">
                {typeof entry.total_score === "number" && (
                  <span className="font-[family-name:var(--font-mono)] text-xs font-medium" style={{ color: "#c9a84c" }}>
                    {entry.total_score}
                  </span>
                )}
                <button
                  onClick={() => removeFromCircle(entry.watched_handle)}
                  disabled={removingHandle === entry.watched_handle}
                  title="Remove from DarkCircle"
                  className="text-white/25 hover:text-red-400 text-sm transition-colors disabled:opacity-40"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

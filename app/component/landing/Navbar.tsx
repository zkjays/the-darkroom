"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";

interface XPState {
  score: number;
  current: number;
  cost: number;
  accent: string;
}

const XP_ACCENT_COLOR: Record<string, string> = {
  cyan:    "#c9a84c",
  violet:  "#c9a84c",
  emerald: "#c9a84c",
  amber:   "#c9a84c",
};

function getXPCost(score: number): number {
  if (score >= 95) return 20;
  if (score >= 75) return 15;
  return 10;
}

export default function Navbar() {
  const { data: session } = useSession();
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [xp, setXP] = useState<XPState | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handle = (session as { handle?: string } | null)?.handle;

  useEffect(() => {
    if (!handle) { setXP(null); return; } // eslint-disable-line react-hooks/set-state-in-effect
    fetch(`/api/dashboard?handle=${encodeURIComponent(handle)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        const score = (d.total_score ?? d.score ?? 0) as number;
        const totalXP = (d.total_xp ?? 0) as number;
        const cost = getXPCost(score);
        setXP({ score, current: totalXP % cost, cost, accent: d.theme_accent ?? "cyan" });
      })
      .catch(() => {});
  }, [handle]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 50) {
        setVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-[#0c0c14] border-b border-white/[0.08] transition-all duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 h-12">
        <Link href="/" className="transition hover:opacity-90">
          <Image
            src="/THEDR_logo_nobg.svg"
            alt="The Darkroom"
            width={200}
            height={24}
            className="h-auto w-42.5 sm:w-50"
            priority
          />
        </Link>

        <div className="flex items-center gap-4">
          {xp && (
            <div
              className="flex flex-col items-end gap-1"
              title={`${xp.cost - xp.current} XP until next score point`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white">{xp.score}</span>
                <span className="text-slate-500 text-xs">|</span>
                <span className="font-mono text-xs text-slate-400">{xp.current}/{xp.cost} XP</span>
              </div>
              <div className="h-[2px] w-15 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (xp.current / xp.cost) * 100)}%`, backgroundColor: XP_ACCENT_COLOR[xp.accent] ?? "#67e8f9" }}
                />
              </div>
            </div>
          )}
          {handle ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="font-[family-name:var(--font-mono)] text-xs text-white/60 transition hover:text-white flex items-center gap-1.5"
              >
                @{handle} ▾
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-[#0c0c14] border border-white/10 rounded-sm overflow-hidden shadow-xl z-50">
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-xs font-mono text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href={`/p/${handle}`}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-xs font-mono text-slate-300 hover:bg-white/[0.06] hover:text-white transition-colors"
                  >
                    My profile
                  </Link>
                  <button
                    onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                    className="w-full text-left px-4 py-2.5 text-xs font-mono text-red-400/70 hover:bg-white/[0.06] hover:text-red-400 transition-colors border-t border-white/[0.06]"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm text-white/60 transition hover:text-white"
            >
              Sign in →
            </Link>
          )}
        </div>
      </div>
      <div
        className="absolute bottom-0 left-6 w-16 h-[1px]"
        style={{ background: "linear-gradient(90deg, rgba(201,168,76,0.6), rgba(201,168,76,0.3), transparent)" }}
      />
    </header>
  );
}

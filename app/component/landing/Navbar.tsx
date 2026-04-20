"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

interface XPState {
  score: number;
  current: number;
  cost: number;
  accent: string;
}

const XP_ACCENT_COLOR: Record<string, string> = {
  cyan:    "#67e8f9",
  violet:  "#c4b5fd",
  emerald: "#6ee7b7",
  amber:   "#fcd34d",
};

function getXPCost(score: number): number {
  if (score >= 95) return 20;
  if (score >= 75) return 15;
  return 10;
}

export default function Navbar() {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [loggedIn, setLoggedIn] = useState(false);
  const [xp, setXP] = useState<XPState | null>(null);

  useEffect(() => {
    const handle = localStorage.getItem("darkroom_handle");
    if (!handle) return;
    setLoggedIn(true); // eslint-disable-line react-hooks/set-state-in-effect
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
  }, []);

  const navLink = loggedIn
    ? { href: "/dashboard", text: "Dashboard →" }
    : { href: "/darkroom-id", text: "Get ID →" };

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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl transition-all duration-500 ease-in-out ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      } ${
        hovered
          ? "bg-[#050508]/60 border-b border-white/10"
          : "bg-transparent border-b border-white/2"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 h-22">
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
          <Link
            href={navLink.href}
            className="text-sm text-white/60 transition hover:text-white"
          >
            {navLink.text}
          </Link>
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";

const LINKS = [
  { href: "/darkroom-id", label: "Get your ID" },
  { href: "/leaderboard", label: "Roomboard" },
  { href: "/login", label: "Sign in" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.08] px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-mono text-xs tracking-[0.08em] text-white/25">thedarkroom.xyz · 2026</span>

        <nav className="flex items-center gap-6">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-widest text-white/35 transition-colors hover:text-white/70"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <span className="font-mono text-[10px]" style={{ color: "rgba(201,168,76,0.4)" }}>◈</span>
      </div>
    </footer>
  );
}

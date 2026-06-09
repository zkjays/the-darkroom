"use client";

export default function BuyButton() {
  return (
    <div className="w-full rounded-xl border border-white/8 bg-white/[0.02] p-4 flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm">⌛</span>
        <span className="font-[family-name:var(--font-mono)] text-xs text-white/35 tracking-widest uppercase">
          Launching this week
        </span>
      </div>
      <p className="font-[family-name:var(--font-mono)] text-[11px] text-white/20 text-center leading-relaxed">
        Be first →{" "}
        <a
          href="https://x.com/zkjays"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/35 hover:text-white/55 transition-colors underline underline-offset-2"
        >
          DM @zkjays on X
        </a>
      </p>
    </div>
  );
}

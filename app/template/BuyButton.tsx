"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface UnlockState {
  unlocked: boolean;
  count: number;
  needed: number;
  download_url?: string | null;
}

export default function BuyButton() {
  const { data: session } = useSession();
  const handle = session?.handle;
  const [state, setState] = useState<UnlockState | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/second-brain")
      .then((r) => r.json())
      .then((d) => setState(d))
      .catch(() => {});
  }, []);

  // Unlocked → reveal the gated download
  if (state?.unlocked && state.download_url) {
    return (
      <div className="w-full rounded-xl border border-[#00d4aa]/30 bg-[#00d4aa]/[0.04] p-4 flex flex-col items-center gap-3">
        <span className="font-[family-name:var(--font-mono)] text-xs tracking-widest uppercase" style={{ color: "#00d4aa" }}>
          ✓ Unlocked
        </span>
        <a
          href={state.download_url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full text-center rounded-lg border border-[#00d4aa]/40 hover:border-[#00d4aa]/70 bg-[#00d4aa]/[0.06] hover:bg-[#00d4aa]/[0.1] py-2.5 font-[family-name:var(--font-mono)] text-xs tracking-widest uppercase transition-all"
          style={{ color: "#00d4aa" }}
        >
          Download the vault →
        </a>
      </div>
    );
  }

  const count = state?.count ?? 0;
  const needed = state?.needed ?? 25;
  const referralLink = handle ? `/p/${handle}?ref=${handle}` : null;

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(`${window.location.origin}${referralLink}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Locked → show progress toward the 25-referral unlock + the manual-buy fallback
  return (
    <div className="w-full rounded-xl border border-white/8 bg-white/[0.02] p-4 flex flex-col items-center gap-3">
      <span className="font-[family-name:var(--font-mono)] text-xs text-white/45 tracking-widest uppercase">
        Unlock with referrals
      </span>

      <div className="w-full flex flex-col gap-1.5">
        <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, (count / needed) * 100)}%`, background: "#00d4aa" }}
          />
        </div>
        <p className="font-[family-name:var(--font-mono)] text-[11px] text-white/40 text-center">
          {handle ? `${count}/${needed} referrals` : "Claim your Darkroom ID to start referring"}
        </p>
      </div>

      {referralLink && (
        <button
          onClick={copyLink}
          className="w-full text-center rounded-lg border border-white/10 hover:border-white/20 py-2 font-[family-name:var(--font-mono)] text-[11px] text-white/55 hover:text-white transition-all"
        >
          {copied ? "Link copied!" : "Copy your referral link"}
        </button>
      )}

      <p className="font-[family-name:var(--font-mono)] text-[11px] text-white/20 text-center leading-relaxed">
        Or buy directly →{" "}
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

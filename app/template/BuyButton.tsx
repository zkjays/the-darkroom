"use client";

import { useState } from "react";

// TODO: replace with actual Base wallet address
const WALLET_ADDRESS = "0x0000000000000000000000000000000000000000";
const AMOUNT_USDC = "29";

export default function BuyButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(WALLET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-white text-[#050508] font-semibold py-3 rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all text-sm"
      >
        Buy with USDC →
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#0d0d0f] border border-white/10 rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-white text-base">Pay with USDC</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-white/30 hover:text-white/60 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-white/35 text-sm mb-5">
              Send exactly {AMOUNT_USDC} USDC to this address on{" "}
              <span className="text-white/50">Base network</span>.
            </p>

            {/* Wallet address */}
            <div className="bg-white/4 border border-white/8 rounded-xl p-3 mb-3">
              <p className="font-[family-name:var(--font-mono)] text-xs text-white/25 mb-1.5 uppercase tracking-widest">
                Wallet address
              </p>
              <div className="flex items-center gap-2">
                <code className="font-[family-name:var(--font-mono)] text-xs text-white/55 break-all flex-1">
                  {WALLET_ADDRESS}
                </code>
                <button
                  onClick={copy}
                  className="text-xs font-[family-name:var(--font-mono)] text-cyan-400/70 hover:text-cyan-400 transition-colors flex-shrink-0 border border-cyan-400/20 px-2 py-1 rounded-md"
                >
                  {copied ? "✓" : "Copy"}
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="bg-white/4 border border-white/8 rounded-xl p-3 mb-4">
              <p className="font-[family-name:var(--font-mono)] text-xs text-white/25 mb-1.5 uppercase tracking-widest">
                Amount
              </p>
              <p className="font-[family-name:var(--font-mono)] text-sm text-white/70">
                {AMOUNT_USDC} USDC
              </p>
            </div>

            {/* Warning */}
            <div className="bg-amber-400/5 border border-amber-400/15 rounded-xl px-3 py-2.5 mb-5">
              <p className="text-xs text-amber-400/65 font-[family-name:var(--font-mono)]">
                ⚠ Base network only — not Ethereum mainnet
              </p>
            </div>

            {/* Footer */}
            <p className="text-white/25 text-xs text-center leading-relaxed">
              After payment, DM your TX hash to{" "}
              <a
                href="https://x.com/zkjays"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/45 hover:text-white/70 transition-colors underline underline-offset-2"
              >
                @zkjays
              </a>{" "}
              on X. Vault delivered within 24h.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

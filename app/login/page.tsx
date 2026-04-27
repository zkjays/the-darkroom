"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = () => {
    setLoading(true);
    signIn("twitter", { callbackUrl: "/darkroom-id" });
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)] flex items-center justify-center px-6">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.015] blur-[120px]" />
        <div className="absolute left-1/4 bottom-1/4 w-[400px] h-[400px] rounded-full bg-white/[0.01] blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-sm">
        {/* Logo */}
        <Image
          src="/THEDR_logo_nobg.svg"
          alt="The Darkroom"
          width={220}
          height={28}
          className="h-auto w-48 sm:w-56"
          priority
        />

        {/* Card */}
        <div className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Enter The Darkroom
            </h1>
            <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.15em] text-slate-400">
              Connect your X account to get started
            </p>
          </div>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {loading ? (
              <span className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.631L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
              </svg>
            )}
            {loading ? "Connecting…" : "Sign in with X"}
          </button>

          <p className="font-[family-name:var(--font-mono)] text-[10px] text-slate-500 text-center leading-relaxed">
            We only read your public profile.<br />Nothing is posted on your behalf.
          </p>
        </div>
      </div>
    </div>
  );
}

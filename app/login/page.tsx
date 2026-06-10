"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    await signIn("twitter", { callbackUrl: "/darkroom-id" });
  };

  return (
    <div className="relative min-h-screen bg-[#050508] text-white font-[family-name:var(--font-outfit)] flex items-center justify-center px-6 overflow-hidden">

      {/* Spotlight */}
      <div className="darkroom-spotlight" />

      {/* Grid */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:50px_50px]" />

      {/* Scanlines */}
      <div className="scanlines" />

      {/* Vignette */}
      <div className="vignette" />

      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-sm animate-fade-in-up">

        {/* Logo */}
        <Image
          src="/THEDR_logo_nobg.svg"
          alt="The Darkroom"
          width={220}
          height={28}
          className="h-auto w-52 sm:w-64 opacity-90"
          priority
        />

        {/* Card */}
        <div className="w-full rounded-2xl bg-[#0a0a12]/80 border border-white/[0.08] backdrop-blur-sm shadow-[0_0_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden">

          {/* Gold accent line */}
          <div className="h-[1px] w-full" style={{ background: "linear-gradient(90deg, transparent, #c9a84c44, transparent)" }} />

          <div className="flex flex-col items-center gap-6 p-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.3em] text-white/25 uppercase">
                proof of work — not promises
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight text-white mt-1">
                Enter The Darkroom
              </h1>
              <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.1em] text-white/35">
                Connect your X account to get started
              </p>
            </div>

            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_40px_rgba(255,255,255,0.12)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.631L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                </svg>
              )}
              {loading ? "Connecting…" : "Sign in with X"}
            </button>

            <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/20 text-center leading-relaxed">
              We only read your public profile.<br />Nothing is posted on your behalf.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

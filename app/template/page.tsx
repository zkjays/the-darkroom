import Navbar from "@/app/component/landing/Navbar";
import Footer from "@/app/component/landing/Footer";
import BuyButton from "./BuyButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Second Brain Template — The Darkroom",
  description:
    "An AI-native Obsidian vault for solo builders. 27 files, 7 folders — built to capture, think, and ship.",
};

const folders = [
  { icon: "📥", name: "00-inbox", desc: "Capture everything — paste, clip, voice note" },
  { icon: "📄", name: "01-sources", desc: "Structured notes after AI processing" },
  { icon: "🧠", name: "02-knowledge", desc: "Permanent knowledge base — ZK, privacy, AI, crypto" },
  { icon: "✍️", name: "03-content", desc: "X post pipeline — angles, drafts, ready-to-publish stock" },
  { icon: "⚖️", name: "04-decisions", desc: "Important decisions with full context and reasoning" },
  { icon: "🏗️", name: "05-projects", desc: "Active project spaces with live context" },
  { icon: "⚙️", name: "06-systems", desc: "Workflows, reply bank, sessions, context-live" },
];

const features = [
  "27 pre-built files, ready on day one",
  "AI-native — built to work with Claude",
  "Weekly review system included",
  "Content pipeline for X / social media",
  "Session memory & context tracking",
  "Reply bank for faster engagement",
  "100% local — your data stays yours",
];

const steps = [
  { step: "01", title: "Pay with USDC", desc: "Send $29 USDC on Base network. Gas fees < $0.01." },
  { step: "02", title: "DM your TX hash", desc: "Send your transaction hash to @zkjays on X." },
  { step: "03", title: "Get the vault", desc: "Receive the full Obsidian vault directly in your DMs." },
];

export default function TemplatePage() {
  return (
    <main className="min-h-screen bg-[#050508] text-white">
      <div className="relative overflow-hidden">

        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="darkroom-glow-main" />
          <div className="darkroom-glow-top" />
          <div className="darkroom-glow-bottom" />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-size-[50px_50px]" />

        <div className="relative z-10">
          <Navbar />

          <div className="mx-auto max-w-4xl px-6 pt-32 pb-24">

            {/* Badge */}
            <div className="flex justify-center mb-8">
              <span className="font-[family-name:var(--font-mono)] text-xs text-cyan-400/70 border border-cyan-400/20 bg-cyan-400/5 px-3 py-1.5 rounded-full tracking-widest uppercase">
                The Darkroom · Digital Product
              </span>
            </div>

            {/* Hero */}
            <div className="text-center mb-16">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6 leading-tight">
                Second Brain
                <span className="block text-white/35">for Solo Builders</span>
              </h1>
              <p className="text-white/45 text-lg max-w-xl mx-auto leading-relaxed">
                An AI-native Obsidian vault. 27 files, 7 folders — built to
                capture ideas, build knowledge, and ship content without losing
                your mind.
              </p>
            </div>

            {/* Main grid: folders + pricing */}
            <div className="grid md:grid-cols-[1fr_290px] gap-8 items-start">

              {/* Left: what's included */}
              <div>
                <p className="font-[family-name:var(--font-mono)] text-xs text-white/25 uppercase tracking-widest mb-4">
                  7 folders · 27 files
                </p>
                <div className="space-y-2">
                  {folders.map((f) => (
                    <div
                      key={f.name}
                      className="flex items-start gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                    >
                      <span className="text-lg flex-shrink-0 mt-0.5">{f.icon}</span>
                      <div>
                        <div className="font-[family-name:var(--font-mono)] text-sm text-white/65 mb-0.5">
                          {f.name}/
                        </div>
                        <div className="text-sm text-white/30">{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: pricing card */}
              <div className="md:sticky md:top-24">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

                  <div className="mb-5">
                    <p className="font-[family-name:var(--font-mono)] text-xs text-white/25 uppercase tracking-widest mb-2">
                      Price
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">$29</span>
                      <span className="font-[family-name:var(--font-mono)] text-sm text-white/30">
                        USDC
                      </span>
                    </div>
                    <p className="font-[family-name:var(--font-mono)] text-xs text-white/20 mt-1">
                      Base network · ~$0 gas
                    </p>
                  </div>

                  <ul className="space-y-2.5 mb-6">
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-white/45">
                        <span className="text-cyan-400/60 flex-shrink-0 mt-px">›</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <BuyButton />

                  <p className="text-center font-[family-name:var(--font-mono)] text-xs text-white/18 mt-4">
                    Delivered via DM within 24h
                  </p>
                </div>
              </div>
            </div>

            {/* How it works */}
            <div className="mt-20 pt-12 border-t border-white/5">
              <p className="font-[family-name:var(--font-mono)] text-xs text-white/25 uppercase tracking-widest mb-10 text-center">
                How it works
              </p>
              <div className="grid sm:grid-cols-3 gap-8">
                {steps.map((s) => (
                  <div key={s.step} className="text-center">
                    <div className="font-[family-name:var(--font-mono)] text-4xl font-bold text-white/6 mb-3">
                      {s.step}
                    </div>
                    <div className="font-semibold text-white/65 mb-2 text-sm">{s.title}</div>
                    <div className="text-sm text-white/30 leading-relaxed">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="mt-20 text-center">
              <p className="text-white/25 text-sm font-[family-name:var(--font-mono)]">
                Questions?{" "}
                <a
                  href="https://x.com/zkjays"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-white/70 transition-colors"
                >
                  DM @zkjays on X →
                </a>
              </p>
            </div>

          </div>

          <Footer />
        </div>
      </div>
    </main>
  );
}

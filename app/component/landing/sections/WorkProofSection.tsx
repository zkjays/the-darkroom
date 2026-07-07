import Reveal from "../Reveal";

const PILLS = [
  { label: "Ship", active: true },
  { label: "Code", active: false },
  { label: "Publish", active: false },
  { label: "Release", active: false },
  { label: "Design", active: false },
];

const GALLERY = [
  {
    title: "Shipped the v2 onboarding flow",
    type: "Ship",
    badge: "Pending 1/3",
    badgeColor: "text-slate-400 border-slate-700",
  },
  {
    title: "Open-sourced the auth middleware",
    type: "Code",
    badge: "Validated",
    badgeColor: "text-emerald-400 border-emerald-800",
  },
];

export default function WorkProofSection() {
  return (
    <section className="relative mx-auto max-w-5xl px-6 py-28">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div className="text-left">
          <Reveal>
            <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.3em] text-white/30 uppercase">
              work proof &amp; plugs
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h2 className="mt-6 max-w-lg text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl">
              The one score you can&apos;t self-report.
            </h2>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-6 max-w-md text-sm leading-6 text-white/45">
              Submit a real link: a GitHub repo, a deployed project, an article, a
              prototype. It sits locked at zero until the room backs it.
            </p>
          </Reveal>

          <Reveal delay={220}>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/45">
              <span className="text-white/70 font-medium">3 plugs</span> from real
              builders and it flips from claim to validated. No plugs, no count.
              Consensus can&apos;t be faked.
            </p>
          </Reveal>

          <Reveal delay={280}>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/45">
              Daily Refresh re-analyzes your latest activity once every 24 hours, on
              demand. Your score, on your terms.
            </p>
          </Reveal>
        </div>

        <Reveal delay={200} className="mx-auto w-full max-w-md">
          <div className="hero-product w-full rounded-2xl border border-white/[0.07] bg-[#0a0a12]/90 shadow-[0_40px_120px_-20px_rgba(0,180,255,0.08),0_0_0_1px_rgba(255,255,255,0.03)] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
              <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/25">
                Submit Proof
              </span>
              <span className="ml-auto font-[family-name:var(--font-mono)] text-[10px] text-white/20">
                worth <span className="text-[#c9a84c]">8 pts</span>
              </span>
            </div>

            <div className="flex flex-col gap-5 p-5">
              <div className="flex flex-col gap-1.5">
                <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/25">
                  What did you build?
                </span>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white/70">
                  Shipped the v2 onboarding flow
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 font-[family-name:var(--font-mono)] text-[11px] text-white/30">
                https://thedarkroom.xyz/changelog
              </div>

              <div className="flex flex-wrap gap-2">
                {PILLS.map((p) => (
                  <span
                    key={p.label}
                    className="rounded-full border px-3 py-1 font-[family-name:var(--font-mono)] text-[10px] transition-colors"
                    style={
                      p.active
                        ? { borderColor: "#c9a84c55", color: "#c9a84c", background: "#c9a84c11" }
                        : { borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)", background: "transparent" }
                    }
                  >
                    {p.label}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/20">
                  Proof auto-verified via URL
                </span>
                <div className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black">
                  Submit Proof →
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-white/[0.04] pt-2">
                {GALLERY.map((item) => (
                  <div
                    key={item.title}
                    className="relative flex min-h-[90px] flex-col justify-end overflow-hidden rounded-xl border border-white/[0.06] bg-[#0c0c14] p-3"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="relative flex flex-col gap-1">
                      <span className="font-[family-name:var(--font-mono)] text-[9px] uppercase text-white/30">
                        {item.type}
                      </span>
                      <p className="line-clamp-2 text-xs leading-4 text-white/70">{item.title}</p>
                      <span className={`self-start rounded border px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

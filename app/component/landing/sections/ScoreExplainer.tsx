import Reveal from "../Reveal";

const PILLARS = [
  {
    label: "Social Proof",
    weight: "35%",
    detail: "X/Twitter presence, engagement quality, community signal.",
  },
  {
    label: "Builder Proof",
    weight: "35%",
    detail: "Evidence of actual building: technical content, projects shipped, public learning.",
  },
  {
    label: "Work Proof",
    weight: "30%",
    detail: "Submitted links to real work, validated by 3 community endorsements.",
  },
];

export default function ScoreExplainer() {
  return (
    <section className="relative mx-auto max-w-5xl px-6 py-28 text-center">
      <Reveal>
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.3em] text-white/30 uppercase">
          the room score
        </p>
      </Reveal>

      <Reveal delay={80}>
        <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl">
          Not a black box. Three real things, weighted.
        </h2>
      </Reveal>

      <div className="mt-16 grid gap-5 text-left sm:grid-cols-3">
        {PILLARS.map((p, i) => (
          <Reveal key={p.label} delay={140 + i * 70}>
            <div className="h-full rounded-2xl border border-white/[0.07] bg-[#0a0a12]/70 p-6">
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/25">
                  {p.label}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-xs text-[#c9a84c]">
                  {p.weight}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/50">{p.detail}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={360}>
        <div className="mx-auto mt-14 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/[0.07] bg-[#0c0c14]/80 px-6 py-3 font-[family-name:var(--font-mono)] text-xs text-white/40">
          <span>(social <span className="text-[#c9a84c]">× 0.35</span>)</span>
          <span className="text-white/20">+</span>
          <span>(builder <span className="text-[#c9a84c]">× 0.35</span>)</span>
          <span className="text-white/20">+</span>
          <span>(work <span className="text-[#c9a84c]">× 0.30</span>)</span>
        </div>
      </Reveal>

      <Reveal delay={420}>
        <p className="mx-auto mt-8 max-w-md text-sm leading-6 text-white/35">
          No single metric carries you. Refresh it any time, once every 24h, re-analyzed
          from your latest activity.
        </p>
      </Reveal>
    </section>
  );
}

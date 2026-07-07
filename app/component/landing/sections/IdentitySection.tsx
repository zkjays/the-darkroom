import Reveal from "../Reveal";

export default function IdentitySection() {
  return (
    <section className="relative mx-auto max-w-5xl px-6 py-28">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <Reveal className="order-2 mx-auto w-full max-w-sm lg:order-1">
          <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a12]/90 p-6 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between">
              <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/25">
                Darkroom ID
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/20">
                thedarkroom.xyz/p/handle
              </span>
            </div>

            <div className="mt-8 flex flex-col items-center gap-2">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#c9a84c]/40 bg-[#08080e]">
                <span className="text-2xl font-extrabold text-[#c9a84c]">57</span>
              </div>
              <span className="mt-2 rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/10 px-3 py-1 font-[family-name:var(--font-mono)] text-[10px] text-[#c9a84c]">
                Silent Architect
              </span>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-5 text-center">
              <div>
                <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/25">SOCIAL</p>
                <p className="mt-1 text-sm font-semibold text-white/70">62</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/25">BUILDER</p>
                <p className="mt-1 text-sm font-semibold text-white/70">58</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-mono)] text-[10px] text-white/25">WORK</p>
                <p className="mt-1 text-sm font-semibold text-white/70">49</p>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="order-1 text-left lg:order-2">
          <Reveal>
            <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.3em] text-white/30 uppercase">
              your room, your card
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h2 className="mt-6 max-w-lg text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl">
              A public profile that&apos;s actually yours to prove.
            </h2>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-6 max-w-md text-sm leading-6 text-white/45">
              Every builder gets a public Darkroom ID at{" "}
              <span className="text-white/70 font-medium">/p/[handle]</span>. Score,
              archetype, and every validated proof, in one link.
            </p>
          </Reveal>

          <Reveal delay={220}>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/45">
              Share it as a Darkroom Card, a single image with your score and archetype,
              built to travel.
            </p>
          </Reveal>

          <Reveal delay={280}>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/45">
              Submit your first validated proof and you unlock the{" "}
              <span className="text-white/70 font-medium">Roomboard</span>, the public
              ranking, sorted by real score, not followers.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

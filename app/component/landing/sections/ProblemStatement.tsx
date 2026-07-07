import Reveal from "../Reveal";

export default function ProblemStatement() {
  return (
    <section className="relative mx-auto max-w-4xl px-6 py-28 text-center">
      <Reveal>
        <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.3em] text-white/30 uppercase">
          the gap
        </p>
      </Reveal>

      <Reveal delay={80}>
        <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl">
          Follower count was never proof of work.
        </h2>
      </Reveal>

      <div className="mx-auto mt-16 grid max-w-3xl gap-5 text-left sm:grid-cols-2">
        <Reveal delay={140}>
          <div className="h-full rounded-2xl border border-white/[0.07] bg-[#0a0a12]/70 p-7">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/25">
              the quiet shipper
            </p>
            <p className="mt-3 text-sm leading-6 text-white/50">
              You ship real work. Repos, features, products. Most of it never gets seen,
              because you&apos;d rather build than post about building.
            </p>
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div className="h-full rounded-2xl border border-white/[0.07] bg-[#0a0a12]/70 p-7">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/25">
              the overlooked creator
            </p>
            <p className="mt-3 text-sm leading-6 text-white/50">
              Your threads, your writing, your community work is good. It just sits next
              to accounts with ten times the followers and none of the substance.
            </p>
          </div>
        </Reveal>
      </div>

      <Reveal delay={260}>
        <p className="mx-auto mt-14 max-w-lg text-base leading-7 text-white/40">
          <span className="text-white/70 font-medium">The Darkroom</span> scores what you
          actually shipped, not how loud you were about it.
        </p>
      </Reveal>
    </section>
  );
}

import Link from "next/link";
import Reveal from "../Reveal";

export default function FinalCTA() {
  return (
    <section className="relative mx-auto max-w-3xl px-6 py-32 text-center">
      <Reveal>
        <h2 className="mx-auto max-w-xl text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl">
          Proof of work, not promises.
        </h2>
      </Reveal>

      <Reveal delay={100}>
        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/darkroom-id"
            className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_40px_rgba(255,255,255,0.12)]"
          >
            Go see where you land
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.2em] text-white/18 uppercase">
            60 seconds · proof-gated · free for builders
          </p>
        </div>
      </Reveal>
    </section>
  );
}

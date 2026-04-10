import Link from "next/link";

export default function Hero() {
  return (
    <section className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6 text-center">
      <div className="mx-auto max-w-3xl">
        <p className="mb-8 font-mono text-xs tracking-[0.3em] text-white/30 uppercase">
          where the real work happens
        </p>

        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl">
          Enter the room.
          <br />
          <span className="font-light text-white/40">Build what matters.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/45 sm:text-lg">
          For builders, creators, and focused minds who ship in silence and{" "}
          <span className="font-semibold text-white/60">prove when ready</span>.
          Your zone. Your rules.
        </p>

        <div className="mt-10">
          <Link
            href="/darkroom-id"
            className="group inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)]"
          >
            Get your Darkroom ID
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <p className="mt-4 font-mono text-[11px] tracking-[0.15em] text-white/20 uppercase">
          60 seconds · no data stored
        </p>
      </div>
    </section>
  );
}
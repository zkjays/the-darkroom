import Link from "next/link";

export default function Hero() {
  return (
    <section className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6 text-center">
      <div className="mx-auto max-w-3xl">
        <p className="mb-8 font-mono text-xs tracking-[0.3em] text-white/35 uppercase">
          where the real work happens
        </p>

        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
          Enter the room.
          <br />
          Build what matters.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/50 sm:text-lg">
          For builders, creators, and focused minds who ship in silence and
          prove when ready. Your zone. Your rules.
        </p>

        <div className="mt-10">
          <Link
            href="/darkroom-id"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-white/90"
          >
            Get your Darkroom ID
            <span>→</span>
          </Link>
        </div>

        <p className="mt-4 font-mono text-[11px] tracking-[0.12em] text-white/25 uppercase">
          60 seconds · no data stored
        </p>
      </div>
    </section>
  );
}
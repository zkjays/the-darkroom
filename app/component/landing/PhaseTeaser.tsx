const items = ["Lessons", "Certifications", "Wallet", "Tools"];

export default function PhaseTeaser() {
  return (
    <section className="border-t border-white/5 px-6 py-24">
      <div className="mx-auto max-w-5xl text-center">
        <p className="mb-10 font-mono text-xs tracking-[0.3em] text-white/35 uppercase">
          phase 2
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {items.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/5 bg-white/2 px-6 py-5 text-sm text-white/55 transition hover:border-white/10 hover:bg-white/4 hover:text-white/80"
            >
              {item}
            </div>
          ))}
        </div>

        <p className="mt-10 font-mono text-[11px] tracking-[0.12em] text-white/25 uppercase">
          More coming. Stay close.
        </p>
      </div>
    </section>
  );
}
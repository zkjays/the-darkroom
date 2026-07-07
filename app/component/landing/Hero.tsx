import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex min-h-[calc(100vh-80px)] flex-col items-center justify-center px-6 text-center overflow-hidden">

      {/* Central spotlight */}
      <div className="darkroom-spotlight" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-0">

        <p className="animate-fade-in-up mb-8 font-[family-name:var(--font-mono)] text-xs tracking-[0.3em] text-white/30 uppercase">
          proof of work, not promises
        </p>

        <h1
          className="animate-fade-in-up mx-auto max-w-2xl text-5xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-7xl"
          style={{ animationDelay: "0.05s", animationFillMode: "both" }}
        >
          Build in the dark.
          <br />
          <span className="font-light text-white/35">Prove when ready.</span>
        </h1>

        <p
          className="animate-fade-in-up mx-auto mt-7 max-w-lg text-base leading-7 text-white/40 sm:text-lg"
          style={{ animationDelay: "0.1s", animationFillMode: "both" }}
        >
          Submit proof of what you shipped,{" "}
          <span className="text-white/60 font-medium">validated by the room</span>, not by claims.
        </p>

        <div
          className="animate-fade-in-up mt-10 flex flex-col items-center gap-3"
          style={{ animationDelay: "0.15s", animationFillMode: "both" }}
        >
          <Link
            href="/darkroom-id"
            className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_40px_rgba(255,255,255,0.12)]"
          >
            Get your Darkroom ID
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <p className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.2em] text-white/18 uppercase">
            60 seconds · proof-gated
          </p>
        </div>
      </div>

      <div
        className="animate-fade-in-up absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ animationDelay: "0.3s", animationFillMode: "both" }}
      >
        <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.3em] text-white/20 uppercase">
          scroll
        </span>
        <span className="text-white/20">↓</span>
      </div>
    </section>
  );
}

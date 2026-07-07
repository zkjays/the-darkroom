import Reveal from "../Reveal";

const ARCHETYPES = [
  { name: "Ghost Builder", threshold: "≥62", tagline: "ships in the dark, drops in the light" },
  { name: "Silent Architect", threshold: "≥56", tagline: "the blueprint speaks for itself" },
  { name: "Shadow Operator", threshold: "≥50", tagline: "you won't see me, but you'll see my work" },
  { name: "Half Built", threshold: "≥44", tagline: "foundation solid, still stacking floors" },
  { name: "Curious Lurker", threshold: "≥38", tagline: "reads everything, ships soon" },
  { name: "Almost Based", threshold: "≥32", tagline: "one commit away from greatness" },
  { name: "Main Character Loading", threshold: "≥22", tagline: "the arc hasn't even started" },
  { name: "Fresh Compile", threshold: "≥14", tagline: "first build, first bugs, first glory" },
  { name: "NPC (for now)", threshold: "<14", tagline: "everyone's origin story starts somewhere" },
];

export default function ArchetypesShowcase() {
  return (
    <section className="relative py-28">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <Reveal>
          <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.3em] text-white/30 uppercase">
            9 archetypes
          </p>
        </Reveal>

        <Reveal delay={80}>
          <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl">
            The room names you. You earn the name.
          </h2>
        </Reveal>
      </div>

      <Reveal delay={160}>
        <div className="hero-mask-bottom mt-16 flex gap-4 overflow-x-auto px-6 pb-6 sm:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ARCHETYPES.map((a) => (
            <div
              key={a.name}
              className="flex w-56 shrink-0 flex-col gap-3 rounded-2xl border border-white/[0.07] bg-[#0a0a12]/70 p-5 text-left"
            >
              <span className="self-start rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/10 px-2.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-[#c9a84c]">
                {a.threshold}
              </span>
              <span className="text-sm font-semibold text-white/85">{a.name}</span>
              <span className="text-xs leading-5 text-white/40">{a.tagline}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

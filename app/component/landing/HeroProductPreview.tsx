const PILLS = [
  { label: "Ship",    active: true },
  { label: "Code",    active: false },
  { label: "Publish", active: false },
  { label: "Release", active: false },
  { label: "Design",  active: false },
];

const GALLERY = [
  {
    title: "Shipped the v2 onboarding flow",
    type: "Ship",
    badge: "Pending 1/3",
    badgeColor: "text-slate-400 border-slate-700",
    image: null,
  },
  {
    title: "Open-sourced the auth middleware",
    type: "Code",
    badge: "Validated",
    badgeColor: "text-emerald-400 border-emerald-800",
    image: null,
  },
];

export default function HeroProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-2xl px-6 pb-20">
      <div
        className="hero-product hero-mask-bottom w-full rounded-2xl border border-white/[0.07] bg-[#0a0a12]/90 shadow-[0_40px_120px_-20px_rgba(0,180,255,0.08),0_0_0_1px_rgba(255,255,255,0.03)] overflow-hidden"
        style={{ transform: "perspective(1800px) rotateX(4deg)", transformOrigin: "top center" }}
      >
        {/* Card header */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
          <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/25">
            Submit Proof
          </span>
          <span className="ml-auto font-[family-name:var(--font-mono)] text-[10px] text-white/20">
            worth <span className="text-[#c9a84c]">8 pts</span>
          </span>
        </div>

        <div className="flex flex-col gap-5 p-5">
          {/* Title field */}
          <div className="flex flex-col gap-1.5">
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-white/25">
              What did you build?
            </span>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white/70">
              Shipped the v2 onboarding flow
            </div>
          </div>

          {/* URL field */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 font-[family-name:var(--font-mono)] text-[11px] text-white/30">
            https://thedarkroom.xyz/changelog
          </div>

          {/* Type pills */}
          <div className="flex flex-wrap gap-2">
            {PILLS.map((p) => (
              <span
                key={p.label}
                className="rounded-full border px-3 py-1 font-[family-name:var(--font-mono)] text-[10px] transition-colors"
                style={p.active
                  ? { borderColor: "#c9a84c55", color: "#c9a84c", background: "#c9a84c11" }
                  : { borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.3)", background: "transparent" }
                }
              >
                {p.label}
              </span>
            ))}
          </div>

          {/* Submit button */}
          <div className="flex items-center justify-between">
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/20">
              Proof auto-verified via URL
            </span>
            <div className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black">
              Submit Proof →
            </div>
          </div>

          {/* Gallery preview */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.04]">
            {GALLERY.map((item) => (
              <div
                key={item.title}
                className="relative flex min-h-[90px] flex-col justify-end rounded-xl border border-white/[0.06] bg-[#0c0c14] p-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="relative flex flex-col gap-1">
                  <span className="font-[family-name:var(--font-mono)] text-[9px] text-white/30 uppercase">
                    {item.type}
                  </span>
                  <p className="text-xs text-white/70 leading-4 line-clamp-2">{item.title}</p>
                  <span className={`self-start rounded border px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

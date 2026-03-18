type BrandMarkProps = {
  compact?: boolean;
};

export default function BrandMark({ compact = false }: BrandMarkProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.7)]" />
        <span className="text-sm font-semibold uppercase tracking-[0.24em] text-white/90">
          The Darkroom
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-5 flex items-center gap-3">
        <span className="h-3 w-3 rounded-full bg-white shadow-[0_0_24px_rgba(255,255,255,0.8)]" />
        <span className="text-sm font-semibold uppercase tracking-[0.32em] text-white/75">
          The Darkroom
        </span>
      </div>
    </div>
  );
}
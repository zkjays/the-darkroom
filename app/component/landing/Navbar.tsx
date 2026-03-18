import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050508]/70 backdrop-blur-xl">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="w-24 sm:w-32" />

        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 transition hover:opacity-90"
        >
          <Image
            src="/THEDR_logo_nobg.svg"
            alt="The Darkroom"
            width={180}
            height={28}
            className="h-auto w-[140px] sm:w-[180px]"
            priority
          />
        </Link>

        <Link
          href="/darkroom-id"
          className="text-sm text-white/60 transition hover:text-white"
        >
          Get ID →
        </Link>
      </div>
    </header>
  );
}
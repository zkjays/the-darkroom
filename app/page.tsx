import Navbar from "@/app/component/landing/Navbar";
import Hero from "@/app/component/landing/Hero";
import PhaseTeaser from "@/app/component/landing/PhaseTeaser";
import Footer from "@/app/component/landing/Footer";

export default function Home() {
  return (
    <main className="darkroom-bg min-h-screen text-white">
      <div className="relative overflow-hidden bg-[#050508]">
        {/* Ambient light */}
        <div className="darkroom-bg">

          {/* central soft glow */}
          <div className="darkroom-glow-main" />

          {/* top subtle glow */}
          <div className="darkroom-glow-top" />

          {/* bottom glow */}
          <div className="darkroom-glow-bottom" />

        </div>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="absolute -top-32 -left-24 h-105 w-105 rounded-full bg-cyan-400/5 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-90 w-90 rounded-full bg-violet-500/5 blur-3xl" />
        </div>

        <div className="relative z-10">
          <Navbar />
          <Hero />
          <PhaseTeaser />
          <Footer />
        </div>
      </div>
    </main>
  );
}
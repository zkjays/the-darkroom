import Navbar from "@/app/component/landing/Navbar";
import Hero from "@/app/component/landing/Hero";
import PhaseTeaser from "@/app/component/landing/PhaseTeaser";
import Footer from "@/app/component/landing/Footer";
import Particles from "@/app/component/landing/Particles";
import MouseGlow from "@/app/component/landing/MouseGlow";

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="relative overflow-hidden bg-[#050508]">

        {/* === DEPTH LAYER: Ambient orb glows === */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="darkroom-glow-main" />
          <div className="darkroom-glow-top" />
          <div className="darkroom-glow-bottom" />
          <div className="darkroom-glow-accent" />
          <div className="darkroom-glow-tr" />
        </div>

        {/* === DEPTH LAYER: Floating screen glows === */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="screen-glow screen-1" />
          <div className="screen-glow screen-2" />
          <div className="screen-glow screen-3" />
          <div className="screen-glow screen-4" />
        </div>

        {/* === DEPTH LAYER: Light rays === */}
        <div className="light-rays">
          <div className="light-ray light-ray-1" />
          <div className="light-ray light-ray-2" />
          <div className="light-ray light-ray-3" />
        </div>

        {/* === DEPTH LAYER: Grid === */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-size-[50px_50px]" />

        {/* === DEPTH LAYER: Scanlines === */}
        <div className="scanlines" />

        {/* === DEPTH LAYER: Floating particles === */}
        <Particles />

        {/* === DEPTH LAYER: Mouse glow === */}
        <MouseGlow />

        {/* === DEPTH LAYER: Vignette === */}
        <div className="vignette" />

        {/* === CONTENT === */}
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
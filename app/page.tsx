import Navbar from "@/app/component/landing/Navbar";
import Hero from "@/app/component/landing/Hero";
import Footer from "@/app/component/landing/Footer";
import Particles from "@/app/component/landing/Particles";
import MouseGlow from "@/app/component/landing/MouseGlow";
import ProblemStatement from "@/app/component/landing/sections/ProblemStatement";
import ScoreExplainer from "@/app/component/landing/sections/ScoreExplainer";
import ArchetypesShowcase from "@/app/component/landing/sections/ArchetypesShowcase";
import WorkProofSection from "@/app/component/landing/sections/WorkProofSection";
import IdentitySection from "@/app/component/landing/sections/IdentitySection";
import FinalCTA from "@/app/component/landing/sections/FinalCTA";

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="relative overflow-hidden bg-[#050508]">

        {/* === DEPTH LAYER: Grid === */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] bg-size-[50px_50px]" />

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
          <ProblemStatement />
          <ScoreExplainer />
          <ArchetypesShowcase />
          <WorkProofSection />
          <IdentitySection />
          <FinalCTA />
          <Footer />
        </div>
      </div>
    </main>
  );
}

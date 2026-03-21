"use client";

import { useEffect, useRef } from "react";

export default function MouseGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      el.style.transform = `translate(${e.clientX - 300}px, ${e.clientY + window.scrollY - 300}px)`;
      el.style.opacity = "1";
    };

    const onLeave = () => {
      el.style.opacity = "0";
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "600px",
        height: "600px",
        borderRadius: "9999px",
        background: "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 65%)",
        filter: "blur(40px)",
        pointerEvents: "none",
        opacity: 0,
        transition: "opacity 0.4s ease",
        willChange: "transform",
      }}
    />
  );
}

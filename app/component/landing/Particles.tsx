"use client";

const PARTICLES = [
  { left: "8%",  size: 1, duration: 18, delay: 0,    opacity: 0.12 },
  { left: "15%", size: 2, duration: 22, delay: 3,    opacity: 0.09 },
  { left: "23%", size: 1, duration: 15, delay: 7,    opacity: 0.13 },
  { left: "31%", size: 2, duration: 20, delay: 1,    opacity: 0.08 },
  { left: "39%", size: 1, duration: 17, delay: 5,    opacity: 0.11 },
  { left: "47%", size: 2, duration: 25, delay: 9,    opacity: 0.10 },
  { left: "54%", size: 1, duration: 19, delay: 2,    opacity: 0.14 },
  { left: "61%", size: 1, duration: 23, delay: 6,    opacity: 0.09 },
  { left: "68%", size: 2, duration: 16, delay: 11,   opacity: 0.12 },
  { left: "74%", size: 1, duration: 21, delay: 4,    opacity: 0.08 },
  { left: "80%", size: 2, duration: 14, delay: 8,    opacity: 0.13 },
  { left: "86%", size: 1, duration: 26, delay: 13,   opacity: 0.10 },
  { left: "91%", size: 2, duration: 18, delay: 0.5,  opacity: 0.09 },
  { left: "19%", size: 1, duration: 20, delay: 15,   opacity: 0.11 },
  { left: "57%", size: 1, duration: 24, delay: 10,   opacity: 0.08 },
];

export default function Particles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.left,
            bottom: "-4px",
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: "9999px",
            background: "rgba(255,255,255,1)",
            opacity: p.opacity,
            animation: `particleFloat ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

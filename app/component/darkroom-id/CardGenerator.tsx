"use client";

import { useEffect, useRef, useState } from "react";

interface CardGeneratorProps {
  handle: string;
  score: number;
  archetype: string;
  tagline: string;
  stats: { focus: number; consistency: number; reliability: number; growth: number };
  analysis: string;
  darkroomLine: string;
  profileImageUrl?: string;
  onShare?: () => void;
}

const TWEET_TEMPLATES = [
  "just took the darkroom id quiz — i'm a {archetype} ({score}/100) 🖤\n\nwhat are you? → thedarkroom.xyz/darkroom-id",
  "{score}/100 on the darkroom id. {archetype} energy.\n\nprove yours → thedarkroom.xyz/darkroom-id",
  "the darkroom says i'm a {archetype}. {score}/100.\n\nfind out → thedarkroom.xyz/darkroom-id",
  "{archetype} ({score}/100) — the darkroom doesn't lie.\n\n→ thedarkroom.xyz/darkroom-id",
  "my darkroom id: {archetype} | {score}/100\n\nbuild in silence. prove when ready.\n\n→ thedarkroom.xyz/darkroom-id",
];

const STAT_COLORS: Record<string, string> = {
  focus:       "#60A5FA",
  consistency: "#C084FC",
  reliability: "#34D399",
  growth:      "#FBBF24",
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const cr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + cr, y);
  ctx.lineTo(x + w - cr, y);
  ctx.arcTo(x + w, y, x + w, y + cr, cr);
  ctx.lineTo(x + w, y + h - cr);
  ctx.arcTo(x + w, y + h, x + w - cr, y + h, cr);
  ctx.lineTo(x + cr, y + h);
  ctx.arcTo(x, y + h, x, y + h - cr, cr);
  ctx.lineTo(x, y + cr);
  ctx.arcTo(x, y, x + cr, y, cr);
  ctx.closePath();
}

export default function CardGenerator({
  handle,
  score,
  archetype,
  tagline,
  stats,
  darkroomLine,
  profileImageUrl,
  onShare,
}: CardGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = (pfpImg: HTMLImageElement | null) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const W = 1200;
      const H = 630;

      // ── Background ──
      ctx.fillStyle = "#08080C";
      ctx.fillRect(0, 0, W, H);

      // Center glow
      const centerGlow = ctx.createRadialGradient(450, 300, 0, 450, 300, 400);
      centerGlow.addColorStop(0, "rgba(255,255,255,0.04)");
      centerGlow.addColorStop(1, "transparent");
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.02)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Vignette
      const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, W * 0.85);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      // ── Branding ──
      ctx.textBaseline = "alphabetic";
      ctx.font = "400 11px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.textAlign = "left";
      ctx.fillText("● THE DARKROOM", 30, 48);

      ctx.font = "400 10px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.textAlign = "right";
      ctx.fillText("thedarkroom.xyz", 1170, 48);

      // ── LEFT SIDE: PFP + handle ──
      const pfpCx = 70;
      const pfpCy = 160;
      const pfpR = 30;

      if (pfpImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pfpCx, pfpCy, pfpR, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(pfpImg, pfpCx - pfpR, pfpCy - pfpR, pfpR * 2, pfpR * 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(pfpCx, pfpCy, pfpR, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fill();
        ctx.font = "bold 22px Arial";
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(handle.charAt(0).toUpperCase(), pfpCx, pfpCy);
        ctx.textBaseline = "alphabetic";
      }

      // PFP ring
      ctx.beginPath();
      ctx.arc(pfpCx, pfpCy, pfpR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // @handle
      ctx.font = "400 16px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`@${handle}`, 115, pfpCy);
      ctx.textBaseline = "alphabetic";

      // ── Score hero ──
      ctx.shadowBlur = 30;
      ctx.shadowColor = "rgba(255,255,255,0.12)";
      ctx.font = "800 120px Arial";
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.textAlign = "left";
      ctx.fillText(String(score), 60, 330);
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      ctx.font = "400 11px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.textAlign = "left";
      ctx.fillText("DARKROOM SCORE", 62, 355);

      // ── Archetype ──
      ctx.font = "700 28px Arial";
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.textAlign = "left";
      ctx.fillText(archetype, 60, 395);

      // ── Tagline ──
      ctx.font = "italic 400 13px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.textAlign = "left";
      ctx.fillText(tagline, 60, 425);

      // ── Vertical separator ──
      ctx.beginPath();
      ctx.moveTo(580, 120);
      ctx.lineTo(580, 520);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── RIGHT SIDE: Stats 2×2 ──
      const statLayout: Array<{ key: keyof typeof stats; cx: number; baseY: number }> = [
        { key: "focus",       cx: 700,  baseY: 200 },
        { key: "consistency", cx: 950,  baseY: 200 },
        { key: "reliability", cx: 700,  baseY: 340 },
        { key: "growth",      cx: 950,  baseY: 340 },
      ];
      const barW = 80;

      statLayout.forEach(({ key, cx, baseY }) => {
        const val = stats[key];
        const color = STAT_COLORS[key];

        // Label
        ctx.font = "400 10px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.textAlign = "center";
        ctx.fillText(key.toUpperCase(), cx, baseY);

        // Value
        ctx.font = "700 36px Arial";
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.fillText(String(val), cx, baseY + 42);

        // Bar track
        const barX = cx - barW / 2;
        const barY = baseY + 54;
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        drawRoundedRect(ctx, barX, barY, barW, 3, 2);
        ctx.fill();

        // Bar fill with glow
        const fillW = Math.max(barW * (val / 75), 3);
        ctx.shadowBlur = 6;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        drawRoundedRect(ctx, barX, barY, fillW, 3, 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
      });

      // ── Darkroom line ──
      ctx.font = "italic 400 10px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.textAlign = "center";
      ctx.fillText(darkroomLine, 600, 570);

      // ── Bottom stamp ──
      ctx.font = "400 9px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.textAlign = "right";
      ctx.fillText("darkroom-id", 1150, 610);

      setPreviewUrl(canvas.toDataURL("image/png"));
    };

    if (profileImageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => draw(img);
      img.onerror = () => {
        // Try proxy fallback
        const proxyImg = new Image();
        proxyImg.crossOrigin = "anonymous";
        proxyImg.onload = () => draw(proxyImg);
        proxyImg.onerror = () => draw(null);
        proxyImg.src = `/api/proxy-image?url=${encodeURIComponent(profileImageUrl)}`;
      };
      img.src = profileImageUrl;
    } else {
      draw(null);
    }
  }, [handle, score, archetype, tagline, stats, darkroomLine, profileImageUrl]);

  const downloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onShare?.();
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `darkroom-id-${handle}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  const shareOnX = () => {
    onShare?.();
    downloadCard();
    const template = TWEET_TEMPLATES[Math.floor(Math.random() * TWEET_TEMPLATES.length)];
    const text = template
      .replace(/\{archetype\}/g, archetype)
      .replace(/\{score\}/g, String(score));
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden canvas used for rendering */}
      <canvas
        ref={canvasRef}
        width={1200}
        height={630}
        style={{ position: "absolute", left: "-9999px", top: "-9999px" }}
      />

      {/* Card preview */}
      {previewUrl && (
        <div className="rounded-xl overflow-hidden border border-white/6">
          <img src={previewUrl} alt="Darkroom ID card" className="w-full" />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={shareOnX}
          className="flex-1 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(255,255,255,0.08)]"
        >
          Share on X →
        </button>
        <button
          onClick={downloadCard}
          className="rounded-xl border border-white/10 px-5 py-3 text-sm text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
        >
          Download
        </button>
      </div>
    </div>
  );
}

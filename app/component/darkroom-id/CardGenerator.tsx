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
      const CX = W / 2; // horizontal center

      // ── Background ──
      ctx.fillStyle = "#08080C";
      ctx.fillRect(0, 0, W, H);

      // Depth gradient from center
      const depthGrad = ctx.createRadialGradient(CX, H / 2, 0, CX, H / 2, W * 0.7);
      depthGrad.addColorStop(0, "rgba(255,255,255,0.04)");
      depthGrad.addColorStop(1, "transparent");
      ctx.fillStyle = depthGrad;
      ctx.fillRect(0, 0, W, H);

      // Cyan glow — top-left
      const cyanGlow = ctx.createRadialGradient(150, 100, 0, 150, 100, 250);
      cyanGlow.addColorStop(0, "rgba(0,180,255,0.07)");
      cyanGlow.addColorStop(1, "transparent");
      ctx.fillStyle = cyanGlow;
      ctx.fillRect(0, 0, W, H);

      // Purple glow — bottom-right
      const purpleGlow = ctx.createRadialGradient(1050, 530, 0, 1050, 530, 250);
      purpleGlow.addColorStop(0, "rgba(130,80,255,0.06)");
      purpleGlow.addColorStop(1, "transparent");
      ctx.fillStyle = purpleGlow;
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Vignette
      const vignette = ctx.createRadialGradient(CX, H / 2, H * 0.15, CX, H / 2, W * 0.8);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      // ── Top bar ──
      ctx.font = "400 11px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.20)";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("● THE DARKROOM", 44, 58);

      ctx.font = "400 10px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.textAlign = "right";
      ctx.fillText("thedarkroom.xyz", W - 44, 58);

      // ── PFP ──
      const pfpCx = CX;
      const pfpCy = 160;
      const pfpR = 50;

      // Glow behind PFP
      const pfpGlow = ctx.createRadialGradient(pfpCx, pfpCy, 0, pfpCx, pfpCy, 80);
      pfpGlow.addColorStop(0, "rgba(255,255,255,0.05)");
      pfpGlow.addColorStop(1, "transparent");
      ctx.fillStyle = pfpGlow;
      ctx.fillRect(pfpCx - 80, pfpCy - 80, 160, 160);

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
        ctx.font = "bold 36px Arial";
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(handle.charAt(0).toUpperCase(), pfpCx, pfpCy);
      }

      // PFP ring
      ctx.beginPath();
      ctx.arc(pfpCx, pfpCy, pfpR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // @handle
      ctx.font = "400 14px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.50)";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(`@${handle}`, pfpCx, 230);

      // ── Score (hero element) ──
      // Measure score + "/100" widths to center them together
      ctx.font = "800 80px Arial";
      const scoreW = ctx.measureText(String(score)).width;
      ctx.font = "400 26px Arial";
      const slashW = ctx.measureText("/100").width;
      const gap = 10;
      const totalScoreW = scoreW + gap + slashW;
      const scoreX = CX - totalScoreW / 2;

      ctx.shadowBlur = 30;
      ctx.shadowColor = "rgba(255,255,255,0.15)";
      ctx.font = "800 80px Arial";
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(String(score), scoreX, 305);
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      ctx.font = "400 26px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillText("/100", scoreX + scoreW + gap, 305);

      // ── Archetype ──
      ctx.font = "700 28px Arial";
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.textAlign = "center";
      ctx.fillText(archetype, CX, 348);

      // ── Tagline ──
      ctx.font = "italic 400 13px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.textAlign = "center";
      ctx.fillText(tagline, CX, 375);

      // ── Separator ──
      ctx.beginPath();
      ctx.moveTo(CX - 150, 400);
      ctx.lineTo(CX + 150, 400);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── Stats 2×2 grid ──
      // Cell size: 240px wide, gap: 20px → total 500px centered
      const cellW = 240;
      const colGap = 20;
      const gridW = cellW * 2 + colGap;
      const gridX = CX - gridW / 2; // left edge of grid
      const colX = [gridX, gridX + cellW + colGap]; // x of each column
      const rowY = [422, 492]; // y of each row
      const maxBarW = cellW - 20; // bar max width per cell (with 10px padding each side)

      const statGrid: Array<{ key: keyof typeof stats; col: number; row: number }> = [
        { key: "focus",       col: 0, row: 0 },
        { key: "consistency", col: 1, row: 0 },
        { key: "reliability", col: 0, row: 1 },
        { key: "growth",      col: 1, row: 1 },
      ];

      statGrid.forEach(({ key, col, row }) => {
        const x = colX[col];
        const y = rowY[row];
        const val = stats[key];
        const color = STAT_COLORS[key];
        const cellCx = x + cellW / 2;

        // Label
        ctx.font = "400 9px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.40)";
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(key.toUpperCase(), cellCx, y);

        // Value number
        ctx.font = `700 24px Arial`;
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(String(val), cellCx, y + 28);

        // Bar track
        const barX = x + 10;
        const barY = y + 36;
        const barH = 3;
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        drawRoundedRect(ctx, barX, barY, maxBarW, barH, 2);
        ctx.fill();

        // Bar fill
        const fillW = Math.max(maxBarW * (val / 100), 4);
        ctx.fillStyle = color;
        drawRoundedRect(ctx, barX, barY, fillW, barH, 2);
        ctx.fill();
      });

      // ── Darkroom line ──
      ctx.font = "italic 400 11px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.20)";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(darkroomLine, CX, 565);

      // ── Bottom-right stamp ──
      ctx.font = "400 9px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.textAlign = "right";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("darkroom-id", W - 44, H - 20);

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

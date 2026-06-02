"use client";

import { useEffect, useRef, useState } from "react";

interface CardGeneratorProps {
  handle: string;
  score: number;
  archetype: string;
  tagline?: string;
  stats?: { focus: number; consistency: number; reliability: number; growth: number };
  analysis?: string;
  darkroomLine?: string;
  profileImageUrl?: string;
  accentColor?: string;
  socialProof?: number;
  builderProof?: number;
  workProof?: number;
  onShare?: () => void;
}

const TWEET_TEMPLATES = [
  "just took the darkroom id quiz — i'm a {archetype} ({score}/100) 🖤\n\nwhat are you? → thedarkroom.xyz/darkroom-id",
  "{score}/100 on the darkroom id. {archetype} energy.\n\nprove yours → thedarkroom.xyz/darkroom-id",
  "the darkroom says i'm a {archetype}. {score}/100.\n\nfind out → thedarkroom.xyz/darkroom-id",
  "{archetype} ({score}/100) — the darkroom doesn't lie.\n\n→ thedarkroom.xyz/darkroom-id",
  "my darkroom id: {archetype} | {score}/100\n\nbuild in silence. prove when ready.\n\n→ thedarkroom.xyz/darkroom-id",
];

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
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
  profileImageUrl,
  socialProof = 0,
  builderProof = 0,
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
      const pfpCx = 600, pfpCy = 295, pfpR = 130;

      // ── BACKGROUND ────────────────────────────────────────────
      ctx.fillStyle = "#050508";
      ctx.fillRect(0, 0, W, H);

      const bgGrad = ctx.createRadialGradient(600, 315, 0, 600, 315, 600);
      bgGrad.addColorStop(0, "#0d0820");
      bgGrad.addColorStop(1, "#020208");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Ambient glow — cyan top-left
      ctx.save();
      ctx.translate(240, 130);
      ctx.scale(420, 310);
      const glowCyan = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      glowCyan.addColorStop(0, "rgba(0,204,255,0.13)");
      glowCyan.addColorStop(1, "rgba(0,204,255,0)");
      ctx.fillStyle = glowCyan;
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // Ambient glow — violet bottom-right
      ctx.save();
      ctx.translate(1050, 580);
      ctx.scale(420, 310);
      const glowViolet = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      glowViolet.addColorStop(0, "rgba(139,92,246,0.12)");
      glowViolet.addColorStop(1, "rgba(139,92,246,0)");
      ctx.fillStyle = glowViolet;
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // Ambient glow — mixed center
      ctx.save();
      ctx.translate(600, 300);
      ctx.scale(500, 380);
      const glowCenter = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      glowCenter.addColorStop(0, "rgba(0,204,255,0.09)");
      glowCenter.addColorStop(0.5, "rgba(139,92,246,0.06)");
      glowCenter.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glowCenter;
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // Stars
      const stars: [number, number, number, number][] = [
        [50, 80, 1.2, 0.4], [150, 40, 1, 0.3], [280, 90, 1.5, 0.5],
        [420, 30, 1, 0.25], [550, 70, 1.2, 0.35], [700, 20, 1.5, 0.4],
        [850, 55, 1, 0.3], [980, 35, 1.8, 0.5], [1100, 75, 1, 0.25],
        [1170, 45, 1.2, 0.4], [80, 200, 1.5, 0.35], [350, 170, 1, 0.3],
        [900, 190, 1.2, 0.4], [1150, 210, 1.5, 0.45], [30, 380, 1, 0.25],
        [200, 450, 1.5, 0.4], [450, 500, 1, 0.3], [950, 520, 1.2, 0.35],
        [1100, 480, 1, 0.25], [1180, 390, 1.5, 0.45], [620, 580, 1, 0.3],
        [780, 560, 1.2, 0.35],
      ];
      stars.forEach(([x, y, r, op]) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${op})`;
        ctx.fill();
      });

      // Subtle grid
      ctx.strokeStyle = "rgba(125,211,252,0.025)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 150) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += 150) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // ── TOP LABEL ──────────────────────────────────────────────
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "center";
      ctx.font = "400 14px monospace";
      ctx.fillStyle = "#1e293b";
      ctx.letterSpacing = "7px";
      ctx.fillText("THE DARKROOM", 600, 38);
      ctx.letterSpacing = "0px";

      // ── CORNER BRACKETS ────────────────────────────────────────
      const bLen = 28, bOff = 24;
      ctx.strokeStyle = "rgba(51,65,85,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bOff + bLen, bOff); ctx.lineTo(bOff, bOff); ctx.lineTo(bOff, bOff + bLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W - bOff - bLen, bOff); ctx.lineTo(W - bOff, bOff); ctx.lineTo(W - bOff, bOff + bLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bOff + bLen, H - bOff); ctx.lineTo(bOff, H - bOff); ctx.lineTo(bOff, H - bOff - bLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W - bOff - bLen, H - bOff); ctx.lineTo(W - bOff, H - bOff); ctx.lineTo(W - bOff, H - bOff - bLen); ctx.stroke();

      // ── ORBIT RING ─────────────────────────────────────────────
      ctx.beginPath();
      ctx.arc(pfpCx, pfpCy, 265, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.045)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      // ── PFP HALO + RINGS ───────────────────────────────────────
      ctx.save();
      ctx.translate(pfpCx, pfpCy);
      ctx.scale(200, 200);
      const pfpHalo = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      pfpHalo.addColorStop(0, "rgba(0,204,255,0.18)");
      pfpHalo.addColorStop(1, "rgba(0,204,255,0)");
      ctx.fillStyle = pfpHalo;
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(pfpCx, pfpCy, 144, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,204,255,0.07)";
      ctx.lineWidth = 16;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pfpCx, pfpCy, 137, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,204,255,0.18)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // PFP background circle
      ctx.beginPath();
      ctx.arc(pfpCx, pfpCy, pfpR, 0, Math.PI * 2);
      ctx.fillStyle = "#0e0e1c";
      ctx.fill();

      // PFP image or initial
      if (pfpImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pfpCx, pfpCy, pfpR, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(pfpImg, pfpCx - pfpR, pfpCy - pfpR, pfpR * 2, pfpR * 2);
        ctx.restore();
      } else {
        ctx.font = "bold 80px Arial";
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(handle.charAt(0).toUpperCase(), pfpCx, pfpCy);
        ctx.textBaseline = "alphabetic";
      }

      // ── TRAIL LINES (bubble edge → Room Score top edge) ────────
      const roomScoreEndX = 600, roomScoreEndY = 526;

      const drawTrail = (bubbleCx: number, bubbleCy: number, bubbleR: number, color: string) => {
        const angle = Math.atan2(roomScoreEndY - bubbleCy, roomScoreEndX - bubbleCx);
        const startX = bubbleCx + Math.cos(angle) * bubbleR;
        const startY = bubbleCy + Math.sin(angle) * bubbleR;
        const grad = ctx.createLinearGradient(startX, startY, roomScoreEndX, roomScoreEndY);
        grad.addColorStop(0, color);
        grad.addColorStop(1, "#00CCFF");
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(roomScoreEndX, roomScoreEndY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.restore();
      };

      drawTrail(175, 200, 100, "#a78bfa");
      drawTrail(1025, 200, 100, "#60a5fa");

      // ── PROOF BUBBLE HELPER ────────────────────────────────────
      const drawProofBubble = (
        cx: number, cy: number, val: number,
        outerR: number, borderR: number, trackR: number,
        outerW: number, borderW: number, trackW: number,
        glowColor: string, borderColor: string,
        trackColor: string, arcColor: string,
        scoreColor: string, scoreAlpha: number,
        label1Color: string, label2Color: string,
        label1: string, label2: string,
        scoreFont: string, label1Font: string, label2Font: string,
        labelY1: number, labelY2: number
      ) => {
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = outerW;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, borderR, 0, Math.PI * 2);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderW;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, trackR, 0, Math.PI * 2);
        ctx.strokeStyle = trackColor;
        ctx.lineWidth = trackW;
        ctx.stroke();

        if (val > 0) {
          ctx.beginPath();
          ctx.arc(cx, cy, trackR, -Math.PI / 2, -Math.PI / 2 + (val / 100) * 2 * Math.PI);
          ctx.strokeStyle = arcColor;
          ctx.lineWidth = trackW;
          ctx.lineCap = "round";
          ctx.stroke();
          ctx.lineCap = "butt";
        }

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = scoreFont;
        ctx.globalAlpha = scoreAlpha;
        ctx.fillStyle = scoreColor;
        ctx.fillText(String(val), cx, cy);
        ctx.globalAlpha = 1;
        ctx.textBaseline = "alphabetic";

        ctx.textAlign = "center";
        ctx.letterSpacing = "3px";
        ctx.font = label1Font;
        ctx.fillStyle = label1Color;
        ctx.fillText(label1, cx, labelY1);
        ctx.font = label2Font;
        ctx.fillStyle = label2Color;
        ctx.fillText(label2, cx, labelY2);
        ctx.letterSpacing = "0px";
      };

      // ── SOCIAL PROOF (cx=175, cy=200) ──────────────────────────
      drawProofBubble(
        175, 200, socialProof,
        110, 100, 82,
        14, 1.5, 6,
        "rgba(167,139,250,0.07)", "rgba(167,139,250,0.45)",
        "rgba(167,139,250,0.07)", "rgba(167,139,250,0.82)",
        "#c4b5fd", 1,
        "rgba(167,139,250,1.0)", "rgba(167,139,250,0.6)",
        "SOCIAL", "PROOF",
        "700 48px 'Arial Black', Arial, sans-serif", "700 15px 'Courier New', monospace", "500 13px 'Courier New', monospace",
        200 + 32, 200 + 50
      );

      // ── BUILDER PROOF (cx=1025, cy=200) ───────────────────────
      drawProofBubble(
        1025, 200, builderProof,
        110, 100, 82,
        14, 1.5, 6,
        "rgba(96,165,250,0.07)", "rgba(96,165,250,0.45)",
        "rgba(96,165,250,0.07)", "rgba(96,165,250,0.82)",
        "#93c5fd", 1,
        "rgba(96,165,250,1.0)", "rgba(96,165,250,0.6)",
        "BUILDER", "PROOF",
        "700 48px 'Arial Black', Arial, sans-serif", "700 15px 'Courier New', monospace", "500 13px 'Courier New', monospace",
        200 + 32, 200 + 50
      );


      // ── ARCHETYPE ──────────────────────────────────────────────
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = "400 18px monospace";
      ctx.fillStyle = "#475569";
      ctx.letterSpacing = "2px";
      ctx.fillText(archetype.toUpperCase(), 600, 510);
      ctx.letterSpacing = "0px";

      // ── ROOM SCORE BLOCK ───────────────────────────────────────
      const rsX = 470, rsY = 526, rsW = 260, rsH = 90, rsRx = 18;

      ctx.save();
      ctx.translate(600, rsY + rsH / 2);
      ctx.scale(90, 36);
      const rsGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      rsGlow.addColorStop(0, "rgba(0,204,255,0.13)");
      rsGlow.addColorStop(1, "rgba(0,204,255,0)");
      ctx.fillStyle = rsGlow;
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      roundRect(ctx, rsX, rsY, rsW, rsH, rsRx);
      ctx.fillStyle = "#07060f";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,204,255,0.18)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = "400 14px monospace";
      ctx.fillStyle = "rgba(0,204,255,0.55)";
      ctx.letterSpacing = "5px";
      ctx.fillText("ROOM SCORE", 600, 548);
      ctx.letterSpacing = "0px";

      ctx.font = "500 56px sans-serif";
      ctx.fillStyle = "#00CCFF";
      ctx.fillText(String(score), 600, 600);

      // ── HANDLE TAG ─────────────────────────────────────────────
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = "500 22px sans-serif";
      ctx.fillStyle = "#f1f5f9";
      ctx.fillText(`@${handle}`, 40, 610);

      // ── SLOGAN + URL ───────────────────────────────────────────
      ctx.textAlign = "right";
      ctx.font = "400 13px monospace";
      ctx.fillStyle = "#334155";
      ctx.fillText("Build in silence. Prove when ready.", 1160, 600);
      ctx.font = "400 12px monospace";
      ctx.fillStyle = "#1e293b";
      ctx.fillText("thedarkroom.xyz", 1160, 616);

      setPreviewUrl(canvas.toDataURL("image/png"));
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => draw(img);
    img.onerror = () => draw(null);
    if (profileImageUrl) {
      img.src = `/api/proxy-image?url=${encodeURIComponent(profileImageUrl)}`;
    } else {
      draw(null);
    }
  }, [handle, score, archetype, profileImageUrl, socialProof, builderProof]);

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
      <canvas
        ref={canvasRef}
        width={1200}
        height={630}
        style={{ position: "absolute", left: "-9999px", top: "-9999px" }}
      />
      {previewUrl && (
        <div className="rounded-xl overflow-hidden border border-white/6">
          <img src={previewUrl} alt="Darkroom ID card" className="w-full" />
        </div>
      )}
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

"use client"
import { useEffect, useState } from "react"

const LAUNCH_DATE = new Date("2026-06-10T12:00:00")

function getTimeLeft(): string | null {
  const diff = LAUNCH_DATE.getTime() - Date.now()
  if (diff <= 0) return null
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function CountdownBanner() {
  const [timeLeft, setTimeLeft] = useState<string | null>(null)

  useEffect(() => {
    setTimeLeft(getTimeLeft())
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!timeLeft) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 bg-black/90 backdrop-blur-sm border-b border-white/[0.08] py-1.5 px-4">
      <span className="text-white/50 text-xs tracking-widest uppercase">Darkroom V2</span>
      <span className="text-white/20 text-xs">—</span>
      <span className="text-xs text-white/70">Live in</span>
      <span
        className="font-mono text-sm font-medium tabular-nums"
        style={{ color: "#c9a84c" }}
      >
        {timeLeft}
      </span>
    </div>
  )
}

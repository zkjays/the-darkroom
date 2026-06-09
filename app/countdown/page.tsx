"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import BrandMark from "@/app/component/BrandMark"

const LAUNCH_DATE = new Date("2026-06-10T12:00:00").getTime()

interface TimeLeft {
  h: string
  m: string
  s: string
}

function getTimeLeft(): TimeLeft | null {
  const diff = LAUNCH_DATE - Date.now()
  if (diff <= 0) return null
  return {
    h: String(Math.floor(diff / 3600000)).padStart(2, "0"),
    m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0"),
    s: String(Math.floor((diff % 60000) / 1000)).padStart(2, "0"),
  }
}

export default function CountdownPage() {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(getTimeLeft)

  const tick = useCallback(() => {
    const t = getTimeLeft()
    setTimeLeft(t)
    if (!t) router.replace("/")
  }, [router])

  useEffect(() => {
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [tick])

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050508]"
      style={{ fontFamily: "var(--font-outfit, sans-serif)" }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[180px] opacity-20"
          style={{ width: 600, height: 600, background: "#c9a84c" }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[280px] opacity-10"
          style={{ width: 900, height: 900, background: "#ffffff" }}
        />
      </div>

      {/* Grid overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:50px_50px]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-10 px-6 text-center">
        <BrandMark />

        <div className="flex flex-col items-center gap-3">
          <p className="font-mono text-xs tracking-[0.3em] text-white/30 uppercase">
            V2 — something new is coming
          </p>

          {timeLeft ? (
            <div className="flex items-center gap-1 font-mono">
              <TimeBlock value={timeLeft.h} label="hours" />
              <Colon />
              <TimeBlock value={timeLeft.m} label="min" />
              <Colon />
              <TimeBlock value={timeLeft.s} label="sec" />
            </div>
          ) : (
            <p className="font-mono text-2xl text-white/60">Live now →</p>
          )}
        </div>

        <p className="max-w-xs text-sm leading-6 text-white/25">
          The room is being prepared.<br />Enter when the doors open.
        </p>
      </div>
    </main>
  )
}

function TimeBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="text-6xl font-bold tabular-nums sm:text-8xl"
        style={{ color: "#c9a84c", textShadow: "0 0 40px rgba(201,168,76,0.4)" }}
      >
        {value}
      </span>
      <span className="text-[10px] tracking-widest text-white/20 uppercase">{label}</span>
    </div>
  )
}

function Colon() {
  return (
    <span
      className="mb-5 text-5xl font-thin sm:text-7xl"
      style={{ color: "#c9a84c", opacity: 0.4 }}
    >
      :
    </span>
  )
}

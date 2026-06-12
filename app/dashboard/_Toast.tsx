"use client";

import { useCallback, useRef, useState } from "react";

export interface ToastMsg { id: number; text: string }

export function Toast({ messages }: { messages: ToastMsg[] }) {
  if (messages.length === 0) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="flex flex-col items-center gap-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className="animate-xp-pop flex flex-col items-center gap-1 bg-black/75 border border-[#c9a84c]/50 backdrop-blur-sm rounded-2xl px-10 py-6 shadow-2xl"
          >
            <span className="font-[family-name:var(--font-mono)] text-4xl font-bold text-[#c9a84c] tracking-tight">
              {m.text.split("(")[0].split("→")[0].trim()}
            </span>
            {(m.text.includes("→") || m.text.includes("(")) && (
              <span className="font-[family-name:var(--font-mono)] text-sm text-white/60">
                {m.text.includes("→")
                  ? m.text.split("→")[1].trim()
                  : m.text.match(/\(([^)]+)\)/)?.[1]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function useToast() {
  const [messages, setMessages] = useState<ToastMsg[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((text: string, duration = 2500) => {
    const id = ++idRef.current;
    setMessages((prev) => [...prev, { id, text }]);
    setTimeout(() => setMessages((prev) => prev.filter((m) => m.id !== id)), duration);
  }, []);

  return { messages, showToast };
}

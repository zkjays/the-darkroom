"use client";

import { useCallback, useRef, useState } from "react";

export interface ToastMsg { id: number; text: string }

export function Toast({ messages }: { messages: ToastMsg[] }) {
  if (messages.length === 0) return null;
  return (
    <div className="fixed top-24 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {messages.map((m) => (
        <div
          key={m.id}
          className="bg-white/[0.08] border border-white/[0.12] backdrop-blur rounded-full px-4 py-2 font-[family-name:var(--font-mono)] text-xs text-slate-200 animate-fade-in-up"
        >
          {m.text}
        </div>
      ))}
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

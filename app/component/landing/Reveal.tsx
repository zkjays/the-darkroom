"use client";

import { motion } from "framer-motion";

// Scroll-triggered fade/rise-in wrapper used by every pitch-deck section below
// the hero. `viewport={{ once: true }}` reveals once and never re-hides on
// scroll-back. framer-motion respects prefers-reduced-motion automatically.
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

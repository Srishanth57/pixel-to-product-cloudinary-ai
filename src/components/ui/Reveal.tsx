"use client";
import { useEffect, useRef } from "react";

/** Scroll-entry fade-up via IntersectionObserver. `i` staggers siblings. */
export default function Reveal({ children, i = 0, className = "" }: { children: React.ReactNode; i?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("in"); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} style={{ "--i": i } as React.CSSProperties} className={`reveal ${className}`}>{children}</div>;
}
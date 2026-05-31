import { useEffect, useRef, useState } from "react";

/**
 * Subtle radial spotlight that follows the cursor.
 * Disabled on touch devices and when prefers-reduced-motion is set.
 */
export function SpotlightCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || coarse) return;
    setEnabled(true);

    let raf = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          if (ref.current) {
            ref.current.style.background = `radial-gradient(420px circle at ${x}px ${y}px, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%)`;
          }
          raf = 0;
        });
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
    />
  );
}
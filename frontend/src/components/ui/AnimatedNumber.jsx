import React, { useEffect, useRef } from "react";
import { animate, useInView } from "framer-motion";
import { useMotionOff } from "../../contexts/UiPrefsContext";

/** Counts up to `value` once visible. Writes to the DOM directly (no re-renders). */
export default function AnimatedNumber({ value, decimals = 0, suffix = "", prefix = "", duration = 1.1, className, style }) {
  const ref = useRef(null);
  const from = useRef(0);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const motionOff = useMotionOff();

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fmt = (v) => `${prefix}${Number(v).toFixed(decimals)}${suffix}`;
    if (value == null || Number.isNaN(Number(value))) {
      el.textContent = "—";
      return undefined;
    }
    if (motionOff || !inView) {
      if (motionOff) el.textContent = fmt(value);
      return undefined;
    }
    const controls = animate(from.current, Number(value), {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = fmt(v);
      },
    });
    from.current = Number(value);
    return () => controls.stop();
  }, [value, decimals, suffix, prefix, duration, inView, motionOff]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {`${prefix}${(0).toFixed(decimals)}${suffix}`}
    </span>
  );
}

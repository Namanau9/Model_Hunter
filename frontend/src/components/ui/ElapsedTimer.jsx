import React, { useEffect, useState } from "react";

/** Real wall-clock time since `since` (ms timestamp), mm:ss.t */
export default function ElapsedTimer({ since, className, style }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, now - (since || now));
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const t = Math.floor((ms % 1000) / 100);
  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums", ...style }} role="timer" aria-live="off">
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}.{t}
    </span>
  );
}

import React from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import AnimatedNumber from "./AnimatedNumber";
import ClassBadge from "./ClassBadge";
import { statusVar } from "../../theme/tokens";

/** Instrument-style dial for the 0–100 robustness score, with band ticks at 30 and 60. */
export default function RobustnessRing({ score, klass, size = 200, stroke = 10, showBadge = true, label = "Robustness" }) {
  const pct = Math.max(0, Math.min(100, Number(score) || 0)) / 100;
  const r = (size - stroke) / 2 - 12;
  const cx = size / 2;
  const ticks = 50;
  const arc = statusVar(klass);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.25 }}>
      <Box
        sx={{ position: "relative", width: size, height: size }}
        role="img"
        aria-label={`${label} score ${score != null ? Number(score).toFixed(1) : "unknown"} of 100${klass ? `, ${klass}` : ""}`}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {Array.from({ length: ticks }).map((_, i) => {
            const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
            const band = i === 15 || i === 30; // 30 and 60
            const r1 = r + stroke / 2 + 4;
            const r2 = r1 + (band ? 9 : i % 5 === 0 ? 5 : 3);
            return (
              <line
                key={i}
                x1={cx + Math.cos(a) * r1}
                y1={cx + Math.sin(a) * r1}
                x2={cx + Math.cos(a) * r2}
                y2={cx + Math.sin(a) * r2}
                style={{ stroke: band ? "var(--ink-2)" : "var(--line-strong)" }}
                strokeWidth={band ? 1.5 : 1}
              />
            );
          })}
          <circle cx={cx} cy={cx} r={r} style={{ stroke: "var(--sunken)" }} strokeWidth={stroke} fill="none" />
          <motion.circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            style={{ stroke: arc }}
            strokeWidth={stroke}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cx})`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: pct }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
          <Box>
            <Typography component="div" className="mh-display mh-tabular" sx={{ fontSize: size * 0.22, fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em" }}>
              <AnimatedNumber value={score} decimals={1} />
            </Typography>
            <Typography component="div" sx={{ color: "var(--ink-3)", mt: 0.5, fontSize: "0.72rem" }}>
              {label.toLowerCase()} / 100
            </Typography>
          </Box>
        </Box>
      </Box>
      {showBadge && <ClassBadge klass={klass} />}
    </Box>
  );
}

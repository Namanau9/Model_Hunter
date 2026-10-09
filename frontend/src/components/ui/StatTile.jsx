import React from "react";
import { Box, Typography } from "@mui/material";
import Panel from "./Panel";
import AnimatedNumber from "./AnimatedNumber";

/** Headline number. `value` animates; `display` overrides with static text. */
export default function StatTile({ label, value, decimals = 0, suffix = "", display, sub, icon, marker, bar, sx }) {
  return (
    <Panel padding={2} sx={{ height: "100%", ...sx }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
        <Typography sx={{ fontSize: "0.8rem", color: "var(--ink-2)", fontWeight: 500, display: "flex", alignItems: "center", gap: 0.75 }}>
          {marker && <Box component="span" aria-hidden sx={{ width: 8, height: 8, borderRadius: "2px", background: marker }} />}
          {label}
        </Typography>
        {icon && (
          <Box aria-hidden sx={{ color: "var(--ink-3)", display: "flex", "& svg": { fontSize: 18 } }}>
            {icon}
          </Box>
        )}
      </Box>
      <Typography component="div" className="mh-display mh-tabular" sx={{ fontSize: { xs: "1.7rem", md: "2rem" }, fontWeight: 600, lineHeight: 1.15, mt: 0.75, letterSpacing: "-0.02em" }}>
        {display ?? <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />}
      </Typography>
      {sub && <Typography sx={{ color: "var(--ink-3)", mt: 0.5, fontSize: "0.78rem", lineHeight: 1.45 }}>{sub}</Typography>}
      {bar != null && (
        <Box sx={{ mt: 1.25, height: 3, borderRadius: 2, background: "var(--sunken)", overflow: "hidden" }}>
          <Box sx={{ height: "100%", width: `${Math.max(0, Math.min(100, bar))}%`, background: marker || "var(--ink)", transition: "width 900ms cubic-bezier(.22,1,.36,1)" }} />
        </Box>
      )}
    </Panel>
  );
}

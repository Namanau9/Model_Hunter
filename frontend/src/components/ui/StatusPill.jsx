import React from "react";
import { Box } from "@mui/material";

/** Status text with a coloured dot. tone: ok | warn | down | idle | info */
const TONES = {
  ok: "var(--status-strong-text)",
  warn: "var(--ochre)",
  down: "var(--status-weak-text)",
  idle: "var(--ink-3)",
  info: "var(--blue)",
};

export default function StatusPill({ tone = "idle", children, live = true, sx }) {
  const c = TONES[tone] || TONES.idle;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1,
        py: 0.35,
        borderRadius: "4px",
        border: "1px solid var(--line)",
        background: "var(--raised)",
        color: "var(--ink-2)",
        fontSize: "0.76rem",
        fontWeight: 500,
        whiteSpace: "nowrap",
        ...sx,
      }}
    >
      <Box component="span" className="mh-dot" aria-hidden sx={{ color: c, animation: live && tone === "info" ? "mhPulse 1.4s ease-in-out infinite" : "none" }} />
      {children}
    </Box>
  );
}

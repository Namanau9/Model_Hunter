import React from "react";
import { Box, Typography } from "@mui/material";
import { useTokens } from "../../contexts/UiPrefsContext";

/** Tooltip for Recharts. `format(value, name, payload)` customises values. */
export default function ChartTooltip({ active, payload, label, format, title }) {
  if (!active || !payload?.length) return null;
  const heading = title ? title(payload[0]?.payload, label) : label;
  return (
    <Box
      sx={{
        px: 1.25,
        py: 1,
        minWidth: 150,
        borderRadius: "6px",
        background: "var(--raised)",
        border: "1px solid var(--line-strong)",
        boxShadow: "var(--shadow-pop)",
      }}
    >
      {heading != null && (
        <Typography className="mh-mono" sx={{ fontSize: "0.72rem", color: "var(--ink-3)", mb: 0.5 }}>
          {heading}
        </Typography>
      )}
      {payload.map((p) => (
        <Box key={p.dataKey || p.name} sx={{ display: "flex", alignItems: "center", gap: 1.5, justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box aria-hidden sx={{ width: 9, height: 9, borderRadius: "2px", background: p.color || p.payload?.fill }} />
            <Typography sx={{ fontSize: "0.78rem", color: "var(--ink-2)" }}>{p.name}</Typography>
          </Box>
          <Typography className="mh-mono" sx={{ fontSize: "0.8rem", fontWeight: 600 }}>
            {format ? format(p.value, p.name, p.payload) : p.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/** Axis + grid props tuned to the active theme. */
export function useChartChrome() {
  const t = useTokens();
  return {
    axis: {
      stroke: t.lineStrong,
      tick: { fill: t.ink3, fontSize: 11, fontFamily: "IBM Plex Mono, monospace" },
      tickLine: false,
    },
    grid: { stroke: t.line, strokeDasharray: "2 4", vertical: false },
    cursorFill: t.hover,
    t,
  };
}

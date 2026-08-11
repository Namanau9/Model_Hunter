import React from "react";
import { Box, Typography, LinearProgress } from "@mui/material";

const COLOR = { Weak: "#FF5C66", Moderate: "#F9B44C", Strong: "#2FD18A" };

export default function RobustnessGauge({ score, klass }) {
  const color = COLOR[klass] || "#27E0FF";
  const pct = Math.max(0, Math.min(100, score || 0));
  const ring = `conic-gradient(${color} ${pct}%, rgba(255,255,255,0.06) ${pct}%)`;
  return (
    <Box sx={{ textAlign: "center", p: 3 }}>
      <Box sx={{ position: "relative", width: 120, height: 120, m: "0 auto" }}>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: ring,
            WebkitMask: "radial-gradient(circle, transparent 62%, #000 63%)",
            mask: "radial-gradient(circle, transparent 62%, #000 63%)",
            filter: `drop-shadow(0 0 10px ${color}66)`,
          }}
        />
        <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography variant="h4" className="mh-mono" sx={{ color, fontWeight: 700 }}>
            {score != null ? score.toFixed(1) : "--"}
          </Typography>
        </Box>
      </Box>
      <Typography variant="overline" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
        Robustness Score
      </Typography>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          mt: 1.5,
          height: 8,
          borderRadius: 99,
          backgroundColor: "rgba(255,255,255,0.06)",
          "& .MuiLinearProgress-bar": {
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            borderRadius: 99,
          },
        }}
      />
      <Typography className="mh-mono" sx={{ mt: 1, color }}>{klass || "\u2014"}</Typography>
    </Box>
  );
}
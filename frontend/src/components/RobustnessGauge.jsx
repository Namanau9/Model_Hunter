import React from "react";
import { Box, Typography, LinearProgress } from "@mui/material";

const COLOR = { Weak: "#FF1744", Moderate: "#FF9800", Strong: "#00C853" };

export default function RobustnessGauge({ score, klass }) {
  const color = COLOR[klass] || "#00E5FF";
  return (
    <Box sx={{ textAlign: "center", p: 2 }}>
      <Typography variant="h3" sx={{ color, fontWeight: 700 }}>
        {score != null ? score.toFixed(1) : "--"}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Robustness Score
      </Typography>
      <LinearProgress
        variant="determinate"
        value={score || 0}
        sx={{ mt: 1, height: 10, borderRadius: 5, "& .MuiLinearProgress-bar": { bgcolor: color } }}
      />
      <Typography variant="subtitle1" sx={{ mt: 1, color }}>
        {klass || "—"}
      </Typography>
    </Box>
  );
}

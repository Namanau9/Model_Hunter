import React from "react";
import { Card, CardContent, Typography, Box, useTheme } from "@mui/material";

function resolveColor(theme, accent) {
  if (typeof accent === "string" && accent.startsWith("#")) return accent;
  return accent.split(".").reduce((o, k) => o?.[k], theme.palette) || accent;
}

export default function StatCard({ title, value, sub, accent = "secondary.main", icon }) {
  const theme = useTheme();
  const color = resolveColor(theme, accent);
  const isHex = color.startsWith("#");
  return (
    <Card sx={{ position: "relative", height: "100%", overflow: "hidden" }}>
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: `linear-gradient(180deg, ${color}, transparent)`,
          opacity: 0.9,
        }}
      />
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ display: "block" }}>
            {title}
          </Typography>
          {icon && <Box sx={{ color, opacity: 0.9 }}>{icon}</Box>}
        </Box>
        <Typography
          variant="h3"
          className="mh-mono"
          sx={{ color, mt: 0.75, fontWeight: 700, ...(isHex ? { textShadow: `0 0 18px ${color}55` } : {}) }}
        >
          {value}
        </Typography>
        {sub && (
          <Typography variant="body2" color="text.secondary" className="mh-mono" sx={{ mt: 0.75 }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
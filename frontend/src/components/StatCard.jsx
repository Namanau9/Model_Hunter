import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";

export default function StatCard({ title, value, sub, accent = "#00E5FF", icon }) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="overline" color="text.secondary">
            {title}
          </Typography>
          {icon}
        </Box>
        <Typography variant="h4" sx={{ color: accent, fontWeight: 700, mt: 1 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="body2" color="text.secondary">
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

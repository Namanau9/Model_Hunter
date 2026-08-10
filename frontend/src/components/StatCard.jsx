import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";

export default function StatCard({ title, value, sub, accent = "secondary.main", icon }) {
  return (
    <Card sx={{ height: "100%", borderLeft: `3px solid ${typeof accent === "string" && accent.startsWith("#") ? accent : undefined}`, borderColor: "divider", "&:hover": { boxShadow: 3 } }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="overline" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
            {title}
          </Typography>
          {icon}
        </Box>
        <Typography variant="h4" sx={{ color: typeof accent === "string" && accent.startsWith("#") ? accent : "secondary.main", fontWeight: 700, mt: 1 }}>
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

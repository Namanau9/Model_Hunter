import React from "react";
import { Box, Typography } from "@mui/material";

/** Plain empty / offline state: outlined icon, short title, guidance, optional action. */
export default function EmptyState({ icon, title, text, action, compact = false, tone = "var(--ink-3)" }) {
  return (
    <Box sx={{ textAlign: "center", py: compact ? 3 : 5, px: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {icon && (
        <Box
          aria-hidden
          sx={{
            width: 48,
            height: 48,
            mb: 1.5,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            color: tone,
            border: "1px dashed var(--line-strong)",
            "& svg": { fontSize: 22 },
          }}
        >
          {icon}
        </Box>
      )}
      {title && (
        <Typography component="p" sx={{ fontWeight: 600, mb: 0.5 }}>
          {title}
        </Typography>
      )}
      {text && <Typography sx={{ maxWidth: 420, fontSize: "0.88rem", color: "var(--ink-2)" }}>{text}</Typography>}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Box>
  );
}

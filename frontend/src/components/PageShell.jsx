import React from "react";
import { Box, Typography, Stack, IconButton, Tooltip, Divider } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

/** Polished page header — eyebrow path, gradient display title, optional actions. */
export default function PageShell({ title, subtitle, actions, onRefresh, eyebrow, children }) {
  return (
    <Box className="mh-reveal">
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-end"
        sx={{ mb: 2, flexWrap: "wrap", gap: 1.5 }}
      >
        <Box>
          {eyebrow && (
            <Typography variant="overline" color="secondary.main" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
              <Box component="span" className="mh-mono" sx={{ color: "text.disabled" }}>MH //</Box>
              {eyebrow}
            </Typography>
          )}
          <Typography
            variant="h4"
            className="mh-display"
            sx={{
              mt: eyebrow ? 0.25 : 0,
              fontWeight: 700,
              backgroundImage: "linear-gradient(90deg, #E6EDF7 20%, #A4B6FF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: "76ch" }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {(actions || onRefresh) && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
            {onRefresh && (
              <Tooltip title="Refresh">
                <IconButton onClick={onRefresh} color="secondary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}
            {actions}
          </Stack>
        )}
      </Stack>
      <Divider sx={{ mb: 3, borderColor: "divider", opacity: 0.6 }} />
      {children}
    </Box>
  );
}


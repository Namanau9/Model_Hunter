import React from "react";
import { Box, Typography, Stack, IconButton, Tooltip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

/** Consistent page header + optional refresh / action buttons. */
export default function PageShell({ title, subtitle, actions, onRefresh, children }) {
    return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ mb: 3, flexWrap: "wrap", gap: 1.5 }}
      >
        <Box>
          <Typography variant="h4" sx={{ color: "secondary.main", fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: "64ch" }}>
              {subtitle}
            </Typography>
          )}
        </Box>
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
      </Stack>
      {children}
    </Box>
  );
}

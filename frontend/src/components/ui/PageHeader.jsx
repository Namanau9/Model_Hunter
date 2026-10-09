import React from "react";
import { Box, Typography, Stack, IconButton, Tooltip } from "@mui/material";
import { motion } from "framer-motion";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { motion as m } from "../../theme/tokens";

/** Page heading: section path, serif title, plain subtitle, actions. */
export default function PageHeader({ section, title, subtitle, actions, onRefresh }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "flex-end" }}
      sx={{ mb: { xs: 3, md: 3.5 }, pb: { xs: 2.5, md: 3 }, gap: 2, borderBottom: "1px solid var(--line)" }}
    >
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: m.slow, ease: m.ease }}
        sx={{ minWidth: 0 }}
      >
        {section && (
          <Typography className="mh-mono" sx={{ fontSize: "0.74rem", color: "var(--ink-3)", mb: 0.5 }}>
            {section}
          </Typography>
        )}
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: "2.1rem", md: "2.6rem" } }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ mt: 0.75, maxWidth: "68ch", color: "var(--ink-2)", fontSize: { xs: "0.94rem", md: "0.98rem" } }}>{subtitle}</Typography>
        )}
      </Box>
      {(actions || onRefresh) && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          {actions}
          {onRefresh && (
            <Tooltip title="Reload from backend">
              <IconButton onClick={onRefresh} aria-label="Reload from backend" sx={{ width: 40, height: 40, border: "1px solid var(--line-strong)" }}>
                <RefreshRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      )}
    </Stack>
  );
}

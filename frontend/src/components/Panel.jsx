import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import Corners from "./Corners";

/**
 * Consistent, polished section container used across all pages.
 * - corners  : HUD targeting brackets (primary panels)
 * - eyebrow  : small mono uppercase label above the title
 * - accent   : colored left rail (domain accent)
 * - actions  : optional action slot in the header
 */
export default function Panel({ title, eyebrow, actions, children, corners = false, accent, sx, ...rest }) {
  return (
    <Card
      sx={{
        position: "relative",
        height: "100%",
        overflow: "hidden",
        ...(accent ? { borderLeft: `3px solid ${accent}` } : {}),
        ...sx,
      }}
      {...rest}
    >
      {corners && <Corners />}
      <CardContent sx={{ p: 2.5 }}>
        {(title || eyebrow || actions) && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 1.5,
              mb: 1.5,
              flexWrap: "wrap",
            }}
          >
            <Box>
              {eyebrow && (
                <Typography variant="overline" color="secondary.main" sx={{ display: "block" }}>
                  {eyebrow}
                </Typography>
              )}
              {title && <Typography variant="h6" sx={{ mt: eyebrow ? 0.25 : 0 }}>{title}</Typography>}
            </Box>
            {actions}
          </Box>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

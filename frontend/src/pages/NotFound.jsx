import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

export default function NotFound() {
  const { pathname } = useLocation();
  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "60vh", textAlign: "center" }}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: "4rem", md: "5.5rem" }, lineHeight: 1 }}>
          404
        </Typography>
        <Typography sx={{ mt: 1, fontWeight: 600 }}>There's no page here.</Typography>
        <Typography className="mh-mono" sx={{ color: "var(--ink-3)", fontSize: "0.82rem", mt: 0.5, wordBreak: "break-all" }}>
          {pathname}
        </Typography>
        <Button component={RouterLink} to="/" variant="outlined" startIcon={<ArrowBackRoundedIcon />} sx={{ mt: 3 }}>
          Back to the dashboard
        </Button>
      </Box>
    </Box>
  );
}

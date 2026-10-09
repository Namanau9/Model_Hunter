import React from "react";
import { Box } from "@mui/material";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import GppBadOutlinedIcon from "@mui/icons-material/GppBadOutlined";
import { statusVar, statusTextVar, tint } from "../../theme/tokens";

const ICON = { Strong: VerifiedUserOutlinedIcon, Moderate: ReportProblemOutlinedIcon, Weak: GppBadOutlinedIcon };

/** Robustness class — colour always paired with an icon and a text label. */
export default function ClassBadge({ klass, size = "md" }) {
  if (!klass) return null;
  const Icon = ICON[klass] || ReportProblemOutlinedIcon;
  const small = size === "sm";
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: small ? 0.75 : 1,
        py: small ? 0.15 : 0.3,
        borderRadius: "4px",
        fontSize: small ? "0.72rem" : "0.78rem",
        fontWeight: 600,
        color: statusTextVar(klass),
        border: `1px solid ${tint(statusVar(klass), 45)}`,
        background: tint(statusVar(klass), 10),
        whiteSpace: "nowrap",
      }}
    >
      <Icon sx={{ fontSize: small ? 13 : 15 }} aria-hidden />
      {klass}
    </Box>
  );
}

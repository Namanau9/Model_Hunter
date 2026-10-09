import React from "react";
import { Box, Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const TEXT =
  "Rendered in your browser: each attack's real update rule and ε-constraint applied to a structured pseudo-gradient. " +
  "No model is queried, so this shows what perturbations look like — accuracy and attack-success numbers come from the backend Evaluation.";

/** Honest labelling for client-side visualisations. */
export default function IllustrativeBadge({ label = "Illustrative, rendered in browser" }) {
  return (
    <Tooltip title={TEXT}>
      <Box
        component="span"
        tabIndex={0}
        aria-label={`${label}. ${TEXT}`}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          px: 0.9,
          py: 0.3,
          borderRadius: "4px",
          fontSize: "0.72rem",
          color: "var(--ink-2)",
          border: "1px dashed var(--line-strong)",
          cursor: "help",
          whiteSpace: "nowrap",
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 13 }} aria-hidden />
        {label}
      </Box>
    </Tooltip>
  );
}

import React from "react";
import { Box, Typography } from "@mui/material";
import ElapsedTimer from "../ui/ElapsedTimer";

/**
 * Honest "work in progress" readout for synchronous backend calls:
 * a real elapsed-time clock and an indeterminate striped bar (no fake %).
 */
export default function RunningIndicator({ since, label = "Running", detail }) {
  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Typography sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}>
          <Box component="span" className="mh-dot" sx={{ color: "var(--blue)", animation: "mhPulse 1.2s ease-in-out infinite" }} aria-hidden />
          {label}
        </Typography>
        <Typography className="mh-mono" sx={{ fontSize: "1.6rem", fontWeight: 500, lineHeight: 1 }}>
          <ElapsedTimer since={since} />
        </Typography>
      </Box>
      <Box
        role="progressbar"
        aria-label={label}
        aria-busy="true"
        sx={{
          mt: 1.5,
          height: 6,
          borderRadius: 3,
          border: "1px solid var(--line-strong)",
          backgroundColor: "var(--sunken)",
          backgroundImage: "repeating-linear-gradient(-45deg, var(--line-strong) 0 7px, transparent 7px 14px)",
          backgroundSize: "28px 100%",
          animation: "mhStripes 0.8s linear infinite",
        }}
      />
      {detail && <Typography sx={{ mt: 1.25, fontSize: "0.82rem", color: "var(--ink-2)" }}>{detail}</Typography>}
    </Box>
  );
}

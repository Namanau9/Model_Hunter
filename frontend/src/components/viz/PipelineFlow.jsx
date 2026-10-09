import React from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useMotionOff } from "../../contexts/UiPrefsContext";

/**
 * Numbered stage diagram (horizontal on desktop, vertical on mobile).
 * While `active`, a marker travels along the connectors.
 * steps: string[] | {label, sub}[]
 */
export default function PipelineFlow({ steps, active = false, compact = false }) {
  const motionOff = useMotionOff();
  const items = steps.map((s) => (typeof s === "string" ? { label: s } : s));

  return (
    <Box role="list" aria-label="Pipeline stages" sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: { xs: "stretch", md: "stretch" } }}>
      {items.map((s, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={s.label}>
            <Box
              role="listitem"
              component={motion.div}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              sx={{
                flex: { md: 1 },
                minWidth: 0,
                p: compact ? 1.1 : 1.4,
                borderRadius: "8px",
                border: "1px solid var(--line-strong)",
                background: "var(--raised)",
                display: "flex",
                flexDirection: { xs: "row", md: "column" },
                gap: { xs: 1.25, md: 0.4 },
                alignItems: { xs: "baseline", md: "flex-start" },
              }}
            >
              <Typography className="mh-mono" sx={{ fontSize: "0.7rem", color: "var(--ink-3)" }}>
                {String(i + 1).padStart(2, "0")}
              </Typography>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: compact ? "0.8rem" : "0.86rem", fontWeight: 600, lineHeight: 1.3 }}>{s.label}</Typography>
                {s.sub && (
                  <Typography className="mh-mono" noWrap sx={{ fontSize: "0.7rem", color: "var(--ink-3)", mt: 0.25 }}>
                    {s.sub}
                  </Typography>
                )}
              </Box>
            </Box>
            {!last && (
              <Box
                aria-hidden
                sx={{
                  position: "relative",
                  flex: { md: "0 0 22px" },
                  height: { xs: 14, md: "auto" },
                  alignSelf: "stretch",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box sx={{ width: { xs: "1px", md: "100%" }, height: { xs: "100%", md: "1px" }, background: "var(--line-strong)" }} />
                {active && !motionOff && (
                  <Box
                    component={motion.span}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.22, ease: "easeInOut" }}
                    sx={{ position: "absolute", width: 6, height: 6, borderRadius: "50%", background: "var(--blue)" }}
                  />
                )}
              </Box>
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
}

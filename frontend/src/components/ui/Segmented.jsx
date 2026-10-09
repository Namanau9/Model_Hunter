import React, { useRef } from "react";
import { Box } from "@mui/material";
import { motion } from "framer-motion";

/** Compact segmented switch; the ink highlight slides to the active option. */
export default function Segmented({ options, value, onChange, layoutId, ariaLabel, size = "md", fullWidth = false }) {
  const refs = useRef([]);
  const onKeyDown = (e, i) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    const n = (i + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
    onChange(options[n].value);
    refs.current[n]?.focus();
  };
  const h = size === "sm" ? 30 : 36;
  return (
    <Box
      role="radiogroup"
      aria-label={ariaLabel}
      sx={{
        display: fullWidth ? "flex" : "inline-flex",
        p: "3px",
        gap: "2px",
        borderRadius: "8px",
        border: "1px solid var(--line-strong)",
        background: "var(--sunken)",
        maxWidth: "100%",
        overflowX: "auto",
      }}
    >
      {options.map((o, i) => {
        const sel = o.value === value;
        return (
          <Box
            key={o.value}
            ref={(el) => (refs.current[i] = el)}
            component="button"
            type="button"
            role="radio"
            aria-checked={sel}
            tabIndex={sel ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            sx={{
              all: "unset",
              position: "relative",
              flex: fullWidth ? 1 : "0 0 auto",
              minHeight: h,
              px: size === "sm" ? 1.25 : 1.5,
              borderRadius: "6px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.6,
              fontSize: size === "sm" ? "0.78rem" : "0.84rem",
              fontWeight: 600,
              color: sel ? "var(--ink)" : "var(--ink-2)",
              transition: "color 150ms ease",
              whiteSpace: "nowrap",
              "&:hover": { color: "var(--ink)" },
              "&:focus-visible": { outline: "2px solid var(--blue)", outlineOffset: 1 },
              "& svg": { fontSize: 16 },
            }}
          >
            {sel && (
              <Box
                component={motion.span}
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 560, damping: 42 }}
                aria-hidden
                sx={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "6px",
                  background: "var(--raised)",
                  border: "1px solid var(--line-strong)",
                  boxShadow: "var(--shadow)",
                }}
              />
            )}
            <Box component="span" sx={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 0.6 }}>
              {o.icon}
              {o.label}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

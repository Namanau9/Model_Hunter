import React, { useRef } from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { FieldLabel } from "./Panel";
import { tint } from "../../theme/tokens";

/**
 * Radio group of option cards; the selection frame slides between
 * options (shared layoutId). options: [{ value, label, description, badge, visual, disabled }]
 */
export default function ChoiceCards({
  label,
  options,
  value,
  onChange,
  columns = { xs: 1, sm: 2 },
  layoutId,
  dense = false,
  vertical = false,
  disabled = false,
  accent = "var(--ink)",
}) {
  const refs = useRef([]);
  const enabled = options.filter((o) => !o.disabled);

  const onKeyDown = (e, idx) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const cur = enabled.findIndex((o) => o.value === options[idx].value);
    const next = enabled[(cur + dir + enabled.length) % enabled.length];
    onChange(next.value);
    refs.current[options.findIndex((o) => o.value === next.value)]?.focus();
  };

  const cols = typeof columns === "number" ? { xs: columns } : columns;
  const gridCols = Object.fromEntries(Object.entries(cols).map(([k, v]) => [k, `repeat(${v}, minmax(0, 1fr))`]));

  return (
    <Box>
      {label && <FieldLabel>{label}</FieldLabel>}
      <Box role="radiogroup" aria-label={label} sx={{ display: "grid", gridTemplateColumns: gridCols, gap: 1 }}>
        {options.map((o, i) => {
          const selected = o.value === value;
          const isDisabled = disabled || o.disabled;
          return (
            <Box
              key={o.value}
              ref={(el) => (refs.current[i] = el)}
              component={motion.button}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={isDisabled || undefined}
              tabIndex={selected || (!value && i === 0) ? 0 : -1}
              disabled={isDisabled}
              onClick={() => !isDisabled && onChange(o.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              whileTap={isDisabled ? undefined : { scale: 0.985 }}
              sx={{
                all: "unset",
                boxSizing: "border-box",
                position: "relative",
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled && !selected ? 0.5 : 1,
                minHeight: 44,
                p: dense ? 1.25 : 1.5,
                borderRadius: "8px",
                border: "1px solid var(--line-strong)",
                background: "var(--raised)",
                transition: "border-color 150ms ease, background-color 150ms ease",
                display: "flex",
                flexDirection: vertical ? "column" : "row",
                gap: vertical ? 1 : 1.25,
                alignItems: vertical ? "flex-start" : dense ? "center" : "flex-start",
                textAlign: "left",
                "&:hover": isDisabled ? undefined : { borderColor: "var(--ink-3)", background: "var(--hover)" },
                "&:focus-visible": { outline: "2px solid var(--blue)", outlineOffset: 2 },
              }}
            >
              {selected && (
                <Box
                  component={motion.span}
                  layoutId={layoutId}
                  transition={{ type: "spring", stiffness: 520, damping: 40 }}
                  aria-hidden
                  sx={{
                    position: "absolute",
                    inset: -1,
                    borderRadius: "8px",
                    border: `1.5px solid ${accent}`,
                    background: tint(accent, 7),
                    pointerEvents: "none",
                  }}
                />
              )}
              {o.visual && <Box sx={{ position: "relative", flexShrink: 0, display: "flex" }}>{o.visual}</Box>}
              <Box sx={{ position: "relative", minWidth: 0, flex: 1, width: vertical ? "100%" : undefined }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "space-between" }}>
                  <Typography component="span" sx={{ fontWeight: 600, fontSize: dense ? "0.88rem" : "0.93rem", whiteSpace: "nowrap" }}>
                    {o.label}
                  </Typography>
                  {o.badge && (
                    <Typography component="span" className="mh-mono" sx={{ fontSize: "0.68rem", color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                      {o.badge}
                    </Typography>
                  )}
                </Box>
                {o.description && (
                  <Typography component="span" className="mh-mono" sx={{ display: "block", mt: 0.25, fontSize: "0.72rem", color: "var(--ink-3)" }}>
                    {o.description}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

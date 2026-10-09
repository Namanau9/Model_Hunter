import React from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { fadeUp } from "../../lib/motion";

/**
 * Solid section card with a document-style header:
 *   Title                                   [actions]
 *   caption (mono, muted)
 *   ───────────────────────────────────────────────── (hairline)
 * - marker : small coloured square before the title (domain cue)
 * - lift   : hover lifts the card slightly (for clickable/browsable cards)
 */
export default function Panel({
  children,
  title,
  caption,
  actions,
  marker,
  padding = 2.5,
  lift = false,
  divider = true,
  sx,
  className = "",
  variants = fadeUp,
  ...rest
}) {
  const hasHeader = title || caption || actions;
  return (
    <Box
      component={motion.section}
      variants={variants}
      // Self-animating on mount: never depends on a parent's variant timing,
      // so cards that appear after data arrives still fade in.
      initial="hidden"
      animate="show"
      whileHover={lift ? { y: -3, transition: { duration: 0.18 } } : undefined}
      className={`mh-card ${lift ? "is-hoverable" : ""} ${className}`}
      sx={{ minWidth: 0, ...sx }}
      {...rest}
    >
      {hasHeader && (
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1.5,
            px: padding,
            pt: padding * 0.8,
            pb: divider ? 1.5 : 0,
            borderBottom: divider ? "1px solid var(--line)" : "none",
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {title && (
              <Typography component="h2" sx={{ fontWeight: 600, fontSize: "0.98rem", lineHeight: 1.35, display: "flex", alignItems: "center", gap: 1 }}>
                {marker && <Box component="span" aria-hidden sx={{ width: 8, height: 8, borderRadius: "2px", background: marker, flexShrink: 0 }} />}
                {title}
              </Typography>
            )}
            {caption && (
              <Typography className="mh-mono" sx={{ fontSize: "0.72rem", color: "var(--ink-3)", mt: 0.25 }}>
                {caption}
              </Typography>
            )}
          </Box>
          {actions && <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>{actions}</Box>}
        </Box>
      )}
      <Box sx={{ p: padding, pt: hasHeader ? padding * 0.8 : padding }}>{children}</Box>
    </Box>
  );
}

/** Figure caption in research-paper style: "Fig. 2 — text". */
export function FigCaption({ n, children, sx }) {
  return (
    <Typography sx={{ fontSize: "0.8rem", color: "var(--ink-2)", mt: 1.25, lineHeight: 1.5, ...sx }}>
      {n != null && (
        <Box component="span" sx={{ fontWeight: 600, color: "var(--ink)" }}>
          Fig. {n}
        </Box>
      )}
      {n != null && " — "}
      {children}
    </Typography>
  );
}

/** Small form/section label. */
export function FieldLabel({ children, htmlFor, id, sx, right }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.75, ...sx }}>
      <Typography component={htmlFor ? "label" : "div"} htmlFor={htmlFor} id={id} sx={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--ink-2)" }}>
        {children}
      </Typography>
      {right}
    </Box>
  );
}

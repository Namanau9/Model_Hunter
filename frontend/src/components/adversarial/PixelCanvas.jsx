import React, { useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { paint } from "../../lib/adversarial/engine";

/** Square canvas for an ImageData, with a corner label and an optional scan line on change. */
export default function PixelCanvas({ imageData, label, marker, scanKey, ariaLabel, pixelated = true, radius = 6, children, sx }) {
  const ref = useRef(null);
  useEffect(() => {
    paint(ref.current, imageData);
  }, [imageData]);

  return (
    <Box
      sx={{
        position: "relative",
        aspectRatio: "1 / 1",
        width: "100%",
        borderRadius: `${radius}px`,
        overflow: "hidden",
        background: "var(--sunken)",
        border: "1px solid var(--line-strong)",
        ...sx,
      }}
    >
      <canvas ref={ref} role="img" aria-label={ariaLabel || label} className={pixelated ? "mh-pixel" : undefined} style={{ width: "100%", height: "100%", display: "block" }} />
      <AnimatePresence>
        {scanKey != null && (
          <motion.div
            key={scanKey}
            aria-hidden
            initial={{ top: "0%", opacity: 0.9 }}
            animate={{ top: "100%", opacity: [0.9, 0.9, 0] }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            style={{ position: "absolute", left: 0, right: 0, height: 2, background: "var(--accent)", pointerEvents: "none" }}
          />
        )}
      </AnimatePresence>
      {label && (
        <Typography
          component="span"
          className="mh-mono"
          sx={{
            position: "absolute",
            left: 6,
            top: 6,
            px: 0.75,
            py: 0.2,
            display: "inline-flex",
            alignItems: "center",
            gap: 0.6,
            borderRadius: "4px",
            fontSize: "0.66rem",
            fontWeight: 500,
            color: "var(--ink)",
            background: "color-mix(in srgb, var(--raised) 88%, transparent)",
            border: "1px solid var(--line)",
          }}
        >
          {marker && <Box component="span" aria-hidden sx={{ width: 6, height: 6, borderRadius: "1px", background: marker }} />}
          {label}
        </Typography>
      )}
      {children}
    </Box>
  );
}

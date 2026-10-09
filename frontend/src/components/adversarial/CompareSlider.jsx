import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded";
import { paint } from "../../lib/adversarial/engine";

/** Drag (or arrow-key) wipe between two images of identical size. */
export default function CompareSlider({ left, right, leftLabel = "Original", rightLabel = "Adversarial" }) {
  const wrap = useRef(null);
  const lRef = useRef(null);
  const rRef = useRef(null);
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);

  useEffect(() => paint(lRef.current, left), [left]);
  useEffect(() => paint(rRef.current, right), [right]);

  const setFromX = useCallback((clientX) => {
    const r = wrap.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  }, []);

  const onDown = (e) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setFromX(e.clientX);
  };
  const onMove = (e) => dragging.current && setFromX(e.clientX);
  const onUp = () => (dragging.current = false);
  const onKey = (e) => {
    if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
    else if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
    else if (e.key === "Home") setPos(0);
    else if (e.key === "End") setPos(100);
    else return;
    e.preventDefault();
  };

  const chip = {
    position: "absolute",
    bottom: 6,
    px: 0.75,
    py: 0.2,
    borderRadius: "4px",
    fontSize: "0.66rem",
    color: "var(--ink)",
    background: "color-mix(in srgb, var(--raised) 88%, transparent)",
    border: "1px solid var(--line)",
    pointerEvents: "none",
  };

  return (
    <Box
      ref={wrap}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      sx={{
        position: "relative",
        aspectRatio: "1 / 1",
        width: "100%",
        borderRadius: "6px",
        overflow: "hidden",
        cursor: "ew-resize",
        touchAction: "none",
        userSelect: "none",
        background: "var(--sunken)",
        border: "1px solid var(--line-strong)",
      }}
    >
      <canvas ref={rRef} className="mh-pixel" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <canvas ref={lRef} className="mh-pixel" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <Typography className="mh-mono" sx={{ ...chip, left: 6 }}>
        {leftLabel}
      </Typography>
      <Typography className="mh-mono" sx={{ ...chip, right: 6 }}>
        {rightLabel}
      </Typography>
      <Box
        role="slider"
        tabIndex={0}
        aria-label={`Comparison: ${leftLabel} versus ${rightLabel}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)}% ${leftLabel}`}
        onKeyDown={onKey}
        sx={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${pos}%`,
          width: 2,
          ml: "-1px",
          background: "var(--raised)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
          "&:focus-visible": { outline: "none", "& > span": { outline: "2px solid var(--blue)", outlineOffset: 2 } },
        }}
      >
        <Box
          component="span"
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(90deg)",
            width: 28,
            height: 28,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "var(--raised)",
            border: "1px solid var(--line-strong)",
            color: "var(--ink)",
            boxShadow: "var(--shadow-pop)",
          }}
        >
          <UnfoldMoreRoundedIcon sx={{ fontSize: 18 }} />
        </Box>
      </Box>
    </Box>
  );
}

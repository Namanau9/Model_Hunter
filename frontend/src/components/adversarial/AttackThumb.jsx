import React, { useMemo, useState } from "react";
import { Box } from "@mui/material";
import PixelCanvas from "./PixelCanvas";
import useAdversarial from "./useAdversarial";
import { renderSample, sampleById } from "../../lib/adversarial/samples";

/** Perturbation signature of an attack; hover reveals the attacked image. */
export default function AttackThumb({ attack, sampleId = "stop", epsilon = 0.12 }) {
  const [hover, setHover] = useState(false);
  const image = useMemo(() => renderSample(sampleById(sampleId), 64), [sampleId]);
  const { perturbation, adversarial } = useAdversarial(image, { attack, epsilon, steps: 10, view: "signed" });
  return (
    <Box onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)} sx={{ position: "relative", width: "100%" }}>
      <PixelCanvas imageData={hover ? adversarial : perturbation} label={hover ? "x′" : "δ"} marker={hover ? "var(--accent)" : undefined} ariaLabel={`${attack} perturbation signature`} />
    </Box>
  );
}

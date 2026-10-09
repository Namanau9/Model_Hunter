import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import PixelCanvas from "./PixelCanvas";
import useAdversarial from "./useAdversarial";
import { FigCaption } from "../ui/Panel";
import { renderSample, sampleById } from "../../lib/adversarial/samples";
import { ATTACK_META } from "../../lib/constants";
import { useMotionOff } from "../../contexts/UiPrefsContext";

const CYCLE = [
  { id: "stop", attack: "fgsm", eps: 0.1 },
  { id: "plane", attack: "pgd", eps: 0.08 },
  { id: "speed30", attack: "hopskipjump", eps: 0.12 },
  { id: "ship", attack: "cw", eps: 0.14 },
];

/** Auto-advancing x + δ = x′ figure for the dashboard. */
export default function AdversarialHero({ figure = 1 }) {
  const motionOff = useMotionOff();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (motionOff) return undefined;
    const t = setInterval(() => setI((v) => (v + 1) % CYCLE.length), 4500);
    return () => clearInterval(t);
  }, [motionOff]);

  const step = CYCLE[i];
  const sample = sampleById(step.id);
  const image = useMemo(() => renderSample(sample, 96), [sample]);
  const { original, perturbation, adversarial, stats } = useAdversarial(image, { attack: step.attack, epsilon: step.eps, steps: 10 });

  const cells = [
    [original, "x"],
    [perturbation, "δ"],
    [adversarial, "x′"],
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, md: 1 } }}>
        {cells.map(([img, label], k) => (
          <React.Fragment key={label}>
            {k > 0 && (
              <Typography className="mh-mono" aria-hidden sx={{ color: "var(--ink-3)", fontSize: "1.2rem" }}>
                {k === 1 ? "+" : "="}
              </Typography>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${step.id}-${k}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3, delay: k * 0.05 }}
                >
                  <PixelCanvas imageData={img} label={label} marker={k === 2 ? "var(--accent)" : undefined} scanKey={k === 2 ? step.id : undefined} />
                </motion.div>
              </AnimatePresence>
            </Box>
          </React.Fragment>
        ))}
      </Box>
      <Box sx={{ display: "flex", gap: 0.5, mt: 1.25 }} aria-hidden>
        {CYCLE.map((c, k) => (
          <Box key={c.id} sx={{ height: 2, flex: 1, background: k === i ? "var(--ink)" : "var(--line)", transition: "background-color 300ms ease" }} />
        ))}
      </Box>
      <FigCaption n={figure}>
        {ATTACK_META[step.attack].name} on a {sample.label.toLowerCase()} at ε = {step.eps}. The change is bounded per pixel, yet PSNR is{" "}
        {stats ? stats.psnr.toFixed(1) : "—"} dB and SSIM {stats ? stats.ssim.toFixed(2) : "—"}. Rendered in the browser for illustration.
      </FigCaption>
    </Box>
  );
}

import React, { useMemo } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import PixelCanvas from "./PixelCanvas";
import CompareSlider from "./CompareSlider";
import useAdversarial from "./useAdversarial";
import { FigCaption } from "../ui/Panel";
import { DATASET_SAMPLE, NATIVE_SIZE, renderSample, sampleById } from "../../lib/adversarial/samples";
import { ATTACK_META } from "../../lib/constants";

/**
 * What a perturbation of this attack + ε looks like on a demo image of
 * the chosen dataset. Visual aid only — metrics come from the backend.
 */
export default function PerturbationPreview({ dataset = "gtsrb", attack = "fgsm", epsilon = 0.1, steps = 8, native = false, showCompare = true, figure }) {
  const sample = sampleById(DATASET_SAMPLE[dataset] || "stop");
  const size = native ? NATIVE_SIZE[dataset] || 32 : 112;
  const image = useMemo(() => renderSample(sample, size), [sample, size]);
  const eps = Math.max(0, Math.min(1, Number(epsilon) || 0));
  const { original, perturbation, adversarial, stats } = useAdversarial(image, { attack, epsilon: eps, steps });

  return (
    <Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 1 }}>
        <PixelCanvas imageData={original} label="x" />
        <PixelCanvas imageData={perturbation} label="δ" scanKey={`${attack}-${dataset}`} />
        <PixelCanvas imageData={adversarial} label="x′" marker="var(--accent)" scanKey={`${attack}-${dataset}`} />
      </Box>
      <FigCaption n={figure}>
        {ATTACK_META[attack]?.label || attack} at ε = {eps} on a {sample.label.toLowerCase()} (illustrative, rendered in the browser). ‖δ‖∞ = {stats ? stats.linf.toFixed(3) : "—"}, PSNR{" "}
        {stats ? (Number.isFinite(stats.psnr) ? `${stats.psnr.toFixed(1)} dB` : "∞") : "—"}, SSIM {stats ? stats.ssim.toFixed(3) : "—"}.
      </FigCaption>
      {showCompare && (
        <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 220px) 1fr" }, gap: 2, alignItems: "center" }}>
          <CompareSlider left={original} right={adversarial} />
          <Box>
            <Typography sx={{ fontSize: "0.86rem", color: "var(--ink-2)" }}>
              Drag the divider to compare the clean and attacked image. For your own images and all five attacks, open the lab.
            </Typography>
            <Button component={RouterLink} to="/attacks#lab" size="small" color="primary" endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 1, px: 0 }}>
              Open the Adversarial Lab
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

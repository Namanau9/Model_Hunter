import React, { useEffect, useMemo, useState } from "react";
import { Box, Grid, Slider, Typography } from "@mui/material";
import { motion } from "framer-motion";
import Panel, { FigCaption, FieldLabel } from "../ui/Panel";
import Segmented from "../ui/Segmented";
import PixelCanvas from "./PixelCanvas";
import IllustrativeBadge from "./IllustrativeBadge";
import { renderSample, sampleById, SAMPLES, sampleThumb } from "../../lib/adversarial/samples";
import { synthesize, toImageData, perturbationImageData, imageStats, INFERNO_CSS } from "../../lib/adversarial/engine";
import { PURIFIERS, l2 } from "../../lib/adversarial/defenses";

const SIZE = 112;

function Meter({ label, value, color, hint }) {
  const v = Math.max(0, Math.min(1, value ?? 0));
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.6 }}>
        <Typography sx={{ fontSize: "0.84rem", color: "var(--ink-2)" }}>{label}</Typography>
        <Typography className="mh-mono" sx={{ fontSize: "0.86rem", fontWeight: 600 }}>
          {value == null ? "—" : `${(v * 100).toFixed(0)}%`}
        </Typography>
      </Box>
      <Box sx={{ height: 6, borderRadius: 3, background: "var(--sunken)", border: "1px solid var(--line)", overflow: "hidden" }}>
        <Box component={motion.div} animate={{ width: `${v * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 30 }} sx={{ height: "100%", background: color }} />
      </Box>
      {hint && <Typography sx={{ fontSize: "0.74rem", color: "var(--ink-3)", mt: 0.5 }}>{hint}</Typography>}
    </Box>
  );
}

/**
 * Applies the input-preprocessing defense family (blur / JPEG / squeezing)
 * to an adversarial demo image and measures how much perturbation survives.
 */
export default function PurificationLab() {
  const [sampleId, setSampleId] = useState("stop");
  const [method, setMethod] = useState("gaussian_blur");
  const [param, setParam] = useState(PURIFIERS.gaussian_blur.def);
  const [out, setOut] = useState(null);

  const p = PURIFIERS[method];
  const clean = useMemo(() => renderSample(sampleById(sampleId), SIZE), [sampleId]);
  const attacked = useMemo(() => synthesize(clean, { attack: "pgd", epsilon: 0.08, steps: 10 }), [clean]);

  useEffect(() => {
    let alive = true;
    Promise.all([p.run(attacked.adv, param), p.run(clean, param)]).then(([defAdv, defClean]) => {
      if (!alive) return;
      const survived = l2(defAdv, defClean) / Math.max(1e-9, l2(attacked.adv, clean));
      const delta = new Float32Array(defAdv.data.length);
      for (let i = 0; i < delta.length; i++) delta[i] = defAdv.data[i] - defClean.data[i];
      setOut({
        img: toImageData(defAdv),
        residual: perturbationImageData(delta, SIZE, SIZE, 0.08, "magnitude"),
        survived: Math.min(1, survived),
        cleanCost: imageStats(clean, defClean),
      });
    });
    return () => {
      alive = false;
    };
  }, [attacked, clean, p, param]);

  const advImg = useMemo(() => toImageData(attacked.adv), [attacked]);
  const advMag = useMemo(() => perturbationImageData(attacked.delta, SIZE, SIZE, 0.08, "magnitude"), [attacked]);

  return (
    <Panel title="Purification Lab" caption="input preprocessing applied to a PGD-attacked image (ε = 0.08)" marker="var(--green)" actions={<IllustrativeBadge />}>
      <Grid container spacing={3.5}>
        <Grid item xs={12} md={4}>
          <FieldLabel>Attacked input</FieldLabel>
          <Box sx={{ display: "flex", gap: 0.75, mb: 2.5 }}>
            {SAMPLES.filter((s) => !s.gray)
              .slice(0, 4)
              .map((s) => (
                <Box
                  key={s.id}
                  component="button"
                  type="button"
                  aria-pressed={s.id === sampleId}
                  aria-label={`Use ${s.label}`}
                  onClick={() => setSampleId(s.id)}
                  sx={{
                    all: "unset",
                    cursor: "pointer",
                    width: 48,
                    height: 48,
                    borderRadius: "6px",
                    overflow: "hidden",
                    outline: s.id === sampleId ? "2px solid var(--ink)" : "1px solid var(--line-strong)",
                    outlineOffset: s.id === sampleId ? 1 : -1,
                    "&:focus-visible": { outline: "2px solid var(--blue)", outlineOffset: 2 },
                  }}
                >
                  <img src={sampleThumb(s, 64)} alt="" width="100%" height="100%" style={{ display: "block" }} />
                </Box>
              ))}
          </Box>
          <FieldLabel>Purifier</FieldLabel>
          <Segmented
            fullWidth
            size="sm"
            layoutId="purifier"
            ariaLabel="Purification method"
            value={method}
            onChange={(mm) => {
              setMethod(mm);
              setParam(PURIFIERS[mm].def);
            }}
            options={[
              { value: "gaussian_blur", label: "Blur" },
              { value: "jpeg", label: "JPEG" },
              { value: "feature_squeezing", label: "Squeeze" },
            ]}
          />
          <FieldLabel id="purifier-param" sx={{ mt: 2 }} right={<Typography className="mh-mono" sx={{ fontWeight: 600, fontSize: "0.86rem" }}>{Number(param).toFixed(p.step < 1 ? 2 : 0)}</Typography>}>
            {p.label}, {p.param}
          </FieldLabel>
          <Slider aria-labelledby="purifier-param" value={param} min={p.min} max={p.max} step={p.step} onChange={(_, v) => setParam(v)} />
          <Box sx={{ mt: 2 }}>
            <Meter label="Perturbation that survives" value={out?.survived} color="var(--accent)" hint="‖D(x′) − D(x)‖₂ / ‖x′ − x‖₂. Lower means the purifier removed more of the attack." />
            <Meter label="Clean-image fidelity (SSIM)" value={out?.cleanCost?.ssim} color="var(--green)" hint="How much the purifier distorts a clean input: the accuracy cost of the defense." />
          </Box>
        </Grid>
        <Grid item xs={12} md={8}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 1.25 }}>
            <PixelCanvas imageData={advImg} label="x′ attacked" marker="var(--accent)" />
            <PixelCanvas imageData={out?.img} label="D(x′) purified" marker="var(--green)" scanKey={`${method}-${sampleId}`} />
            <PixelCanvas imageData={advMag} label="|δ| before" />
            <PixelCanvas imageData={out?.residual} label="|δ| after" />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
            <FigCaption n={1} sx={{ flex: "1 1 300px" }}>
              Top: the attacked image before and after {p.label.toLowerCase()}. Bottom: perturbation magnitude on the same 0 to ε scale. Darker means more of the attack was removed.
            </FigCaption>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1.5 }}>
              <Typography className="mh-mono" sx={{ fontSize: "0.68rem", color: "var(--ink-3)" }}>0</Typography>
              <Box sx={{ width: 90, height: 6, borderRadius: 1, background: INFERNO_CSS }} aria-hidden />
              <Typography className="mh-mono" sx={{ fontSize: "0.68rem", color: "var(--ink-3)" }}>ε</Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Panel>
  );
}

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Grid, Slider, Tooltip, Typography, IconButton } from "@mui/material";
import { motion } from "framer-motion";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import StopRoundedIcon from "@mui/icons-material/StopRounded";
import CasinoOutlinedIcon from "@mui/icons-material/CasinoOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Panel, { FigCaption, FieldLabel } from "../ui/Panel";
import Segmented from "../ui/Segmented";
import PixelCanvas from "./PixelCanvas";
import CompareSlider from "./CompareSlider";
import IllustrativeBadge from "./IllustrativeBadge";
import useAdversarial from "./useAdversarial";
import { SAMPLES, NATIVE_SIZE, renderSample, imageFromFile, sampleThumb, sampleById } from "../../lib/adversarial/samples";
import { INFERNO_CSS } from "../../lib/adversarial/engine";
import { ATTACK_META, ATTACK_IDS, DATASET_META } from "../../lib/constants";
import { useToast } from "../../contexts/ToastContext";
import { useMotionOff } from "../../contexts/UiPrefsContext";

const HD = 128;
const EPS_MAX = 0.3;

function Op({ children, label }) {
  return (
    <Typography role="img" aria-label={label} className="mh-mono" sx={{ color: "var(--ink-3)", fontSize: { xs: "1rem", sm: "1.3rem" }, flexShrink: 0, px: { xs: 0.25, sm: 0.5 } }}>
      {children}
    </Typography>
  );
}

function StatRow({ label, value, hint }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", py: 0.85, borderBottom: "1px solid var(--line)" }}>
      <Tooltip title={hint} placement="left">
        <Typography sx={{ fontSize: "0.84rem", color: "var(--ink-2)", cursor: "help", textDecoration: "underline dotted var(--line-strong)", textUnderlineOffset: 3 }}>{label}</Typography>
      </Tooltip>
      <Typography className="mh-mono" sx={{ fontSize: "0.86rem", fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  );
}

const ZONES = [
  { max: 20, label: "Obvious", color: "var(--status-weak-text)" },
  { max: 30, label: "Noticeable", color: "var(--status-moderate-text)" },
  { max: 40, label: "Subtle", color: "var(--ink-2)" },
  { max: 61, label: "Imperceptible", color: "var(--status-strong-text)" },
];

function Perceptibility({ psnr }) {
  const v = Number.isFinite(psnr) ? Math.min(60, Math.max(10, psnr)) : 60;
  const pos = ((v - 10) / 50) * 100;
  const zone = ZONES.find((z) => v <= z.max) || ZONES[ZONES.length - 1];
  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Typography sx={{ fontSize: "0.82rem", color: "var(--ink-2)" }}>How visible is it?</Typography>
        <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: zone.color }}>{zone.label}</Typography>
      </Box>
      <Box sx={{ position: "relative", height: 6, borderRadius: 3, background: "var(--sunken)", border: "1px solid var(--line)" }}>
        {[20, 30, 40].map((t) => (
          <Box key={t} aria-hidden sx={{ position: "absolute", top: -3, bottom: -3, left: `${((t - 10) / 50) * 100}%`, width: "1px", background: "var(--line-strong)" }} />
        ))}
        <Box
          component={motion.div}
          animate={{ left: `${pos}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          sx={{ position: "absolute", top: -5, width: 3, height: 14, ml: "-1.5px", borderRadius: 1, background: "var(--ink)" }}
        />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
        <Typography className="mh-mono" sx={{ fontSize: "0.66rem", color: "var(--ink-3)" }}>
          PSNR 10 dB
        </Typography>
        <Typography className="mh-mono" sx={{ fontSize: "0.66rem", color: "var(--ink-3)" }}>
          60 dB
        </Typography>
      </Box>
    </Box>
  );
}

export default function AdversarialLab({ initialSample = "stop", initialAttack = "fgsm", initialEpsilon = 0.06, id = "lab" }) {
  const { notify } = useToast();
  const motionOff = useMotionOff();
  const [sampleId, setSampleId] = useState(initialSample);
  const [file, setFile] = useState(null);
  const [upload, setUpload] = useState(null);
  const [attack, setAttack] = useState(initialAttack);
  const [epsilon, setEpsilon] = useState(initialEpsilon);
  const [steps, setSteps] = useState(10);
  const [seed, setSeed] = useState(7);
  const [res, setRes] = useState("hd");
  const [view, setView] = useState("signed");
  const [sweeping, setSweeping] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const raf = useRef(0);

  const sample = sampleById(sampleId);
  const size = res === "hd" ? HD : NATIVE_SIZE[sample.dataset] || 32;

  useEffect(() => {
    let alive = true;
    if (!file) {
      setUpload(null);
      return undefined;
    }
    imageFromFile(file, res === "hd" ? HD : 32)
      .then((img) => alive && setUpload(img))
      .catch(() => {
        notify("Could not read that image file", "error");
        setFile(null);
      });
    return () => {
      alive = false;
    };
  }, [file, res, notify]);

  const image = useMemo(() => upload || renderSample(sample, size), [upload, sample, size]);
  const { original, adversarial, perturbation, stats } = useAdversarial(image, { attack, epsilon, steps, seed, view });

  const stopSweep = () => {
    cancelAnimationFrame(raf.current);
    setSweeping(false);
  };
  const startSweep = () => {
    if (motionOff) {
      setEpsilon(EPS_MAX / 2);
      return;
    }
    setSweeping(true);
    const t0 = performance.now();
    const dur = 2600;
    const tick = (t) => {
      const u = Math.min(1, (t - t0) / dur);
      setEpsilon(Math.round(EPS_MAX * (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2) * 1000) / 1000);
      if (u < 1) raf.current = requestAnimationFrame(tick);
      else setSweeping(false);
    };
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const onFiles = (files) => {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      notify("Please choose an image file (PNG, JPG, WebP…)", "warning");
      return;
    }
    setFile(f);
    notify(`Loaded ${f.name}. It stays in your browser.`, "info");
  };

  const downloadPng = () => {
    if (!adversarial) return;
    const c = document.createElement("canvas");
    c.width = adversarial.width;
    c.height = adversarial.height;
    c.getContext("2d").putImageData(adversarial, 0, 0);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `adversarial_${file ? "upload" : sampleId}_${attack}_eps${epsilon.toFixed(3)}.png`;
    a.click();
  };

  const meta = ATTACK_META[attack];
  const scanKey = `${sampleId}-${attack}-${seed}-${res}-${file?.name || ""}`;
  const subjectLabel = file ? file.name : `${sample.label} (${DATASET_META[sample.dataset]?.label})`;

  return (
    <Panel id={id} title="Adversarial Lab" caption="pick an input, an attack and a budget ε — runs locally" marker="var(--accent)" actions={<IllustrativeBadge />} sx={{ scrollMarginTop: 80 }}>
      <Grid container spacing={3.5}>
        <Grid item xs={12} lg={4}>
          <FieldLabel>Input image</FieldLabel>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 0.75 }}>
            {SAMPLES.map((s) => {
              const sel = !file && s.id === sampleId;
              return (
                <Tooltip key={s.id} title={`${s.label} (${DATASET_META[s.dataset].label})`}>
                  <Box
                    component={motion.button}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    aria-pressed={sel}
                    aria-label={`Use demo image: ${s.label}`}
                    onClick={() => {
                      setFile(null);
                      setSampleId(s.id);
                    }}
                    sx={{
                      all: "unset",
                      cursor: "pointer",
                      position: "relative",
                      aspectRatio: "1 / 1",
                      borderRadius: "6px",
                      overflow: "hidden",
                      outline: sel ? "2px solid var(--ink)" : "1px solid var(--line-strong)",
                      outlineOffset: sel ? 1 : -1,
                      "&:hover": { outlineColor: sel ? "var(--ink)" : "var(--ink-3)" },
                      "&:focus-visible": { outline: "2px solid var(--blue)", outlineOffset: 2 },
                    }}
                  >
                    <img src={sampleThumb(s, 96)} alt="" width="100%" height="100%" style={{ display: "block" }} />
                  </Box>
                </Tooltip>
              );
            })}
            <Box
              component="label"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                onFiles(e.dataTransfer.files);
              }}
              sx={{
                gridColumn: "span 2",
                cursor: "pointer",
                borderRadius: "6px",
                border: `1px dashed ${dragOver || file ? "var(--blue)" : "var(--line-strong)"}`,
                background: dragOver ? "var(--hover)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.75,
                px: 1,
                color: file ? "var(--blue)" : "var(--ink-2)",
                "&:hover": { borderColor: "var(--ink-3)", background: "var(--hover)" },
                "&:focus-within": { outline: "2px solid var(--blue)", outlineOffset: 2 },
              }}
            >
              <input type="file" accept="image/*" hidden onChange={(e) => onFiles(e.target.files)} aria-label="Use your own image" />
              <UploadFileOutlinedIcon sx={{ fontSize: 19 }} />
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, lineHeight: 1.25 }}>
                {file ? "Replace image" : "Your image"}
                <Box component="span" sx={{ display: "block", fontWeight: 400, fontSize: "0.7rem", color: "var(--ink-3)" }}>
                  drop or browse
                </Box>
              </Typography>
            </Box>
          </Box>
          {file && (
            <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography className="mh-mono" noWrap sx={{ fontSize: "0.74rem", color: "var(--ink-2)", flex: 1 }}>
                {file.name}
              </Typography>
              <IconButton size="small" aria-label="Remove your image" onClick={() => setFile(null)}>
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          <FieldLabel sx={{ mt: 2.5 }}>Attack</FieldLabel>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }} role="radiogroup" aria-label="Attack">
            {ATTACK_IDS.map((a) => {
              const sel = a === attack;
              return (
                <Box
                  key={a}
                  component={motion.button}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setAttack(a)}
                  sx={{
                    all: "unset",
                    cursor: "pointer",
                    minHeight: 36,
                    px: 1.25,
                    borderRadius: "6px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.75,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: sel ? "var(--inverse-ink)" : "var(--ink)",
                    background: sel ? "var(--inverse)" : "var(--raised)",
                    border: `1px solid ${sel ? "var(--inverse)" : "var(--line-strong)"}`,
                    transition: "background-color 140ms ease, color 140ms ease, border-color 140ms ease",
                    "&:hover": { borderColor: sel ? "var(--inverse)" : "var(--ink-3)" },
                    "&:focus-visible": { outline: "2px solid var(--blue)", outlineOffset: 2 },
                  }}
                >
                  {ATTACK_META[a].label}
                  <Box component="span" className="mh-mono" sx={{ fontSize: "0.64rem", fontWeight: 500, opacity: 0.7 }}>
                    {ATTACK_META[a].access === "Black-box" ? "black-box" : "white-box"}
                  </Box>
                </Box>
              );
            })}
          </Box>
          <Typography sx={{ mt: 1.25, fontSize: "0.82rem", color: "var(--ink-2)", minHeight: 40 }}>
            <Box component="span" sx={{ color: "var(--ink)", fontWeight: 600 }}>
              {meta.name}
            </Box>{" "}
            ({meta.norm}). {meta.blurb}
          </Typography>

          <FieldLabel
            id={`${id}-eps`}
            sx={{ mt: 2 }}
            right={
              <Typography className="mh-mono" sx={{ fontSize: "0.86rem", fontWeight: 600 }}>
                {epsilon.toFixed(3)}
                <Box component="span" sx={{ color: "var(--ink-3)", fontWeight: 400, fontSize: "0.74rem", ml: 0.75 }}>
                  ≈ {Math.round(epsilon * 255)}/255
                </Box>
              </Typography>
            }
          >
            Budget ε
          </FieldLabel>
          <Slider
            aria-labelledby={`${id}-eps`}
            value={epsilon}
            min={0}
            max={EPS_MAX}
            step={0.005}
            onChange={(_, v) => {
              if (sweeping) stopSweep();
              setEpsilon(v);
            }}
            marks={[
              { value: 0, label: "0" },
              { value: 8 / 255, label: "8/255" },
              { value: 0.1, label: "0.1" },
              { value: 0.2, label: "0.2" },
              { value: 0.3, label: "0.3" },
            ]}
          />
          {attack === "pgd" && (
            <>
              <FieldLabel id={`${id}-steps`} sx={{ mt: 1 }} right={<Typography className="mh-mono" sx={{ fontSize: "0.86rem", fontWeight: 600 }}>{steps}</Typography>}>
                PGD steps
              </FieldLabel>
              <Slider aria-labelledby={`${id}-steps`} value={steps} min={1} max={40} step={1} onChange={(_, v) => setSteps(v)} />
            </>
          )}

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1.5 }}>
            <Segmented
              size="sm"
              ariaLabel="Resolution"
              layoutId={`${id}-res`}
              value={res}
              onChange={setRes}
              options={[
                { value: "native", label: "Native px" },
                { value: "hd", label: "128 px" },
              ]}
            />
            <Segmented
              size="sm"
              ariaLabel="Perturbation view"
              layoutId={`${id}-view`}
              value={view}
              onChange={setView}
              options={[
                { value: "signed", label: "Signed δ" },
                { value: "magnitude", label: "|δ| heatmap" },
              ]}
            />
          </Box>

          <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
            <Button variant="contained" color="secondary" onClick={sweeping ? stopSweep : startSweep} startIcon={sweeping ? <StopRoundedIcon /> : <PlayArrowRoundedIcon />} sx={{ flex: 1, minWidth: 150 }}>
              {sweeping ? "Stop" : "Sweep ε from 0 to 0.3"}
            </Button>
            <Tooltip title="New random seed">
              <IconButton aria-label="New random seed" onClick={() => setSeed((s) => (s * 7 + 13) % 997)} sx={{ border: "1px solid var(--line-strong)", width: 40, height: 40 }}>
                <CasinoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download adversarial PNG">
              <IconButton aria-label="Download adversarial image" onClick={downloadPng} sx={{ border: "1px solid var(--line-strong)", width: 40, height: 40 }}>
                <FileDownloadOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 } }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <PixelCanvas imageData={original} label="x" ariaLabel={`Clean input: ${subjectLabel}`} />
            </Box>
            <Op label="plus">+</Op>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <PixelCanvas imageData={perturbation} label={view === "signed" ? "δ" : "|δ|"} scanKey={scanKey} ariaLabel={`Perturbation pattern for ${meta.label}`} />
            </Box>
            <Op label="equals">=</Op>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <PixelCanvas imageData={adversarial} label="x′" marker="var(--accent)" scanKey={scanKey} ariaLabel={`Adversarial image (${meta.label}, epsilon ${epsilon.toFixed(3)})`} />
            </Box>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
            <FigCaption n={1} sx={{ flex: "1 1 320px" }}>
              Clean input x plus perturbation δ gives the adversarial image x′. {meta.label}, ε = {epsilon.toFixed(3)}, on {subjectLabel} at {image.w}×{image.h}.
            </FigCaption>
            {view === "magnitude" ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1.5 }}>
                <Typography className="mh-mono" sx={{ fontSize: "0.68rem", color: "var(--ink-3)" }}>0</Typography>
                <Box sx={{ width: 90, height: 6, borderRadius: 1, background: INFERNO_CSS }} aria-hidden />
                <Typography className="mh-mono" sx={{ fontSize: "0.68rem", color: "var(--ink-3)" }}>ε</Typography>
              </Box>
            ) : (
              <Typography className="mh-mono" sx={{ fontSize: "0.7rem", color: "var(--ink-3)", mt: 1.5 }}>
                δ shown scaled: grey 0, bright +ε, dark −ε
              </Typography>
            )}
          </Box>

          <Grid container spacing={3} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <FieldLabel>Drag to compare</FieldLabel>
              <CompareSlider left={original} right={adversarial} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FieldLabel>Measured on these pixels</FieldLabel>
              <Box sx={{ borderTop: "1px solid var(--line)" }}>
                <StatRow label="‖δ‖∞, max change" value={stats ? stats.linf.toFixed(4) : "—"} hint="Largest single-pixel change. L∞ attacks keep this ≤ ε." />
                <StatRow label="‖δ‖₂, energy" value={stats ? stats.l2.toFixed(3) : "—"} hint="Euclidean norm of the perturbation over all input dimensions." />
                <StatRow label="PSNR" value={stats ? (Number.isFinite(stats.psnr) ? `${stats.psnr.toFixed(1)} dB` : "∞") : "—"} hint="Peak signal-to-noise ratio between x and x′. Higher = less visible." />
                <StatRow label="SSIM" value={stats ? stats.ssim.toFixed(3) : "—"} hint="Structural similarity (1 = identical)." />
                <StatRow label="Pixels changed" value={stats ? `${(stats.changed * 100).toFixed(1)}%` : "—"} hint="Share of pixels altered by more than half a grey level." />
              </Box>
              <Perceptibility psnr={stats?.psnr} />
              {epsilon === 0 && <Typography sx={{ mt: 1.5, fontSize: "0.8rem", color: "var(--ink-2)" }}>ε = 0 means no budget, so x′ equals x. Raise ε to see the attack.</Typography>}
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Panel>
  );
}

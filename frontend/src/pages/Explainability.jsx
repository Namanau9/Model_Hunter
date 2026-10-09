import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Dialog, Grid, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import CompareOutlinedIcon from "@mui/icons-material/CompareOutlined";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseIcon from "@mui/icons-material/Close";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import PageHeader from "../components/ui/PageHeader";
import Panel, { FieldLabel, FigCaption } from "../components/ui/Panel";
import ChoiceCards from "../components/ui/ChoiceCards";
import Segmented from "../components/ui/Segmented";
import EmptyState from "../components/ui/EmptyState";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import RunningIndicator from "../components/viz/RunningIndicator";
import { useToast } from "../contexts/ToastContext";
import { apiPost } from "../api/client";
import useApiGet from "../hooks/useApiGet";
import { errorMessage } from "../lib/errors";
import { COMPATIBLE, DATASET_META, MODEL_META, className } from "../lib/constants";
import { sampleThumb, sampleById, DATASET_SAMPLE } from "../lib/adversarial/samples";

const TECH = {
  gradcam: { label: "GradCAM", blurb: "Gradient-weighted activation of the last convolutional layer: where the network looked." },
  shap: { label: "SHAP", blurb: "Shapley-value attributions: how much each pixel pushed the decision." },
};

function ResultPanel({ r, onZoom, n, narrow = false }) {
  const correct = r.true_label === r.predicted_label;
  const conf = Number(r.confidence) * 100;
  return (
    <Box>
      <Box
        component={motion.div}
        initial={{ clipPath: "inset(0 0 100% 0)" }}
        animate={{ clipPath: "inset(0 0 0% 0)" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        sx={{ position: "relative", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--line-strong)", background: "#fff" }}
      >
        <Box component="img" src={r.src} alt={`${TECH[r.technique]?.label} explanation for sample ${r.sample_index}`} sx={{ width: "100%", display: "block" }} />
        <Tooltip title="Zoom">
          <IconButton onClick={onZoom} aria-label="Zoom explanation image" size="small" sx={{ position: "absolute", top: 8, right: 8, background: "var(--raised)", border: "1px solid var(--line-strong)", "&:hover": { background: "var(--hover)" } }}>
            <ZoomInRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <FigCaption n={n}>
        {TECH[r.technique]?.label} for test sample #{r.sample_index}, {r.model} on {DATASET_META[r.dataset]?.label}. Rendered by the backend.
      </FigCaption>
      <Box
        sx={{
          mt: 1.5,
          display: "grid",
          gridTemplateColumns: narrow ? "1fr 1fr" : { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
          gap: "1px",
          background: "var(--line)",
          border: "1px solid var(--line)",
          borderRadius: "6px",
          overflow: "hidden",
        }}
      >
        {[
          ["True label", className(r.dataset, r.true_label), `class ${r.true_label}`],
          ["Predicted", className(r.dataset, r.predicted_label), `class ${r.predicted_label}`],
          ["Explained class", className(r.dataset, r.target_class), `class ${r.target_class}`],
        ].map(([k, v, sub]) => (
          <Box key={k} sx={{ p: 1.5, background: "var(--raised)", minWidth: 0 }}>
            <Typography sx={{ fontSize: "0.74rem", color: "var(--ink-3)" }}>{k}</Typography>
            <Typography noWrap title={v} sx={{ fontWeight: 600, fontSize: "0.92rem" }}>
              {v}
            </Typography>
            <Typography className="mh-mono" sx={{ fontSize: "0.68rem", color: "var(--ink-3)" }}>
              {sub}
            </Typography>
          </Box>
        ))}
        <Box sx={{ p: 1.5, background: "var(--raised)", minWidth: 0 }}>
          <Typography sx={{ fontSize: "0.74rem", color: "var(--ink-3)" }}>Confidence</Typography>
          <Typography className="mh-display mh-tabular" sx={{ fontWeight: 600, fontSize: "0.92rem" }}>
            <AnimatedNumber value={conf} decimals={1} suffix="%" />
          </Typography>
          <Typography noWrap sx={{ display: "flex", alignItems: "center", gap: 0.4, fontSize: "0.72rem", fontWeight: 600, color: correct ? "var(--status-strong-text)" : "var(--status-weak-text)" }}>
            {correct ? <CheckRoundedIcon sx={{ fontSize: 13 }} /> : <CloseIcon sx={{ fontSize: 13 }} />}
            {correct ? "Correct" : "Misclassified"}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function Explainability() {
  const { notify } = useToast();
  const { data: datasets } = useApiGet("/datasets", (r) => r.data?.datasets || []);
  const compatible = useMemo(() => (datasets?.length ? Object.fromEntries(datasets.map((d) => [d.name, d.compatible_models])) : COMPATIBLE), [datasets]);

  const [dataset, setDataset] = useState("mnist");
  const [model, setModel] = useState("cnn");
  const [technique, setTechnique] = useState("gradcam");
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [err, setErr] = useState(null);
  const [results, setResults] = useState([]);
  const [compare, setCompare] = useState(null);
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    const models = compatible[dataset] || [];
    if (!models.includes(model)) setModel(models[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, compatible]);

  const request = async (tech) => {
    const r = await apiPost("/explainability", { model_name: model, dataset_name: dataset, technique: tech, sample_index: Number(idx) });
    return { ...r.data, technique: tech, dataset, model, src: `data:image/png;base64,${r.data.image_base64}`, key: `${Date.now()}-${tech}` };
  };

  const run = async () => {
    setLoading(true);
    setStartedAt(Date.now());
    setErr(null);
    setCompare(null);
    try {
      const res = await request(technique);
      setResults((rs) => [res, ...rs].slice(0, 12));
      notify(`${TECH[technique].label} explanation generated`, "success");
    } catch (e) {
      const detail = errorMessage(e);
      setErr(detail);
      notify(`Explanation failed: ${detail}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const runCompare = async () => {
    setLoading(true);
    setStartedAt(Date.now());
    setErr(null);
    try {
      const g = await request("gradcam");
      const s = await request("shap");
      setCompare({ gradcam: g, shap: s });
      setResults((rs) => [s, g, ...rs].slice(0, 12));
      notify("GradCAM and SHAP generated", "success");
    } catch (e) {
      const detail = errorMessage(e);
      setErr(detail);
      notify(`Explanation failed: ${detail}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const current = results[0];
  const stepBtn = { border: "1px solid var(--line-strong)", width: 40, height: 40 };

  return (
    <Box>
      <PageHeader
        section="Analysis"
        title="Explainability"
        subtitle="Why did the model decide what it did? The backend renders a heatmap over a real test-set sample."
        onRefresh={() => {
          setResults([]);
          setCompare(null);
          setErr(null);
        }}
      />
      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={4}>
          <Panel title="Configuration" caption="POST /api/explainability">
            <ChoiceCards
              label="Dataset"
              layoutId="xai-dataset"
              dense
              columns={1}
              value={dataset}
              onChange={setDataset}
              disabled={loading}
              options={Object.keys(compatible).map((d) => ({
                value: d,
                label: DATASET_META[d]?.label || d,
                badge: DATASET_META[d]?.shape,
                visual: <Box component="img" src={sampleThumb(sampleById(DATASET_SAMPLE[d] || "stop"), 48)} alt="" sx={{ width: 24, height: 24, borderRadius: "3px", display: "block" }} />,
              }))}
            />
            <FieldLabel sx={{ mt: 2 }}>Model</FieldLabel>
            <Segmented layoutId="xai-model" ariaLabel="Model" value={model} onChange={(v) => !loading && setModel(v)} options={(compatible[dataset] || []).map((m) => ({ value: m, label: MODEL_META[m]?.label || m }))} />
            <FieldLabel sx={{ mt: 2 }}>Technique</FieldLabel>
            <Segmented layoutId="xai-tech" ariaLabel="Technique" value={technique} onChange={setTechnique} options={Object.entries(TECH).map(([k, v]) => ({ value: k, label: v.label }))} />
            <Typography sx={{ fontSize: "0.82rem", color: "var(--ink-2)", mt: 1 }}>{TECH[technique].blurb}</Typography>

            <FieldLabel htmlFor="sample-index" sx={{ mt: 2 }}>
              Test sample index
            </FieldLabel>
            <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
              <IconButton aria-label="Previous sample" onClick={() => setIdx((i) => Math.max(0, Number(i) - 1))} disabled={loading} sx={stepBtn}>
                <RemoveRoundedIcon fontSize="small" />
              </IconButton>
              <TextField
                id="sample-index"
                type="number"
                size="small"
                value={idx}
                onChange={(e) => setIdx(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                disabled={loading}
                inputProps={{ min: 0, inputMode: "numeric", style: { textAlign: "center" } }}
                sx={{ flex: 1 }}
              />
              <IconButton aria-label="Next sample" onClick={() => setIdx((i) => Number(i) + 1)} disabled={loading} sx={stepBtn}>
                <AddRoundedIcon fontSize="small" />
              </IconButton>
              <Tooltip title="Random sample (0–999)">
                <IconButton aria-label="Random sample" onClick={() => setIdx(Math.floor(Math.random() * 1000))} disabled={loading} sx={stepBtn}>
                  <ShuffleRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Button variant="contained" size="large" fullWidth onClick={run} disabled={loading || idx === ""} startIcon={<AutoFixHighOutlinedIcon />} sx={{ mt: 2.5 }}>
              {loading ? "Generating…" : `Generate ${TECH[technique].label}`}
            </Button>
            <Button variant="outlined" fullWidth onClick={runCompare} disabled={loading || idx === ""} startIcon={<CompareOutlinedIcon />} sx={{ mt: 1 }}>
              Compare GradCAM and SHAP
            </Button>
            {err && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {err}
              </Alert>
            )}
          </Panel>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Panel
            title={compare ? "GradCAM and SHAP, side by side" : current ? `${TECH[current.technique].label}, sample #${current.sample_index}` : "Output"}
            sx={{ minHeight: 460 }}
            actions={
              current && !loading ? (
                <Tooltip title="Download PNG">
                  <IconButton component="a" href={current.src} download={`${current.technique}_${current.model}_${current.dataset}_${current.sample_index}.png`} aria-label="Download explanation PNG" size="small">
                    <FileDownloadOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null
            }
          >
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Box sx={{ py: 4, maxWidth: 480, mx: "auto" }}>
                    <RunningIndicator since={startedAt} label="Computing attributions" detail={`${model} on ${dataset}, sample #${idx}.`} />
                  </Box>
                </motion.div>
              ) : compare ? (
                <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Grid container spacing={2.5}>
                    {["gradcam", "shap"].map((tt, i) => (
                      <Grid item xs={12} md={6} key={tt}>
                        <ResultPanel r={compare[tt]} onZoom={() => setZoom(compare[tt])} n={i + 1} narrow />
                      </Grid>
                    ))}
                  </Grid>
                </motion.div>
              ) : current ? (
                <motion.div key={current.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <ResultPanel r={current} onZoom={() => setZoom(current)} n={1} />
                </motion.div>
              ) : (
                <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <EmptyState icon={<InsightsOutlinedIcon />} title="No explanation yet" text="Choose a dataset, model and sample, then generate. You'll see the image beside its heatmap, with true and predicted labels and the model's confidence." />
                </motion.div>
              )}
            </AnimatePresence>

            {results.length > 1 && !loading && (
              <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid var(--line)" }}>
                <FieldLabel>Earlier in this session</FieldLabel>
                <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 1 }}>
                  {results.map((r, i) => (
                    <Box
                      key={r.key}
                      component="button"
                      type="button"
                      onClick={() => {
                        setCompare(null);
                        setResults((rs) => [r, ...rs.filter((x) => x.key !== r.key)]);
                      }}
                      aria-label={`Show ${TECH[r.technique].label} for ${r.model}/${r.dataset} sample ${r.sample_index}`}
                      sx={{
                        all: "unset",
                        cursor: "pointer",
                        flex: "0 0 auto",
                        width: 128,
                        borderRadius: "6px",
                        overflow: "hidden",
                        outline: i === 0 && !compare ? "2px solid var(--ink)" : "1px solid var(--line-strong)",
                        outlineOffset: i === 0 && !compare ? 1 : -1,
                        background: "var(--raised)",
                        "&:focus-visible": { outline: "2px solid var(--blue)", outlineOffset: 2 },
                      }}
                    >
                      <Box component="img" src={r.src} alt="" sx={{ width: "100%", display: "block", background: "#fff" }} />
                      <Typography className="mh-mono" noWrap sx={{ fontSize: "0.64rem", px: 0.75, py: 0.4, color: "var(--ink-2)" }}>
                        {r.technique} · {r.model} · #{r.sample_index}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Panel>
        </Grid>
      </Grid>

      <Dialog open={!!zoom} onClose={() => setZoom(null)} maxWidth="lg" fullWidth aria-label="Zoomed explanation">
        {zoom && (
          <Box sx={{ position: "relative", p: 2 }}>
            <IconButton onClick={() => setZoom(null)} aria-label="Close" sx={{ position: "absolute", top: 12, right: 12, zIndex: 1, background: "var(--raised)", border: "1px solid var(--line-strong)" }}>
              <CloseRoundedIcon />
            </IconButton>
            <Box component="img" src={zoom.src} alt="Zoomed explanation" sx={{ width: "100%", display: "block", borderRadius: "6px", background: "#fff" }} />
            <FigCaption>
              {TECH[zoom.technique].label} · {zoom.model}/{zoom.dataset} · sample #{zoom.sample_index} · predicted {className(zoom.dataset, zoom.predicted_label)} ({(zoom.confidence * 100).toFixed(1)}%)
            </FigCaption>
          </Box>
        )}
      </Dialog>
    </Box>
  );
}

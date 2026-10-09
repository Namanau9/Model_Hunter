import React, { useMemo, useState } from "react";
import { Box, Button, Grid, Skeleton, Slider, TextField, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import ModelTrainingOutlinedIcon from "@mui/icons-material/ModelTrainingOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import PageHeader from "../components/ui/PageHeader";
import Panel, { FieldLabel } from "../components/ui/Panel";
import ChoiceCards from "../components/ui/ChoiceCards";
import Segmented from "../components/ui/Segmented";
import StatusPill from "../components/ui/StatusPill";
import EmptyState from "../components/ui/EmptyState";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import RunningIndicator from "../components/viz/RunningIndicator";
import { useToast } from "../contexts/ToastContext";
import { apiPost, apiUpload } from "../api/client";
import useApiGet from "../hooks/useApiGet";
import { errorMessage } from "../lib/errors";
import { COMPATIBLE, DATASET_META, MODEL_META } from "../lib/constants";
import { bytes } from "../lib/format";
import { useMotionOff } from "../contexts/UiPrefsContext";

const EMPTY = [];

/** Layer-stack sketch; bar count hints at network depth. Animates while training. */
function LayerStack({ name, active }) {
  const motionOff = useMotionOff();
  const depth = MODEL_META[name]?.depth || 8;
  const bars = Math.min(14, Math.max(5, Math.round(Math.log2(depth) * 3)));
  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", gap: "3px", height: 36 }} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const h = 30 + 70 * Math.abs(Math.sin((i + 1) * 1.7 + name.length));
        return (
          <Box
            key={i}
            component={motion.span}
            animate={active && !motionOff ? { height: [`${h}%`, `${Math.max(20, h - 35)}%`, `${h}%`] } : { height: `${h}%` }}
            transition={{ duration: 1.4, repeat: active ? Infinity : 0, delay: i * 0.07, ease: "easeInOut" }}
            sx={{ width: 5, borderRadius: "1px", background: i === bars - 1 ? "var(--ink)" : "var(--ink-3)" }}
          />
        );
      })}
    </Box>
  );
}

function ModelCard({ m }) {
  const meta = MODEL_META[m.name] || {};
  return (
    <Panel lift sx={{ height: "100%" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: "1.15rem", fontWeight: 600 }}>{meta.label || m.name}</Typography>
          <Typography className="mh-mono" sx={{ fontSize: "0.72rem", color: "var(--ink-3)" }}>
            {m.name} · {m.source || "builtin"}
          </Typography>
        </Box>
        <StatusPill tone={m.available ? "ok" : "warn"}>{m.available ? "Ready" : "Not trained"}</StatusPill>
      </Box>
      <Typography sx={{ mt: 1.25, fontSize: "0.86rem", color: "var(--ink-2)", minHeight: 40 }}>{m.description || meta.blurb}</Typography>
      <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", mt: 1.5, pb: 1.5, borderBottom: "1px solid var(--line)" }}>
        <LayerStack name={m.name} active={false} />
        <Box sx={{ textAlign: "right" }}>
          <Typography sx={{ fontSize: "0.72rem", color: "var(--ink-3)" }}>parameters</Typography>
          <Typography className="mh-mono" sx={{ fontWeight: 600 }}>
            {meta.params || "—"}
          </Typography>
        </Box>
      </Box>
      <FieldLabel sx={{ mt: 1.5 }}>Checkpoints</FieldLabel>
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
        {(m.datasets || []).map((d) => {
          const has = m.checkpoints?.includes(d);
          return (
            <Box
              key={d}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: 0.9,
                py: 0.3,
                borderRadius: "4px",
                fontSize: "0.76rem",
                fontWeight: 500,
                color: has ? "var(--ink)" : "var(--ink-3)",
                border: `1px ${has ? "solid" : "dashed"} var(--line-strong)`,
              }}
            >
              {has && <CheckRoundedIcon sx={{ fontSize: 14, color: "var(--status-strong-text)" }} />}
              {DATASET_META[d]?.label || d}
              <span className="mh-visually-hidden">{has ? "checkpoint saved" : "no checkpoint"}</span>
            </Box>
          );
        })}
      </Box>
    </Panel>
  );
}

export default function Models() {
  const { notify } = useToast();
  const { data, loading, error, reload } = useApiGet("/models", (r) => ({ models: r.data.models || [], uploads: r.data.uploads || [] }));
  const models = data?.models || EMPTY;
  const uploads = data?.uploads || EMPTY;
  const compatible = useMemo(() => {
    if (!models.length) return COMPATIBLE;
    const out = {};
    models.forEach((m) => (m.datasets || []).forEach((d) => (out[d] = [...(out[d] || []), m.name])));
    return Object.keys(out).length ? out : COMPATIBLE;
  }, [models]);

  const [dataset, setDataset] = useState("mnist");
  const [model, setModel] = useState("cnn");
  const [epochs, setEpochs] = useState(1);
  const [training, setTraining] = useState(false);
  const [trainStart, setTrainStart] = useState(null);
  const [trainResult, setTrainResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const pickDataset = (d) => {
    setDataset(d);
    setModel((compatible[d] || [])[0]);
  };

  const train = async () => {
    setTraining(true);
    setTrainStart(Date.now());
    setTrainResult(null);
    try {
      const r = await apiPost("/models/train", { model_name: model, dataset_name: dataset, epochs, batch_size: 64 });
      setTrainResult(r.data);
      notify(`Trained ${model} on ${dataset}: test accuracy ${r.data.test_accuracy}%`, "success");
      await reload();
    } catch (e) {
      notify(`Training failed: ${errorMessage(e)}`, "error");
    } finally {
      setTraining(false);
    }
  };

  const doUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      await apiUpload("/models/upload", file);
      await reload();
      notify(`Uploaded ${file.name}`, "success");
    } catch (e) {
      notify(`Upload failed: ${errorMessage(e)}`, "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <PageHeader section="Assets" title="Models" subtitle="Architectures in the registry, their saved checkpoints, training and checkpoint upload." onRefresh={reload} />

      {error && !data && (
        <Panel sx={{ mb: 2.5 }}>
          <EmptyState compact icon={<CloudOffOutlinedIcon />} tone="var(--status-weak-text)" title="Couldn't load the model registry" text={error} action={<Button variant="outlined" onClick={reload}>Retry</Button>} />
        </Panel>
      )}

      <Grid container spacing={2.5}>
        {loading && !data
          ? [0, 1, 2].map((i) => (
              <Grid item xs={12} md={4} key={i}>
                <Skeleton variant="rounded" height={270} />
              </Grid>
            ))
          : models.map((m) => (
              <Grid item xs={12} md={4} key={m.name}>
                <ModelCard m={m} />
              </Grid>
            ))}

        <Grid item xs={12} lg={7}>
          <Panel title="Train a checkpoint" caption="POST /api/models/train · batch_size=64" sx={{ height: "100%" }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <ChoiceCards
                  label="Dataset"
                  layoutId="train-dataset"
                  dense
                  columns={1}
                  value={dataset}
                  onChange={pickDataset}
                  disabled={training}
                  options={Object.keys(compatible).map((d) => ({ value: d, label: DATASET_META[d]?.label || d, badge: DATASET_META[d]?.shape }))}
                />
                <FieldLabel sx={{ mt: 2 }}>Architecture</FieldLabel>
                <Segmented layoutId="train-model" ariaLabel="Model architecture" value={model} onChange={(v) => !training && setModel(v)} options={(compatible[dataset] || []).map((mm) => ({ value: mm, label: MODEL_META[mm]?.label || mm }))} />
                <FieldLabel htmlFor="epochs" sx={{ mt: 2 }}>
                  Epochs
                </FieldLabel>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <Slider aria-label="Epochs" value={epochs} min={1} max={20} step={1} onChange={(_, v) => setEpochs(v)} disabled={training} sx={{ flex: 1 }} />
                  <TextField id="epochs" type="number" size="small" value={epochs} onChange={(e) => setEpochs(Math.max(1, Number(e.target.value) || 1))} disabled={training} inputProps={{ min: 1, inputMode: "numeric" }} sx={{ width: 80 }} />
                </Box>
                <Button variant="contained" size="large" fullWidth onClick={train} disabled={training || !model} startIcon={<ModelTrainingOutlinedIcon />} sx={{ mt: 1.5 }}>
                  {training ? "Training…" : `Train ${MODEL_META[model]?.label || model}`}
                </Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ height: "100%", minHeight: 240, borderRadius: "8px", border: "1px solid var(--line)", background: "var(--sunken)", display: "flex", alignItems: "center", p: 2.5 }}>
                  <AnimatePresence mode="wait">
                    {training ? (
                      <motion.div key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: "100%" }}>
                        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                          <LayerStack name={model} active />
                        </Box>
                        <RunningIndicator since={trainStart} label="Training" detail={`${model} on ${dataset}, ${epochs} epoch${epochs > 1 ? "s" : ""}.`} />
                      </motion.div>
                    ) : trainResult ? (
                      <motion.div key="r" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ width: "100%" }}>
                        <Typography sx={{ fontSize: "0.82rem", color: "var(--status-strong-text)", fontWeight: 600 }}>Checkpoint saved</Typography>
                        <Typography className="mh-display mh-tabular" sx={{ fontSize: "2.6rem", fontWeight: 600, lineHeight: 1.1, mt: 0.5 }}>
                          <AnimatedNumber value={trainResult.test_accuracy} decimals={2} suffix="%" />
                        </Typography>
                        <Typography sx={{ color: "var(--ink-2)", fontSize: "0.85rem" }}>test accuracy</Typography>
                        <Box sx={{ mt: 2, borderTop: "1px solid var(--line)" }}>
                          {[
                            ["epochs", trainResult.epochs],
                            ["steps", trainResult.steps],
                            ["checkpoint", trainResult.checkpoint],
                          ].map(([k, v]) => (
                            <Box key={k} sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.6, borderBottom: "1px solid var(--line)" }}>
                              <Typography sx={{ fontSize: "0.8rem", color: "var(--ink-2)" }}>{k}</Typography>
                              <Typography className="mh-mono" noWrap title={String(v)} sx={{ fontSize: "0.8rem", minWidth: 0 }}>
                                {v}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </motion.div>
                    ) : (
                      <motion.div key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: "100%" }}>
                        <EmptyState compact icon={<ModelTrainingOutlinedIcon />} title="No training run yet" text="Training runs on the backend's device (CUDA, then MPS, then CPU) and saves a checkpoint that evaluations will use." />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Box>
              </Grid>
            </Grid>
          </Panel>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Panel title="Upload weights" caption="POST /api/models/upload" sx={{ height: "100%" }}>
            <Box
              component="label"
              htmlFor="upload-model"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                doUpload(e.dataTransfer.files?.[0]);
              }}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: 0.75,
                minHeight: 160,
                p: 3,
                borderRadius: "8px",
                cursor: uploading ? "progress" : "pointer",
                border: `1px dashed ${dragOver ? "var(--blue)" : "var(--line-strong)"}`,
                background: dragOver ? "var(--hover)" : "var(--sunken)",
                "&:hover": { borderColor: "var(--ink-3)" },
                "&:focus-within": { outline: "2px solid var(--blue)", outlineOffset: 2 },
              }}
            >
              <input
                id="upload-model"
                type="file"
                accept=".pth,.pt,.ckpt"
                hidden
                disabled={uploading}
                onChange={(e) => {
                  doUpload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <Box component={motion.div} animate={uploading ? { y: [0, -4, 0] } : { y: 0 }} transition={{ duration: 0.8, repeat: uploading ? Infinity : 0 }} sx={{ color: "var(--ink-2)" }}>
                <CloudUploadOutlinedIcon sx={{ fontSize: 32 }} />
              </Box>
              <Typography sx={{ fontWeight: 600, fontSize: "0.92rem" }}>{uploading ? "Uploading…" : "Drop a checkpoint, or click to browse"}</Typography>
              <Typography className="mh-mono" sx={{ fontSize: "0.72rem", color: "var(--ink-3)" }}>
                .pth · .pt · .ckpt, validated on the server
              </Typography>
            </Box>
            <FieldLabel sx={{ mt: 2.5 }}>Stored uploads ({uploads.length})</FieldLabel>
            {uploads.length === 0 ? (
              <Typography sx={{ color: "var(--ink-2)", fontSize: "0.86rem" }}>No uploaded checkpoints yet.</Typography>
            ) : (
              <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, borderTop: "1px solid var(--line)" }}>
                {uploads.map((u) => (
                  <Box component="li" key={u.name} sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 1, borderBottom: "1px solid var(--line)" }}>
                    <InsertDriveFileOutlinedIcon sx={{ color: "var(--ink-3)", fontSize: 18 }} aria-hidden />
                    <Typography className="mh-mono" noWrap sx={{ flex: 1, fontSize: "0.82rem" }}>
                      {u.name}
                    </Typography>
                    <Typography className="mh-mono" sx={{ fontSize: "0.76rem", color: "var(--ink-3)" }}>
                      {bytes(u.size_bytes)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
}

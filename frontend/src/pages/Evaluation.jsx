import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Grid, Slider, TextField, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { Link as RouterLink } from "react-router-dom";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import PageHeader from "../components/ui/PageHeader";
import Panel, { FieldLabel, FigCaption } from "../components/ui/Panel";
import ChoiceCards from "../components/ui/ChoiceCards";
import Segmented from "../components/ui/Segmented";
import RobustnessRing from "../components/ui/RobustnessRing";
import StatTile from "../components/ui/StatTile";
import DownloadButtons from "../components/ui/DownloadButtons";
import RunningIndicator from "../components/viz/RunningIndicator";
import PipelineFlow from "../components/viz/PipelineFlow";
import PerturbationPreview from "../components/adversarial/PerturbationPreview";
import { useToast } from "../contexts/ToastContext";
import { useApp } from "../contexts/AppContext";
import { apiPost } from "../api/client";
import useApiGet from "../hooks/useApiGet";
import { errorMessage } from "../lib/errors";
import { COMPATIBLE, ATTACK_IDS, ATTACK_META, DEFENSE_IDS, DEFENSE_META, DATASET_META, MODEL_META } from "../lib/constants";
import { sampleThumb, sampleById, DATASET_SAMPLE } from "../lib/adversarial/samples";
import { seconds } from "../lib/format";

function AccuracyCollapse({ clean, adv }) {
  const bars = [
    { label: "Clean accuracy", value: clean, color: "var(--series-1)" },
    { label: "Adversarial accuracy", value: adv, color: "var(--series-2)" },
  ];
  return (
    <Box role="img" aria-label={`Clean accuracy ${clean?.toFixed(1)}%, adversarial accuracy ${adv?.toFixed(1)}%`}>
      {bars.map((b, i) => (
        <Box key={b.label} sx={{ mb: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 9, height: 9, borderRadius: "2px", background: b.color }} aria-hidden />
              <Typography sx={{ fontSize: "0.84rem", color: "var(--ink-2)" }}>{b.label}</Typography>
            </Box>
            <Typography className="mh-mono" sx={{ fontSize: "0.86rem", fontWeight: 600 }}>
              {b.value?.toFixed(2)}%
            </Typography>
          </Box>
          <Box sx={{ height: 12, borderRadius: "2px", background: "var(--sunken)", overflow: "hidden" }}>
            <Box
              component={motion.div}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, Math.min(100, b.value || 0))}%` }}
              transition={{ duration: 1, delay: 0.15 + i * 0.2, ease: [0.22, 1, 0.36, 1] }}
              sx={{ height: "100%", background: b.color }}
            />
          </Box>
        </Box>
      ))}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "var(--status-weak-text)" }}>
        <TrendingDownRoundedIcon fontSize="small" aria-hidden />
        <Typography className="mh-mono" sx={{ fontSize: "0.84rem" }}>
          −{((clean || 0) - (adv || 0)).toFixed(2)} points under attack
        </Typography>
      </Box>
    </Box>
  );
}

function ScoreBreakdown({ m }) {
  // Mirrors backend robustness_score(): 0.4·adv + 0.3·(100−ASR) + 0.3·max(100−conf_shift, 0)
  const parts = [
    { label: "0.4 × adversarial accuracy", value: 0.4 * m.adversarial_accuracy, color: "var(--series-1)" },
    { label: "0.3 × (100 − attack success)", value: 0.3 * (100 - m.attack_success_rate), color: "var(--series-2)" },
    { label: "0.3 × retained confidence", value: 0.3 * Math.max(100 - m.confidence_shift, 0), color: "var(--series-3)" },
  ];
  return (
    <Box>
      <Box sx={{ display: "flex", height: 14, borderRadius: "2px", overflow: "hidden", gap: "2px", background: "var(--sunken)" }} role="img" aria-label="Robustness score composition">
        {parts.map((p, i) => (
          <Box key={p.label} component={motion.div} initial={{ width: 0 }} animate={{ width: `${Math.max(0, p.value)}%` }} transition={{ duration: 0.8, delay: 0.25 + i * 0.12, ease: [0.22, 1, 0.36, 1] }} sx={{ background: p.color, height: "100%" }} />
        ))}
      </Box>
      <Box sx={{ mt: 1.5, display: "grid", gap: 0.5 }}>
        {parts.map((p) => (
          <Box key={p.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 9, height: 9, borderRadius: "2px", background: p.color }} aria-hidden />
              <Typography sx={{ fontSize: "0.82rem", color: "var(--ink-2)" }}>{p.label}</Typography>
            </Box>
            <Typography className="mh-mono" sx={{ fontSize: "0.84rem", fontWeight: 600 }}>
              {p.value.toFixed(2)}
            </Typography>
          </Box>
        ))}
        <Box sx={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", pt: 0.75, mt: 0.25 }}>
          <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>Robustness score</Typography>
          <Typography className="mh-mono" sx={{ fontSize: "0.84rem", fontWeight: 600 }}>
            {m.robustness_score.toFixed(2)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function Evaluation() {
  const { notify } = useToast();
  const { info } = useApp();
  const { data: datasets } = useApiGet("/datasets", (r) => r.data?.datasets || []);
  const compatible = useMemo(() => (datasets?.length ? Object.fromEntries(datasets.map((d) => [d.name, d.compatible_models])) : COMPATIBLE), [datasets]);
  const datasetIds = Object.keys(compatible);
  const attackIds = info?.attacks?.length ? info.attacks : ATTACK_IDS;
  const defenseIds = info?.defenses?.length ? ["none", ...info.defenses] : DEFENSE_IDS;

  const [dataset, setDataset] = useState("mnist");
  const [model, setModel] = useState("cnn");
  const [attack, setAttack] = useState("fgsm");
  const [defense, setDefense] = useState("none");
  const [epsilon, setEpsilon] = useState(0.1);
  const [samples, setSamples] = useState(100);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    const models = compatible[dataset] || [];
    if (!models.includes(model)) setModel(models[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, compatible]);

  const epsInvalid = epsilon === "" || Number.isNaN(Number(epsilon)) || Number(epsilon) < 0;
  const samplesInvalid = samples === "" || !Number.isInteger(Number(samples)) || Number(samples) < 1;

  const reset = () => {
    setErr(null);
    setResult(null);
  };

  const run = async () => {
    if (epsInvalid || samplesInvalid) return;
    setRunning(true);
    setStartedAt(Date.now());
    setErr(null);
    setResult(null);
    try {
      const r = await apiPost("/evaluation/run", {
        model_name: model,
        dataset_name: dataset,
        attack_name: attack,
        defense_name: defense === "none" ? null : defense,
        attack_params: { epsilon: Number(epsilon), steps: 8, max_iterations: 4 },
        sample_limit: Number(samples),
        batch_size: 64,
      });
      setResult(r.data);
      notify(`Evaluation complete: robustness ${r.data.metrics.robustness_score.toFixed(1)} (${r.data.metrics.robustness_class})`, "success");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } catch (e) {
      const detail = errorMessage(e);
      setErr(detail);
      notify(`Evaluation failed: ${detail}`, "error");
    } finally {
      setRunning(false);
    }
  };

  const m = result?.metrics;

  return (
    <Box>
      <PageHeader section="Operations" title="Evaluation" subtitle="Choose a model, an attack and an optional defense. The backend runs the full pipeline and returns measured security metrics." onRefresh={reset} />

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={5}>
          <Panel title="Run configuration" caption="POST /api/evaluation/run">
            <ChoiceCards
              label="Dataset"
              layoutId="eval-dataset"
              columns={{ xs: 1, sm: 3 }}
              vertical
              value={dataset}
              onChange={setDataset}
              disabled={running}
              options={datasetIds.map((d) => ({
                value: d,
                label: DATASET_META[d]?.label || d,
                description: DATASET_META[d]?.shape,
                visual: <Box component="img" src={sampleThumb(sampleById(DATASET_SAMPLE[d] || "stop"), 64)} alt="" sx={{ width: 32, height: 32, borderRadius: "4px", display: "block", border: "1px solid var(--line)" }} />,
              }))}
            />

            <Box sx={{ mt: 2.5 }}>
              <FieldLabel>Model</FieldLabel>
              <Segmented layoutId="eval-model" ariaLabel="Model" value={model} onChange={(v) => !running && setModel(v)} options={(compatible[dataset] || []).map((mm) => ({ value: mm, label: MODEL_META[mm]?.label || mm }))} />
            </Box>

            <Box sx={{ mt: 2.5 }}>
              <ChoiceCards
                label="Attack"
                layoutId="eval-attack"
                dense
                columns={{ xs: 2, sm: 3 }}
                value={attack}
                onChange={setAttack}
                disabled={running}
                options={attackIds.map((a) => ({ value: a, label: ATTACK_META[a]?.label || a.toUpperCase() }))}
              />
              <Typography sx={{ fontSize: "0.8rem", color: "var(--ink-2)", mt: 1 }}>
                {ATTACK_META[attack]?.name} ({ATTACK_META[attack]?.access.toLowerCase()}, {ATTACK_META[attack]?.norm}): {ATTACK_META[attack]?.blurb}
              </Typography>
            </Box>

            <Box sx={{ mt: 2.5 }}>
              <ChoiceCards
                label="Defense"
                layoutId="eval-defense"
                dense
                columns={{ xs: 1, sm: 2 }}
                value={defense}
                onChange={setDefense}
                disabled={running}
                accent="var(--green)"
                options={defenseIds.map((d) => ({ value: d, label: DEFENSE_META[d]?.label || d }))}
              />
            </Box>

            <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <FieldLabel htmlFor="eps-input">Epsilon ε</FieldLabel>
                <Slider aria-label="Epsilon" value={Number(epsilon) || 0} min={0} max={0.5} step={0.01} onChange={(_, v) => setEpsilon(v)} disabled={running} />
                <TextField
                  id="eps-input"
                  type="number"
                  size="small"
                  fullWidth
                  value={epsilon}
                  onChange={(e) => setEpsilon(e.target.value)}
                  disabled={running}
                  error={epsInvalid}
                  helperText={epsInvalid ? "ε must be a number ≥ 0" : "L∞ budget, pixel scale 0–1"}
                  inputProps={{ step: 0.01, min: 0, inputMode: "decimal" }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FieldLabel htmlFor="samples-input">Sample limit</FieldLabel>
                <Slider aria-label="Sample limit" value={Math.min(2000, Number(samples) || 1)} min={10} max={2000} step={10} onChange={(_, v) => setSamples(v)} disabled={running} />
                <TextField
                  id="samples-input"
                  type="number"
                  size="small"
                  fullWidth
                  value={samples}
                  onChange={(e) => setSamples(e.target.value)}
                  disabled={running}
                  error={samplesInvalid}
                  helperText={samplesInvalid ? "Whole number ≥ 1" : "Test images to attack"}
                  inputProps={{ step: 10, min: 1, inputMode: "numeric" }}
                />
              </Grid>
            </Grid>

            <Button variant="contained" size="large" fullWidth onClick={run} disabled={running || epsInvalid || samplesInvalid} startIcon={<PlayArrowRoundedIcon />} sx={{ mt: 2.5 }}>
              {running ? "Running…" : "Run evaluation"}
            </Button>
            <Typography className="mh-mono" sx={{ mt: 1, fontSize: "0.7rem", color: "var(--ink-3)", textAlign: "center" }}>
              steps=8 · max_iterations=4 · batch_size=64
            </Typography>
            <AnimatePresence>
              {err && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Alert
                    severity="error"
                    sx={{ mt: 2 }}
                    action={
                      <Button color="inherit" size="small" onClick={run} startIcon={<ReplayRoundedIcon />}>
                        Retry
                      </Button>
                    }
                  >
                    {err}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>
        </Grid>

        <Grid item xs={12} lg={7} ref={resultsRef} sx={{ scrollMarginTop: 80 }}>
          <AnimatePresence mode="wait">
            {running ? (
              <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Panel title="Evaluation running" caption={`${model}/${dataset} · ${attack.toUpperCase()} ε=${Number(epsilon)} · ${samples} samples${defense !== "none" ? ` · ${DEFENSE_META[defense]?.label}` : ""}`}>
                  <RunningIndicator since={startedAt} label="Waiting for the backend" detail="The backend runs every stage in one request and replies when it finishes. Larger sample limits and black-box attacks take longer." />
                  <Box sx={{ mt: 3 }}>
                    <PipelineFlow
                      active
                      compact
                      steps={[
                        { label: "Load model", sub: model },
                        { label: "Load data", sub: dataset },
                        { label: "Defense", sub: defense === "none" ? "none" : DEFENSE_META[defense]?.short },
                        { label: "Attack", sub: attack.toUpperCase() },
                        { label: "Metrics", sub: "score" },
                        { label: "Reports", sub: "pdf · html · csv" },
                      ]}
                    />
                  </Box>
                </Panel>
              </motion.div>
            ) : m ? (
              <motion.div key={`r-${result.evaluation_id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.32 }}>
                <Panel
                  title={`Results · evaluation #${result.evaluation_id}`}
                  caption={`${result.model}/${result.dataset} · ${result.attack.toUpperCase()}${result.defense !== "none" ? ` + ${result.defense}` : ""} · ${m.n_samples} samples · ${seconds(result.total_time)}`}
                  actions={<DownloadButtons id={result.evaluation_id} name={`evaluation_${result.evaluation_id}`} />}
                >
                  <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} sm={5} sx={{ display: "flex", justifyContent: "center" }}>
                      <RobustnessRing score={m.robustness_score} klass={m.robustness_class} size={190} />
                    </Grid>
                    <Grid item xs={12} sm={7}>
                      <AccuracyCollapse clean={m.clean_accuracy} adv={m.adversarial_accuracy} />
                    </Grid>
                  </Grid>
                </Panel>

                <Grid container spacing={2} sx={{ mt: 0 }}>
                  {[
                    { label: "Attack success rate", v: m.attack_success_rate, s: "%", d: 1, sub: "clean-correct samples flipped", marker: "var(--accent)" },
                    { label: "Accuracy drop", v: m.accuracy_drop, s: " pts", d: 1, sub: "clean minus adversarial" },
                    { label: "Confidence shift", v: m.confidence_shift, s: " pts", d: 1, sub: "true-class confidence lost" },
                    { label: "Transferability", v: m.transferability_index, s: "%", d: 1, sub: "also fools a second model" },
                    { label: "Attack time", v: m.execution_time, s: " s", d: 2, sub: "metric computation" },
                    { label: "Samples", v: m.n_samples, s: "", d: 0, sub: "evaluated" },
                  ].map((tt) => (
                    <Grid item xs={6} md={4} key={tt.label}>
                      <StatTile label={tt.label} value={tt.v} suffix={tt.s} decimals={tt.d} sub={tt.sub} marker={tt.marker} />
                    </Grid>
                  ))}
                </Grid>

                <Grid container spacing={2} sx={{ mt: 0 }}>
                  <Grid item xs={12} md={6}>
                    <Panel title="How the score is made" caption="same formula as the backend" sx={{ height: "100%" }}>
                      <ScoreBreakdown m={m} />
                    </Panel>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Panel title="What this ε looks like" sx={{ height: "100%" }}>
                      <PerturbationPreview dataset={result.dataset} attack={result.attack} epsilon={Number(result.parameters?.epsilon ?? epsilon)} showCompare={false} figure={2} />
                    </Panel>
                  </Grid>
                </Grid>
                <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                  <Button variant="outlined" startIcon={<ReplayRoundedIcon />} onClick={run}>
                    Run again
                  </Button>
                  <Button component={RouterLink} to="/reports" endIcon={<ArrowForwardRoundedIcon />}>
                    All reports
                  </Button>
                </Box>
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Panel title="Preview" caption="results appear here after a run">
                  <PerturbationPreview dataset={dataset} attack={attack} epsilon={Number(epsilon) || 0} figure={1} />
                  <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid var(--line)" }}>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>What you'll get</Typography>
                    <FigCaption>
                      A robustness score (0–100) with its class, clean vs adversarial accuracy, attack success rate, confidence shift, transferability, timing, and HTML / CSV / PDF reports.
                    </FigCaption>
                  </Box>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>
        </Grid>
      </Grid>
    </Box>
  );
}

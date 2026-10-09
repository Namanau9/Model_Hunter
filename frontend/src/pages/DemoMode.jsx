import React, { useState } from "react";
import {
  Box,
  Button,
  Grid,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useToast } from "../contexts/ToastContext";
import { apiPost } from "../api/client";
import PageHeader from "../components/ui/PageHeader";
import Panel, { FigCaption } from "../components/ui/Panel";
import RobustnessRing from "../components/ui/RobustnessRing";
import ClassBadge from "../components/ui/ClassBadge";
import { statusVar, statusTextVar } from "../theme/tokens";

const ROBUSTNESS_BANDS = [
  { klass: "Weak", min: 0, max: 30 },
  { klass: "Moderate", min: 30, max: 60 },
  { klass: "Strong", min: 60, max: 100 },
];

function StepCard({ step, data }) {
  const m = data?.result?.metrics;
  const hasResult = !!m;
  const isBaseline = step.step === 1;
  const isAttack = step.step === 2;
  const isDefense = step.step >= 3;

  let color = "var(--blue)";
  let bg = "color-mix(in srgb, var(--blue) 8%, transparent)";
  if (isBaseline) {
    color = "var(--status-strong-text)";
    bg = "color-mix(in srgb, var(--status-strong) 8%, transparent)";
  } else if (isAttack) {
    color = "var(--accent)";
    bg = "color-mix(in srgb, var(--accent) 8%, transparent)";
  } else if (isDefense && hasResult) {
    color = statusTextVar(m.robustness_class);
    bg = `color-mix(in srgb, ${statusVar(m.robustness_class)} 8%, transparent)`;
  }

  return (
    <Box
      sx={{
        p: 2,
        mb: 2,
        borderRadius: "8px",
        border: `1px solid ${color}`,
        backgroundColor: bg,
        position: "relative",
        opacity: step.error ? 0.7 : 1,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box
            component="span"
            className="mh-mono"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: "4px",
              fontWeight: 700,
              fontSize: "0.66rem",
              backgroundColor: color,
              color: "var(--inverse-ink)",
            }}
          >
            {step.step}
          </Box>
          <Typography variant="overline" sx={{ color, fontWeight: 600, textTransform: "none", fontSize: "0.68rem", letterSpacing: "0.04em" }}>
            {step.label}
          </Typography>
        </Box>
        {step.result?.defense && (
          <Box
            component="span"
            className="mh-mono"
            sx={{
              px: 0.9,
              py: 0.25,
              borderRadius: "4px",
              fontSize: "0.68rem",
              fontWeight: 500,
              color: color,
              border: `1px solid ${color}`,
            }}
          >
            {step.result.defense === "none" ? "no defense" : step.result.defense}
          </Box>
        )}
      </Box>
      <Typography variant="caption" color="var(--ink-2)" sx={{ display: "block", mb: 1.5, fontSize: "0.8rem" }}>
        {step.description}
      </Typography>
      {step.error && <Alert severity="error" sx={{ mb: 1.5 }}>{step.error}</Alert>}
      {hasResult && m && (
        <Grid container spacing={2} alignItems="stretch">
          <Grid item xs={12} md={3}>
            <Box sx={{ borderRadius: "8px", p: 1, border: "1px solid var(--line)" }}>
              <RobustnessRing score={m.robustness_score} klass={m.robustness_class} size={130} />
            </Box>
          </Grid>
          <Grid item xs={12} md={9}>
            <Box component="dl" sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", m: 0 }}>
              {["clean_accuracy", "adversarial_accuracy", "attack_success_rate", "robustness_score", "accuracy_drop", "confidence_shift"].map((k) => (
                <Box key={k} sx={{ display: "flex", justifyContent: "space-between", py: 0.6, borderBottom: "1px solid var(--line)" }}>
                  <Typography component="dt" sx={{ fontSize: "0.82rem", color: "var(--ink-2)" }}>
                    {k.replace(/_/g, " ")}
                  </Typography>
                  <Typography component="dd" className="mh-mono" sx={{ m: 0, fontSize: "0.84rem", fontWeight: 500 }}>
                    {typeof m[k] === "number" ? `${m[k].toFixed(1)}%` : String(m[k] ?? "—")}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

function ResultSummary({ steps }) {
  const defenseSteps = steps.filter((s) => s.step >= 3 && s.result);
  if (!defenseSteps.length) return null;

  const best = defenseSteps.reduce((prev, cur) =>
    cur.result.metrics.robustness_score > prev.result.metrics.robustness_score ? cur : prev
  );

  const worst = defenseSteps.reduce((prev, cur) =>
    cur.result.metrics.robustness_score < prev.result.metrics.robustness_score ? cur : prev
  );

  return (
    <Panel title="Best vs Worst Defense" sx={{ mt: 3 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2, borderRadius: "8px", border: "1px solid var(--status-strong-text)", backgroundColor: "color-mix(in srgb, var(--status-strong) 8%, transparent)" }}>
            <Typography variant="overline" sx={{ display: "block", color: "var(--status-strong-text)", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.04em" }}>
              BEST DEFENSE
            </Typography>
            <Typography variant="h6" className="mh-display" sx={{ color: "var(--status-strong-text)" }}>
              {best.label}
            </Typography>
            <Typography sx={{ mt: 1, fontSize: "0.86rem", color: "var(--ink-2)" }}>
              Robustness: {best.result.metrics.robustness_score.toFixed(1)} — {best.result.metrics.robustness_class}
            </Typography>
            <Typography sx={{ fontSize: "0.86rem", color: "var(--ink-2)" }}>
              Adversarial Accuracy: {best.result.metrics.adversarial_accuracy.toFixed(1)}%
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2, borderRadius: "8px", border: "1px solid var(--status-weak-text)", backgroundColor: "color-mix(in srgb, var(--status-weak) 8%, transparent)" }}>
            <Typography variant="overline" sx={{ display: "block", color: "var(--status-weak-text)", fontSize: "0.68rem", fontWeight: 500, letterSpacing: "0.04em" }}>
              WEAKEST DEFENSE
            </Typography>
            <Typography variant="h6" className="mh-display" sx={{ color: "var(--status-weak-text)" }}>
              {worst.label}
            </Typography>
            <Typography sx={{ mt: 1, fontSize: "0.86rem", color: "var(--ink-2)" }}>
              Robustness: {worst.result.metrics.robustness_score.toFixed(1)} — {worst.result.metrics.robustness_class}
            </Typography>
            <Typography sx={{ fontSize: "0.86rem", color: "var(--ink-2)" }}>
              Adversarial Accuracy: {worst.result.metrics.adversarial_accuracy.toFixed(1)}%
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Panel>
  );
}

export default function DemoMode() {
  const { notify } = useToast();
  const [model, setModel] = useState("cnn");
  const [dataset, setDataset] = useState("mnist");
  const [attack, setAttack] = useState("fgsm");
  const [epsilon, setEpsilon] = useState(0.3);
  const [samples, setSamples] = useState(500);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState([]);
  const [summary, setSummary] = useState(null);

  const compatible = { cifar10: ["resnet18", "mobilenetv2"], gtsrb: ["resnet18", "mobilenetv2"], mnist: ["cnn"] };
  const attackOptions = ["fgsm", "pgd", "cw", "zoo", "hopskipjump"];

  return (
    <>
      <PageHeader
        section="Overview"
        title="Demo Mode"
        subtitle="One click runs a full adversarial evaluation sequence: clean baseline, attack, and each defense. Results come from the backend /api/demo/run endpoint."
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Panel title="Demo Configuration" marker="var(--blue)" sx={{ height: "100%" }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Dataset</InputLabel>
              <Select
                value={dataset}
                label="Dataset"
                onChange={(e) => {
                  setDataset(e.target.value);
                  setModel(compatible[e.target.value][0]);
                }}
              >
                {Object.keys(compatible).map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Model</InputLabel>
              <Select value={model} label="Model" onChange={(e) => setModel(e.target.value)}>
                {compatible[dataset].map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Attack</InputLabel>
              <Select value={attack} label="Attack" onChange={(e) => setAttack(e.target.value)}>
                {attackOptions.map((a) => (
                  <MenuItem key={a} value={a}>
                    {a.toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Epsilon" type="number" value={epsilon} onChange={(e) => setEpsilon(e.target.value)} fullWidth sx={{ mb: 2 }} />
            <TextField label="Sample Limit" type="number" value={samples} onChange={(e) => setSamples(e.target.value)} fullWidth sx={{ mb: 2 }} />
            <Button
              variant="contained"
              fullWidth
              onClick={async () => {
                setRunning(true);
                setSteps([]);
                setSummary(null);
                try {
                  const r = await apiPost("/demo/run", {
                    model_name: model,
                    dataset_name: dataset,
                    attack_name: attack,
                    attack_params: { epsilon: Number(epsilon), steps: 10, max_iterations: 8 },
                    sample_limit: Number(samples),
                    batch_size: 64,
                  });
                  setSummary(r.data);
                  setSteps(r.data.steps || []);
                  notify(`Demo complete: ${r.data.steps?.length || 0} steps in ${r.data.total_time}s`, "success");
                } catch (e) {
                  const detail = e.response?.data?.detail || e.message;
                  notify(`Demo failed: ${detail}`, "error");
                } finally {
                  setRunning(false);
                }
              }}
              disabled={running}
              startIcon={running ? <CircularProgress size={20} color="inherit" /> : null}
              sx={{ mt: 1 }}
            >
              {running ? "Running Demo..." : "Run Demo Mode"}
            </Button>
          </Panel>
        </Grid>

        <Grid item xs={12} md={8}>
          {running ? (
            <Panel title="Demo Progress" marker="var(--blue)" sx={{ minHeight: 400 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <CircularProgress color="primary" />
                <Typography className="mh-mono" sx={{ fontSize: "0.9rem" }}>
                  Running evaluation sequence...
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
                <Typography className="mh-mono" sx={{ fontSize: "0.76rem", color: "var(--ink-3)" }}>
                  Sequence: Clean baseline → Attack applied → Defenses
                </Typography>
              </Box>
              {steps.length > 0 ? (
                steps.map((step) => <StepCard key={step.step} step={step} data={step} />)
              ) : (
                <Typography sx={{ fontSize: "0.88rem", color: "var(--ink-2)" }}>
                  Step 1/3: Loading model and running clean baseline...
                </Typography>
              )}
            </Panel>
          ) : (
            <Panel title="Demo Results" marker="var(--blue)" sx={{ minHeight: 400 }}>
              {summary ? (
                <Box>
                  <Typography className="mh-mono" sx={{ mb: 2, fontSize: "0.76rem", color: "var(--ink-3)" }}>
                    Completed {summary.total_steps} steps in {summary.total_time}s
                  </Typography>
                  {steps.map((step) => (
                    <StepCard key={step.step} step={step} data={step} />
                  ))}
                  {summary.best_defense && (
                    <Typography className="mh-mono" sx={{ mt: 2, color: "var(--status-strong-text)" }}>
                      Best defense: {summary.best_defense.name} (robustness {summary.best_defense.robustness_score.toFixed(1)})
                    </Typography>
                  )}
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 6, textAlign: "center" }}>
                  <Typography sx={{ fontSize: "0.88rem", color: "var(--ink-2)" }}>
                    Configure and click "Run Demo Mode" to see a full adversarial evaluation sequence:
                  </Typography>
                  <Box component="ol" sx={{ mt: 1.5, pl: 4, textAlign: "left" }}>
                    <li style={{ marginBottom: "0.4rem" }}>1. Clean baseline (no attack)</li>
                    <li style={{ marginBottom: "0.4rem" }}>2. Attack applied (model under attack)</li>
                    <li style={{ marginBottom: "0.4rem" }}>3. Each defense applied (best vs worst ranking)</li>
                  </Box>
                  <Button component={RouterLink} to="/evaluation" variant="outlined" size="small" sx={{ mt: 2 }}>
                    Or try an interactive evaluation
                  </Button>
                </Box>
              )}
            </Panel>
          )}
          {summary && summary.best_defense && <ResultSummary steps={summary.steps} />}
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Panel title="Robustness bands" caption="0–30 Weak, 31–60 Moderate, 61–100 Strong">
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {ROBUSTNESS_BANDS.map((b) => (
              <Box key={b.klass} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <ClassBadge klass={b.klass} />
                <Typography className="mh-mono" sx={{ fontSize: "0.74rem", color: "var(--ink-3)" }}>
                  {b.min}–{b.max}
                </Typography>
              </Box>
            ))}
          </Box>
          <FigCaption>
            Robustness score = 0.4× adversarial accuracy + 0.3× (100 − attack success rate) + 0.3× retained confidence. Higher is better.
          </FigCaption>
        </Panel>
      </Box>
    </>
  );
}

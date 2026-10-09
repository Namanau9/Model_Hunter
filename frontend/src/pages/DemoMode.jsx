import React, { useState } from "react";
import {
  Grid, Typography, Button, TextField, MenuItem, Select, InputLabel,
  FormControl, Box, CircularProgress, Alert, Chip, Paper,
} from "@mui/material";
import { useToast } from "../contexts/ToastContext";
import { apiPost } from "../api/client";
import PageShell from "../components/PageShell";
import Panel from "../components/Panel";
import RobustnessGauge from "../components/RobustnessGauge";
import MetricTable from "../components/MetricTable";

const compatible = { cifar10: ["resnet18", "mobilenetv2"], gtsrb: ["resnet18", "mobilenetv2"], mnist: ["cnn"] };
const attackOptions = ["fgsm", "pgd", "cw", "zoo", "hopskipjump"];

function StepCard({ step, data }) {
  const m = data?.result?.metrics;
  const hasResult = !!m;
  const isBaseline = step.step === 1;
  const isAttack = step.step === 2;
  const isDefense = step.step >= 3;

  let color = "#2563EB";
  let bg = "rgba(37, 99, 235, 0.08)";
  if (isBaseline) { color = "#2FD18A"; bg = "rgba(47, 209, 138, 0.08)"; }
  else if (isAttack) { color = "#FF5C66"; bg = "rgba(255, 92, 102, 0.08)"; }
  else if (isDefense && hasResult) {
    const score = m.robustness_score;
    if (score >= 60) { color = "#2FD18A"; bg = "rgba(47, 209, 138, 0.08)"; }
    else if (score >= 30) { color = "#F9B44C"; bg = "rgba(249, 180, 76, 0.08)"; }
    else { color = "#FF5C66"; bg = "rgba(255, 92, 102, 0.08)"; }
  }

  return (
    <Box
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 2,
        border: `1px solid ${color}`,
        backgroundColor: bg,
        position: "relative",
        opacity: step.error ? 0.7 : 1,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
        <Box>
          <Chip
            label={step.step}
            size="small"
            sx={{
              mr: 1,
              backgroundColor: color,
              color: "#001014",
              fontWeight: 700,
              fontFamily: "var(--mh-font-mono)",
            }}
          />
          <Typography variant="overline" sx={{ color, fontWeight: 600, verticalAlign: "middle" }}>
            {step.label}
          </Typography>
        </Box>
        {step.result?.defense && (
          <Chip
            label={step.result.defense === "none" ? "no defense" : step.result.defense}
            size="small"
            variant="outlined"
            sx={{ color: color, borderColor: color }}
          />
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        {step.description}
      </Typography>
      {step.error && <Alert severity="error" sx={{ mb: 1.5 }}>{step.error}</Alert>}
      {hasResult && m && (
        <Grid container spacing={2} alignItems="stretch">
          <Grid item xs={12} md={3}>
            <Paper variant="outlined" sx={{ borderRadius: 2, height: "100%", p: 1 }}>
              <RobustnessGauge score={m.robustness_score} klass={m.robustness_class} />
            </Paper>
          </Grid>
          <Grid item xs={12} md={9}>
            <MetricTable metrics={m} />
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
    (cur.result.metrics.robustness_score > prev.result.metrics.robustness_score) ? cur : prev
  );

  const worst = defenseSteps.reduce((prev, cur) =>
    (cur.result.metrics.robustness_score < prev.result.metrics.robustness_score) ? cur : prev
  );

  return (
    <Panel eyebrow="Defense Ranking" title="Best vs Worst Defense" accent="#27E0FF" sx={{ mt: 3 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2, borderRadius: 2, border: "1px solid #2FD18A", backgroundColor: "rgba(47,209,138,0.08)" }}>
            <Typography variant="overline" color="#2FD18A" sx={{ display: "block", mb: 1 }}>BEST DEFENSE</Typography>
            <Typography variant="h6" className="mh-display" color="#2FD18A">{best.label}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Robustness: {best.result.metrics.robustness_score.toFixed(1)} — {best.result.metrics.robustness_class}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Adversarial Accuracy: {best.result.metrics.adversarial_accuracy.toFixed(1)}%
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box sx={{ p: 2, borderRadius: 2, border: "1px solid #FF5C66", backgroundColor: "rgba(255,92,102,0.08)" }}>
            <Typography variant="overline" color="#FF5C66" sx={{ display: "block", mb: 1 }}>WEAKEST DEFENSE</Typography>
            <Typography variant="h6" className="mh-display" color="#FF5C66">{worst.label}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Robustness: {worst.result.metrics.robustness_score.toFixed(1)} — {worst.result.metrics.robustness_class}
            </Typography>
            <Typography variant="body2" color="text.secondary">
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

  return (
    <>
      <PageShell
        eyebrow="Demo Mode"
        title="Automated Adversarial Evaluation"
        subtitle="One click — see how the model performs before attack, under attack, and how each defense recovers robustness."
      />
      <Grid container spacing={3} className="mh-reveal">
        <Grid item xs={12} md={4}>
          <Panel eyebrow="Configuration" title="Demo Configuration" accent="#27E0FF">
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Dataset</InputLabel>
              <Select value={dataset} label="Dataset" onChange={(e) => { setDataset(e.target.value); setModel(compatible[e.target.value][0]); }}>
                {Object.keys(compatible).map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Model</InputLabel>
              <Select value={model} label="Model" onChange={(e) => setModel(e.target.value)}>
                {compatible[dataset].map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Attack</InputLabel>
              <Select value={attack} label="Attack" onChange={(e) => setAttack(e.target.value)}>
                {attackOptions.map((a) => <MenuItem key={a} value={a}>{a.toUpperCase()}</MenuItem>)}
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
                  notify(
                    `Demo complete: ${r.data.steps?.length || 0} steps in ${r.data.total_time}s`,
                    "success"
                  );
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
            <Panel eyebrow="Live Results" title="Demo Progress" sx={{ minHeight: 400 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <CircularProgress color="secondary" />
                <Typography variant="body2" className="mh-mono">
                  Running evaluation sequence...
                </Typography>
              </Box>
              {steps.length > 0 ? (
                steps.map((step) => (
                  <StepCard key={step.step} step={step} data={step} />
                ))
              ) : (
                <Typography color="text.secondary">
                  Step 1/2: Loading model and running clean baseline...
                  <br /><br />
                  The sequence runs: Clean baseline → Attack applied → Defenses
                </Typography>
              )}
            </Panel>
          ) : (
            <Panel eyebrow="Live Results" title="Demo Progress" sx={{ minHeight: 400 }}>
              {summary ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" className="mh-mono" sx={{ mb: 2 }}>
                    Completed {summary.total_steps} steps in {summary.total_time}s
                  </Typography>
                  {steps.map((step) => (
                    <StepCard key={step.step} step={step} data={step} />
                  ))}
                  {summary.best_defense && (
                    <Typography variant="body2" color="#2FD18A" className="mh-mono" sx={{ mt: 2 }}>
                      Best defense: {summary.best_defense.name} (robustness {summary.best_defense.robustness_score.toFixed(1)})
                    </Typography>
                  )}
                </Box>
              ) : (
                <Box display="flex" alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary" textAlign="center">
                    Configure and click "Run Demo Mode" to see a full adversarial evaluation sequence:<br /><br />
                    1. Clean baseline (no attack)<br />
                    2. Attack applied (model under attack)<br />
                    3. Each defense applied (best vs worst ranking)
                  </Typography>
                </Box>
              )}
            </Panel>
          )}
          {summary && summary.best_defense && <ResultSummary steps={summary.steps} />}
        </Grid>
      </Grid>
    </>
  );
}

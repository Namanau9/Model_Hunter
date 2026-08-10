import React, { useState, useEffect } from "react";
import {
  Grid, Card, CardContent, Typography, Button, TextField, MenuItem, Select, InputLabel,
  FormControl, Alert, CircularProgress, Paper,
} from "@mui/material";
import { useToast } from "../contexts/ToastContext";
import { apiPost } from "../api/client";
import PageShell from "../components/PageShell";
import MetricTable from "../components/MetricTable";
import RobustnessGauge from "../components/RobustnessGauge";

const compatible = { cifar10: ["resnet18", "mobilenetv2"], gtsrb: ["resnet18", "mobilenetv2"], mnist: ["cnn"] };
const defenses = ["none", "adversarial_training", "ensemble", "input_preprocessing"];

export default function Evaluation() {
  const { notify } = useToast();
  const [model, setModel] = useState("cnn");
  const [dataset, setDataset] = useState("mnist");
  const [attack, setAttack] = useState("fgsm");
  const [defense, setDefense] = useState("none");
  const [epsilon, setEpsilon] = useState(0.1);
  const [samples, setSamples] = useState(100);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setModel(compatible[dataset][0]);
  }, [dataset]);

  const reset = () => {
    setErr(null);
    setResult(null);
  };

  const run = async () => {
    setRunning(true);
    setErr(null);
    setResult(null);
    try {
      const r = await apiPost("/evaluation/run", {
        model_name: model, dataset_name: dataset, attack_name: attack,
        defense_name: defense === "none" ? null : defense,
        attack_params: { epsilon: Number(epsilon), steps: 8, max_iterations: 4 },
        sample_limit: Number(samples), batch_size: 64,
      });
      setResult(r.data);
      notify(
        `Evaluation complete: robustness ${r.data.metrics.robustness_score.toFixed(1)} (${r.data.metrics.robustness_class})`,
        "success"
      );
    } catch (e) {
      const detail = e.response?.data?.detail || e.message;
      setErr(detail);
      notify(`Evaluation failed: ${detail}`, "error");
    } finally {
      setRunning(false);
    }
  };

    return (
    <>
      <PageShell
        title="Evaluation"
        subtitle="Execute an attack against a model and compute all security metrics."
        onRefresh={reset}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Run Configuration</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Dataset</InputLabel>
              <Select value={dataset} label="Dataset" onChange={(e) => setDataset(e.target.value)}>
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
                {["fgsm", "pgd", "cw", "zoo", "hopskipjump"].map((a) => <MenuItem key={a} value={a}>{a.toUpperCase()}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Defense</InputLabel>
              <Select value={defense} label="Defense" onChange={(e) => setDefense(e.target.value)}>
                {defenses.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Epsilon" type="number" value={epsilon} onChange={(e) => setEpsilon(e.target.value)} fullWidth sx={{ mb: 2 }} />
            <TextField label="Sample Limit" type="number" value={samples} onChange={(e) => setSamples(e.target.value)} fullWidth sx={{ mb: 2 }} />
                        <Button
              variant="contained"
              fullWidth
              onClick={run}
              disabled={running}
              startIcon={running ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {running ? "Running..." : "Run Evaluation"}
            </Button>
            {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          {result ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper variant="outlined">
                  <RobustnessGauge score={result.metrics.robustness_score} klass={result.metrics.robustness_class} />
                </Paper>
              </Grid>
              <Grid item xs={12} md={8}>
                <MetricTable metrics={result.metrics} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Evaluation #{result.evaluation_id} · {result.model}/{result.dataset} · {result.attack}
                  {result.defense !== "none" && ` + ${result.defense}`} · total time {result.total_time}s
                </Typography>
              </Grid>
            </Grid>
          ) : (
            <Card>
              <CardContent>
                <Typography color="text.secondary">
                  Configure and run an evaluation to view real metrics (no fabricated data).
                </Typography>
              </CardContent>
            </Card>
          )}
                </Grid>
      </Grid>
    </>
  );
}

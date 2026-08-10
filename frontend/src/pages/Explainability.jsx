import React, { useState, useEffect } from "react";
import {
  Grid, Card, CardContent, Typography, Button, MenuItem, Select, InputLabel, FormControl,
  Box, Alert, CircularProgress, TextField,
} from "@mui/material";
import { apiPost } from "../api/client";

const compatible = { cifar10: ["resnet18", "mobilenetv2"], gtsrb: ["resnet18", "mobilenetv2"], mnist: ["cnn"] };

export default function Explainability() {
  const [dataset, setDataset] = useState("mnist");
  const [model, setModel] = useState("cnn");
  const [technique, setTechnique] = useState("gradcam");
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [img, setImg] = useState(null);

  useEffect(() => { setModel(compatible[dataset][0]); }, [dataset]);

  const run = async () => {
    setLoading(true); setErr(null); setImg(null);
    try {
      const r = await apiPost("/explainability", {
        model_name: model, dataset_name: dataset, technique, sample_index: Number(idx),
      });
      setImg(`data:image/png;base64,${r.data.image_base64}`);
    } catch (e) { setErr(e.response?.data?.detail || e.message); }
    finally { setLoading(false); }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ color: "#00E5FF" }}>Explainability</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        GradCAM & SHAP visual explanations for model decisions.
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Configuration</Typography>
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
              <InputLabel>Technique</InputLabel>
              <Select value={technique} label="Technique" onChange={(e) => setTechnique(e.target.value)}>
                <MenuItem value="gradcam">GradCAM</MenuItem>
                <MenuItem value="shap">SHAP</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Sample Index" type="number" value={idx} onChange={(e) => setIdx(e.target.value)} fullWidth sx={{ mb: 2 }} />
            <Button variant="contained" fullWidth onClick={run} disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : "Generate Explanation"}
            </Button>
            {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
          </Card>
        </Grid>
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>{technique.toUpperCase()} Visualization</Typography>
            {img ? (
              <Box component="img" src={img} alt="explanation" sx={{ width: "100%", maxWidth: 640, borderRadius: 2, border: "1px solid #334155" }} />
            ) : (
              <Typography color="text.secondary">Generate an explanation to see the heatmap.</Typography>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

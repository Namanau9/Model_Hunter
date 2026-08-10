import React, { useEffect, useState } from "react";
import {
  Grid, Card, CardContent, Typography, Button, TextField, MenuItem, Select, InputLabel,
  FormControl, Box, Chip, Alert, CircularProgress, Stack,
} from "@mui/material";
import { apiGet, apiPost, apiUpload } from "../api/client";

const compatible = { cifar10: ["resnet18", "mobilenetv2"], gtsrb: ["resnet18", "mobilenetv2"], mnist: ["cnn"] };

export default function Models() {
  const [models, setModels] = useState([]);
  const [dataset, setDataset] = useState("mnist");
  const [model, setModel] = useState("cnn");
  const [epochs, setEpochs] = useState(1);
  const [training, setTraining] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [uploaded, setUploaded] = useState([]);

  const load = async () => {
    const r = await apiGet("/models");
    setModels(r.data.models || []);
    setUploaded(r.data.uploads || []);
  };
  useEffect(() => { load().catch(() => {}); }, []);

  const train = async () => {
    setTraining(true); setMsg(null); setErr(null);
    try {
      const r = await apiPost("/models/train", { model_name: model, dataset_name: dataset, epochs, batch_size: 64 });
      setMsg(`Trained ${model} on ${dataset}: test accuracy ${r.data.test_accuracy}%`);
      await load();
    } catch (e) { setErr(e.response?.data?.detail || e.message); }
    finally { setTraining(false); }
  };

  const doUpload = async (file) => {
    setUploading(true); setErr(null);
    try { await apiUpload("/models/upload", file); await load(); }
    catch (e) { setErr(e.response?.data?.detail || e.message); }
    finally { setUploading(false); }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ color: "#00E5FF" }}>Models</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Load, train and upload deep learning models.</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Train Model</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Model</InputLabel>
              <Select value={model} label="Model" onChange={(e) => setModel(e.target.value)}>
                {compatible[dataset].map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Dataset</InputLabel>
              <Select value={dataset} label="Dataset" onChange={(e) => { setDataset(e.target.value); setModel(compatible[e.target.value][0]); }}>
                {Object.keys(compatible).map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Epochs" type="number" value={epochs} onChange={(e) => setEpochs(Number(e.target.value))} fullWidth sx={{ mb: 2 }} />
            <Button variant="contained" onClick={train} disabled={training} fullWidth>
              {training ? <CircularProgress size={22} color="inherit" /> : "Train Model"}
            </Button>
            {msg && <Alert severity="success" sx={{ mt: 2 }}>{msg}</Alert>}
            {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Upload Checkpoint (.pth / .pt)</Typography>
            <label htmlFor="upload-model">
              <input
                id="upload-model"
                type="file"
                accept=".pth,.pt,.ckpt"
                style={{ display: "none" }}
                onChange={(e) => e.target.files[0] && doUpload(e.target.files[0])}
              />
              <Button variant="outlined" component="span" disabled={uploading}>
                {uploading ? "Uploading..." : "Choose File"}
              </Button>
            </label>
            {uploaded.length > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {uploaded.length} checkpoint(s) stored.
              </Typography>
            )}
          </Card>

          <Typography variant="h6" sx={{ mb: 1 }}>Model Registry</Typography>
          <Stack spacing={1}>
            {models.map((m) => (
              <Card key={m.name} variant="outlined">
                <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1 }}>
                  <Box>
                    <Typography variant="subtitle1">{m.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{m.description}</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {m.datasets?.map?.((d) => <Chip key={d} label={d} size="small" sx={{ mr: 0.5 }} />)}
                    </Box>
                  </Box>
                  <Chip label={m.available ? "READY" : "NOT TRAINED"} color={m.available ? "success" : "warning"} />
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

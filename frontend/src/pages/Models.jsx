import React, { useEffect, useState } from "react";
import {
  Grid, Card, CardContent, Typography, Button, TextField, MenuItem, Select, InputLabel,
  FormControl, Box, Chip, CircularProgress, Stack,
} from "@mui/material";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { apiGet, apiPost, apiUpload } from "../api/client";
import PageShell from "../components/PageShell";

const compatible = { cifar10: ["resnet18", "mobilenetv2"], gtsrb: ["resnet18", "mobilenetv2"], mnist: ["cnn"] };

export default function Models() {
  const { tick } = useApp();
  const { notify } = useToast();
  const [models, setModels] = useState([]);
  const [dataset, setDataset] = useState("mnist");
  const [model, setModel] = useState("cnn");
  const [epochs, setEpochs] = useState(1);
  const [training, setTraining] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState([]);

  const load = async () => {
    const r = await apiGet("/models");
    setModels(r.data.models || []);
    setUploaded(r.data.uploads || []);
  };

  useEffect(() => {
    load().catch(() => notify("Could not load models", "warning"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const train = async () => {
    setTraining(true);
    try {
      const r = await apiPost("/models/train", { model_name: model, dataset_name: dataset, epochs, batch_size: 64 });
      notify(`Trained ${model} on ${dataset}: test accuracy ${r.data.test_accuracy}%`, "success");
      await load();
    } catch (e) {
      const detail = e.response?.data?.detail || e.message;
      notify(`Training failed: ${detail}`, "error");
    } finally {
      setTraining(false);
    }
  };

  const doUpload = async (file) => {
    setUploading(true);
    try {
      await apiUpload("/models/upload", file);
      await load();
      notify(`Uploaded ${file.name}`, "success");
    } catch (e) {
      const detail = e.response?.data?.detail || e.message;
      notify(`Upload failed: ${detail}`, "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <PageShell
        title="Models"
        subtitle="Load, train and upload deep learning models."
        onRefresh={() => load().catch(() => {})}
      />

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
                        <Button variant="contained" onClick={train} disabled={training} fullWidth startIcon={training ? <CircularProgress size={20} color="inherit" /> : null}>
              {training ? "Training..." : "Train Model"}
            </Button>
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
        </>
  );
}

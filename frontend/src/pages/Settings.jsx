import React from "react";
import { Grid, Typography, Box, Chip, Stack } from "@mui/material";
import { useApp } from "../contexts/AppContext";
import PageShell from "../components/PageShell";
import Panel from "../components/Panel";

function Row({ label, value, children }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.5, borderBottom: "1px dashed #22334E" }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      {value != null ? <Typography variant="body2" className="mh-mono">{value}</Typography> : children}
    </Box>
  );
}

function deviceChip(info) {
  const d = info?.device;
  if (!d) return <Chip label="\u2014" size="small" variant="outlined" />;
  const map = {
    cuda: { label: "CUDA GPU", color: "success" },
    mps: { label: "Apple MPS", color: "primary" },
    cpu: { label: "CPU", color: "warning" },
  };
  const m = map[d.type] || { label: String(d.type).toUpperCase(), color: "default" };
  return <Chip label={m.label} color={m.color} size="small" variant="filled" />;
}

export default function Settings() {
  const { info, health, refresh } = useApp();
  const d = info?.device;
  return (
    <>
      <PageShell
        eyebrow="Platform"
        title="Settings"
        subtitle="Platform configuration, architecture and ML compute status."
        onRefresh={refresh}
      />
      <Grid container spacing={3} className="mh-reveal">
        <Grid item xs={12} md={6}>
          <Panel corners eyebrow="Diagnostics" title="System Status" accent="#27E0FF">
            <Stack spacing={1}>
              <Row label="Application" value={info?.app} />
              <Row label="Version" value={info?.version} />
              <Row
                label="API"
                children={
                  <Chip
                    label={health?.status === "ok" ? "ONLINE" : "OFFLINE"}
                    color={health?.status === "ok" ? "success" : "error"}
                    size="small"
                    variant="filled"
                  />
                }
              />
              <Row
                label="Database"
                children={<Chip label={health?.database || "\u2014"} color="primary" size="small" />}
              />
            </Stack>
          </Panel>
        </Grid>

        <Grid item xs={12} md={6}>
          <Panel corners eyebrow="Acceleration" title="Compute Accelerator" accent="#F9B44C" sx={{ height: "100%" }}>
            <Stack spacing={1}>
              <Row label="Active Backend" children={deviceChip(info)} />
              <Row label="Requested" value={d?.preference || "\u2014"} />
              <Row label="Device" value={d?.active || "\u2014"} />
              <Row label="Accelerator" value={d?.name || "\u2014"} />
              <Row label="VRAM" value={d?.vram_gb != null ? `${d.vram_gb} GB` : "\u2014"} />
              <Row label="CUDA" value={d?.cuda_version || "\u2014"} />
              <Row label="cuDNN" value={d?.cudnn_version != null ? String(d.cudnn_version) : "\u2014"} />
              <Row label="PyTorch" value={d?.torch_version || "\u2014"} />
            </Stack>
            <Typography variant="body2" color="text.secondary" className="mh-mono" sx={{ mt: 1.5, fontSize: "0.74rem" }}>
              DEVICE=auto resolves CUDA → MPS → CPU at runtime with graceful fallback.
            </Typography>
          </Panel>
        </Grid>

        <Grid item xs={12}>
          <Panel corners eyebrow="Design" title="Architecture" accent="#6D7CFF">
            <Box>
              {["React Frontend", "FastAPI API", "Service Layer", "ML Engines", "Evaluation", "Database / Reports"].map((a) => (
                <Chip key={a} label={a} variant="outlined" sx={{ mr: 1, mb: 1 }} />
              ))}
            </Box>
            <Typography variant="body2" color="text.secondary" className="mh-mono" sx={{ mt: 2, fontSize: "0.78rem" }}>
              Business logic lives in the service layer and registries — never inside API routes.
            </Typography>
          </Panel>
        </Grid>
      </Grid>
    </>
  );
}
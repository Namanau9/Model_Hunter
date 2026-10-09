import React from "react";
import { Box, Grid, Switch, Typography } from "@mui/material";
import PageHeader from "../components/ui/PageHeader";
import Panel, { FieldLabel } from "../components/ui/Panel";
import StatusPill from "../components/ui/StatusPill";
import PipelineFlow from "../components/viz/PipelineFlow";
import { ThemeSegmented } from "../components/ui/ThemeToggle";
import { useApp } from "../contexts/AppContext";
import { useUiPrefs } from "../contexts/UiPrefsContext";

function Row({ label, value, children }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, py: 0.9, borderBottom: "1px solid var(--line)" }}>
      <Typography sx={{ fontSize: "0.86rem", color: "var(--ink-2)" }}>{label}</Typography>
      {children ?? (
        <Typography className="mh-mono" sx={{ fontSize: "0.84rem", fontWeight: 500, textAlign: "right", wordBreak: "break-word" }}>
          {value ?? "—"}
        </Typography>
      )}
    </Box>
  );
}

const DEVICE = { cuda: "NVIDIA CUDA", mps: "Apple MPS", cpu: "CPU" };

export default function Settings() {
  const { info, health, refresh } = useApp();
  const prefs = useUiPrefs();
  const d = info?.device;
  const online = health?.status === "ok";

  return (
    <Box>
      <PageHeader section="System" title="Settings" subtitle="Appearance, platform status, compute device and what the backend exposes." onRefresh={refresh} />
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Panel title="Appearance" caption="saved in this browser only" sx={{ height: "100%" }}>
            <FieldLabel>Theme</FieldLabel>
            <ThemeSegmented />
            <Typography sx={{ mt: 1, fontSize: "0.8rem", color: "var(--ink-3)" }}>
              {prefs.theme === "system" ? `Following your operating system (currently ${prefs.mode}).` : `Always ${prefs.mode}.`}
            </Typography>
            <Box sx={{ mt: 2, borderTop: "1px solid var(--line)" }}>
              {[
                ["reduceMotion", "Reduce motion", "Minimise animation. Your OS setting is respected either way."],
                ["paper", "Dot-grid background", "A faint graph-paper texture behind the content."],
                ["sidebarCollapsed", "Compact sidebar", "Icon-only navigation on desktop."],
              ].map(([key, label, hint]) => (
                <Box key={key} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, py: 1.1, borderBottom: "1px solid var(--line)" }}>
                  <Box>
                    <Typography component="label" htmlFor={`pref-${key}`} sx={{ fontWeight: 500, fontSize: "0.9rem", cursor: "pointer" }}>
                      {label}
                    </Typography>
                    <Typography sx={{ fontSize: "0.78rem", color: "var(--ink-3)" }}>{hint}</Typography>
                  </Box>
                  <Switch id={`pref-${key}`} checked={!!prefs[key]} onChange={(e) => prefs.set({ [key]: e.target.checked })} />
                </Box>
              ))}
            </Box>
          </Panel>
        </Grid>

        <Grid item xs={12} md={6}>
          <Panel title="Platform status" caption="GET /api/health · /api/info" sx={{ height: "100%" }}>
            <Row label="Application" value={info?.app} />
            <Row label="Version" value={info?.version} />
            <Row label="API">
              <StatusPill tone={online ? "ok" : health?.status === "degraded" ? "warn" : "down"}>{online ? "Online" : health?.status || "Offline"}</StatusPill>
            </Row>
            <Row label="Database">
              <StatusPill tone={health?.database === "connected" ? "ok" : health?.database ? "down" : "idle"}>{health?.database || "—"}</StatusPill>
            </Row>
            <Row label="API base" value="/api → localhost:8000" />
            {health?.error && (
              <Typography className="mh-mono" sx={{ mt: 1.5, fontSize: "0.74rem", color: "var(--status-weak-text)", wordBreak: "break-word" }}>
                {health.error}
              </Typography>
            )}
          </Panel>
        </Grid>

        <Grid item xs={12} md={6}>
          <Panel title="Compute device" caption="DEVICE=auto resolves CUDA, then MPS, then CPU" sx={{ height: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, mb: 1 }}>
              <Typography sx={{ fontSize: "1.6rem", fontWeight: 600 }}>{d?.type ? DEVICE[d.type] || String(d.type).toUpperCase() : "—"}</Typography>
              {d?.active && (
                <Typography className="mh-mono" sx={{ color: "var(--ink-3)", fontSize: "0.84rem" }}>
                  {d.active}
                </Typography>
              )}
            </Box>
            <Row label="Requested" value={d?.preference} />
            <Row label="Accelerator" value={d?.name} />
            <Row label="VRAM" value={d?.vram_gb != null ? `${d.vram_gb} GB` : null} />
            <Row label="CUDA / cuDNN" value={d?.cuda_version || d?.cudnn_version ? `${d?.cuda_version ?? "—"} / ${d?.cudnn_version ?? "—"}` : null} />
            <Row label="PyTorch" value={d?.torch_version} />
          </Panel>
        </Grid>

        <Grid item xs={12} md={6}>
          <Panel title="Registries" caption="what the backend exposes" sx={{ height: "100%" }}>
            {[
              ["Models", info?.models],
              ["Datasets", info?.datasets],
              ["Attacks", info?.attacks],
              ["Defenses", info?.defenses],
            ].map(([k, list]) => (
              <Box key={k} sx={{ py: 1, borderBottom: "1px solid var(--line)" }}>
                <Typography sx={{ fontSize: "0.8rem", color: "var(--ink-3)" }}>
                  {k} ({list?.length ?? 0})
                </Typography>
                <Typography className="mh-mono" sx={{ fontSize: "0.82rem", mt: 0.25 }}>
                  {list?.length ? list.join("  ·  ") : "—"}
                </Typography>
              </Box>
            ))}
          </Panel>
        </Grid>

        <Grid item xs={12}>
          <Panel title="Architecture" caption="business logic lives in the service layer and registries, never in API routes">
            <PipelineFlow steps={info?.architecture || ["React Frontend", "FastAPI API", "Service Layer", "ML Engines", "Evaluation", "Database / Reports"]} />
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
}

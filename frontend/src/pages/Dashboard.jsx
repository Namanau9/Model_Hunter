import React, { useEffect, useState } from "react";
import { Grid, Typography, CircularProgress, Box, useTheme, Stack, Button } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import MemoryIcon from "@mui/icons-material/Memory";
import StorageIcon from "@mui/icons-material/Storage";
import SecurityIcon from "@mui/icons-material/Security";
import ShieldIcon from "@mui/icons-material/Shield";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { apiGet } from "../api/client";
import PageShell from "../components/PageShell";
import StatCard from "../components/StatCard";
import Panel from "../components/Panel";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine,
} from "recharts";

const RANK = { Weak: "error", Moderate: "warning", Strong: "success" };

function EmptyHint({ text }) {
  return <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>{text}</Typography>;
}

export default function Dashboard() {
  const { info, loading, tick, refresh } = useApp();
  const { notify } = useToast();
  const navigate = useNavigate();
  const theme = useTheme();
  const cy = theme.palette.secondary.main;
  const [history, setHistory] = useState([]);
  const [benchChart, setBenchChart] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const h = await apiGet("/evaluation/history");
      const rows = h.data?.history || [];
      setHistory(rows.slice(0, 6));
      const byModel = {};
      rows.forEach((r) => {
        byModel[`${r.model}/${r.dataset}/${r.attack}`] = r.robustness_score;
      });
      setBenchChart(Object.entries(byModel).map(([name, value]) => ({ name, value })));
    } catch (e) {
      notify("Could not load evaluation history", "warning");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 12 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  const latest = history[0] || null;
  const rankColor = latest
    ? theme.palette[RANK[latest.robustness_class] || "secondary"].main
    : theme.palette.secondary.main;

  const tooltipStyle = {
    backgroundColor: theme.palette.custom.surface,
    border: `1px solid ${theme.palette.custom.border}`,
    borderRadius: 10,
    color: theme.palette.text.primary,
    fontFamily: "var(--mh-font-mono)",
    fontSize: "0.75rem",
  };

  const Metric = ({ label, value }) => (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.4 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" className="mh-mono" fontWeight={600}>{value}</Typography>
    </Box>
  );

  return (
    <>
      <PageShell
        eyebrow="Overview"
        title="Dashboard"
        subtitle="Autonomous adversarial ML security evaluation — every value here is computed from real executions, never fabricated."
        onRefresh={() => { refresh(); fetchHistory(); }}
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="caption" className="mh-mono" color="text.secondary">LIVE TELEMETRY</Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate("/demo")}
              startIcon={<RocketLaunchIcon />}
            >
              Demo Mode
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={3} className="mh-reveal">
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Models" value={info?.models?.length ?? 0} sub="cnn · resnet18 · mobilenetv2" accent="#27E0FF" icon={<MemoryIcon fontSize="large" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Datasets" value={info?.datasets?.length ?? 0} sub="mnist · cifar10 · gtsrb" accent="#6D7CFF" icon={<StorageIcon fontSize="large" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Attacks" value={info?.attacks?.length ?? 0} sub="fgsm · pgd · cw · zoo · hopskipjump" accent="#FFB020" icon={<SecurityIcon fontSize="large" />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Defenses" value={info?.defenses?.length ?? 0} sub="adv training · ensemble · preprocessing" accent="#2FD18A" icon={<ShieldIcon fontSize="large" />} />
        </Grid>
      </Grid>

      <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ mt: 3 }} className="mh-reveal" style={{ animationDelay: "0.08s" }}>
        <Box sx={{ flex: { md: "0 0 38%" } }}>
          {latest ? (
            <Panel corners eyebrow="Latest Evaluation" title="Robustness Reading" accent={cy} sx={{ height: "100%" }}>
              <Metric label="Configuration" value={`${latest.model} / ${latest.dataset}`} />
              <Metric label="Attack" value={`${latest.attack.toUpperCase()}${latest.defense !== "none" ? ` + ${latest.defense}` : ""}`} />
              <Metric label="Clean Accuracy" value={`${latest.clean_accuracy.toFixed(1)}%`} />
              <Metric label="Adversarial Acc." value={`${latest.adversarial_accuracy.toFixed(1)}%`} />
              <Metric label="Attack Success Rate" value={`${latest.attack_success_rate.toFixed(1)}%`} />
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  borderRadius: 2,
                  border: `1px solid ${alpha(rankColor, 0.5)}`,
                  backgroundColor: alpha(rankColor, 0.1),
                  textAlign: "center",
                }}
              >
                <Typography variant="overline" color="text.secondary">Robustness</Typography>
                <Typography variant="h3" className="mh-mono" sx={{ color: rankColor, fontWeight: 700, lineHeight: 1.1 }}>
                  {latest.robustness_score.toFixed(1)}
                </Typography>
                <Typography variant="caption" className="mh-mono" sx={{ color: rankColor, letterSpacing: "0.14em" }}>
                  {latest.robustness_class.toUpperCase()}
                </Typography>
              </Box>
            </Panel>
          ) : (
            <Panel corners eyebrow="Latest Evaluation" title="Robustness Reading" sx={{ height: "100%" }}>
              <EmptyHint text="Run an evaluation to see a live robustness reading." />
            </Panel>
          )}
        </Box>

        <Box sx={{ flex: 1 }}>
          <Panel eyebrow="Benchmarks" title="Robustness by Model / Dataset / Attack" sx={{ height: "100%" }}>
            {loadingHistory ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress size={26} color="secondary" />
              </Box>
            ) : benchChart.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={benchChart} margin={{ top: 8, right: 8, left: -14, bottom: 4 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={cy} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={theme.palette.custom.blue} stopOpacity={0.45} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 4" stroke={theme.palette.custom.border} vertical={false} />
                  <XAxis dataKey="name" stroke={theme.palette.text.secondary} interval={0} fontSize={10} tickMargin={6} tickLine={false} axisLine={{ stroke: theme.palette.custom.border }} />
                  <YAxis stroke={theme.palette.text.secondary} unit="%" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: alpha(cy, 0.06) }} contentStyle={tooltipStyle} />
                  <ReferenceLine y={60} stroke={theme.palette.custom.border} strokeDasharray="3 4" />
                  <Bar dataKey="value" radius={[6, 6, 2, 2]} fillOpacity={0.9}>
                    {benchChart.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          d.value <= 30
                            ? theme.palette.error.main
                            : d.value <= 60
                            ? theme.palette.warning.main
                            : theme.palette.success.main
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyHint text="No evaluations yet. Run one from the Evaluation page." />
            )}
          </Panel>
        </Box>
      </Stack>
    </>
  );
}
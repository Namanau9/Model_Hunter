import React, { useEffect, useState } from "react";
import { Grid, Card, CardContent, Typography, CircularProgress, Box } from "@mui/material";
import MemoryIcon from "@mui/icons-material/Memory";
import StorageIcon from "@mui/icons-material/Storage";
import SecurityIcon from "@mui/icons-material/Security";
import ShieldIcon from "@mui/icons-material/Shield";
import { useApp } from "../contexts/AppContext";
import { apiGet } from "../api/client";
import StatCard from "../components/StatCard";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

export default function Dashboard() {
  const { info, health, loading } = useApp();
  const [history, setHistory] = useState([]);
  const [benchChart, setBenchChart] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const h = await apiGet("/evaluation/history");
        setHistory((h.data?.history || []).slice(0, 6));
        const names = h.data?.history || [];
        const byModel = {};
        (names || []).forEach((r) => {
          const key = `${r.model}/${r.dataset}/${r.attack}`;
          byModel[key] = r.robustness_score;
        });
        setBenchChart(Object.entries(byModel).map(([name, value]) => ({ name, value })));
      } catch (e) {
        /* offline */
      }
    })();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const latest = history[0] || null;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h4" sx={{ color: "#00E5FF" }}>
          Dashboard
        </Typography>
        <Typography color="text.secondary">
          Autonomous Adversarial ML Security Evaluation — all values computed from real executions.
        </Typography>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <StatCard title="Models" value={info?.models?.length ?? 0} sub="cnn, resnet18, mobilenetv2" icon={<MemoryIcon color="primary" />} />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard title="Datasets" value={info?.datasets?.length ?? 0} sub="mnist, cifar10, gtsrb" icon={<StorageIcon color="secondary" />} />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard title="Attacks" value={info?.attacks?.length ?? 0} sub="fgsm, pgd, cw, zoo, hopskipjump" icon={<SecurityIcon sx={{ color: "#FF9800" }} />} />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard title="Defenses" value={info?.defenses?.length ?? 0} sub="adv training, ensemble, preprocessing" icon={<ShieldIcon sx={{ color: "#00C853" }} />} />
      </Grid>

      {latest && (
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Latest Result
              </Typography>
              <Typography>
                {latest.model} / {latest.dataset} attacked with {latest.attack}
                {latest.defense !== "none" && ` + defense:${latest.defense}`}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Clean Acc: {latest.clean_accuracy.toFixed(1)}% · Adv Acc: {latest.adversarial_accuracy.toFixed(1)}% · ASR: {latest.attack_success_rate.toFixed(1)}%
              </Typography>
              <Typography variant="h5" sx={{ mt: 2, color: "#00E5FF" }}>
                Robustness: {latest.robustness_score.toFixed(1)} ({latest.robustness_class})
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      )}

      <Grid item xs={12} md={7}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Robustness by Model / Dataset / Attack
            </Typography>
            {benchChart.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={benchChart} margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94A3B8" interval={0} fontSize={10} />
                  <YAxis stroke="#94A3B8" unit="%" />
                  <Tooltip contentStyle={{ background: "#1E293B", border: "1px solid #334155" }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {benchChart.map((d, i) => (
                      <Cell key={i} fill={d.value <= 30 ? "#FF1744" : d.value <= 60 ? "#FF9800" : "#00C853"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary">
                No evaluations yet. Run one from the Evaluation page.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

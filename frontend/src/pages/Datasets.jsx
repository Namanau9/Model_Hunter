import React, { useEffect, useState } from "react";
import { Grid, Typography, Chip, Box } from "@mui/material";
import StorageIcon from "@mui/icons-material/Storage";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { apiGet } from "../api/client";
import PageShell from "../components/PageShell";
import Panel from "../components/Panel";

export default function Datasets() {
  const { tick } = useApp();
  const { notify } = useToast();
  const [datasets, setDatasets] = useState([]);

  const load = async () => {
    try {
      const r = await apiGet("/datasets");
      setDatasets(r.data.datasets || []);
    } catch (e) {
      notify("Could not load datasets", "warning");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return (
    <>
      <PageShell eyebrow="Assets" title="Datasets" subtitle="Datasets download automatically on first use." onRefresh={load} />
      <Grid container spacing={3} className="mh-reveal">
        {datasets.map((d) => (
          <Grid item xs={12} sm={6} md={4} key={d.name}>
            <Panel accent="#6D7CFF" sx={{ height: "100%" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <StorageIcon sx={{ color: "#6D7CFF" }} />
                <Typography variant="h5" className="mh-display">{d.name}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ my: 1.5 }}>{d.description}</Typography>
              <Chip label={`${d.classes} classes`} size="small" sx={{ mr: 0.5 }} />
              <Chip label={`${d.channels}-channel`} size="small" />
              <Box sx={{ mt: 2 }}>
                <Typography variant="overline" color="text.secondary">Compatible models</Typography>
                <Box sx={{ mt: 0.5 }}>
                  {d.compatible_models.map((m) => (
                    <Chip key={m} label={m} size="small" variant="outlined" sx={{ mr: 0.5, mt: 0.5 }} />
                  ))}
                </Box>
              </Box>
            </Panel>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
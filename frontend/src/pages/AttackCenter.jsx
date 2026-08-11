import React, { useEffect, useState } from "react";
import { Grid, Typography, Chip, Box } from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { apiGet } from "../api/client";
import PageShell from "../components/PageShell";
import Panel from "../components/Panel";

export default function AttackCenter() {
  const { tick } = useApp();
  const { notify } = useToast();
  const [attacks, setAttacks] = useState([]);

  const load = async () => {
    try {
      const r = await apiGet("/attacks");
      setAttacks(r.data.attacks || []);
    } catch (e) {
      notify("Could not load attacks", "warning");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return (
    <>
      <PageShell
        eyebrow="Adversary"
        title="Attack Center"
        subtitle="Five adversarial attack engines with configurable parameters."
        onRefresh={load}
      />
      <Grid container spacing={3} className="mh-reveal">
        {attacks.map((a) => (
          <Grid item xs={12} sm={6} md={4} key={a.name}>
            <Panel accent="#FF5C66" sx={{ height: "100%" }}>
              <SecurityIcon sx={{ color: "#FF5C66" }} />
              <Typography variant="h5" className="mh-display" sx={{ mt: 1 }}>{a.label}</Typography>
              <Typography variant="body2" color="text.secondary" className="mh-mono" sx={{ my: 1, fontSize: "0.78rem" }}>
                {Object.entries(a.defaults || {}).map(([k, v]) => `${k}=${v}`).join("  ·  ") || "no tunables"}
              </Typography>
              <Chip label={a.name} size="small" variant="outlined" sx={{ mt: 1 }} />
            </Panel>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
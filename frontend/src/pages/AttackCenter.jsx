import React, { useEffect, useState } from "react";
import { Grid, Card, CardContent, Typography, Chip, Box } from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { apiGet } from "../api/client";
import PageShell from "../components/PageShell";

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
        title="Attack Center"
        subtitle="Five adversarial attack engines with configurable parameters."
        onRefresh={load}
      />
      <Grid container spacing={3}>
        {attacks.map((a) => (
          <Grid item xs={12} sm={6} md={4} key={a.name}>
            <Card>
              <CardContent>
                <SecurityIcon sx={{ color: "#FF1744" }} />
                <Typography variant="h5" sx={{ mt: 1 }}>{a.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Defaults: {Object.entries(a.defaults || {}).map(([k, v]) => `${k}=${v}`).join(", ") || "no tunables"}
                </Typography>
                <Chip label={a.name} size="small" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
            </Grid>
    </>
  );
}

import React, { useEffect, useState } from "react";
import { Grid, Typography, Chip, Box } from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import { useApp } from "../contexts/AppContext";
import { useToast } from "../contexts/ToastContext";
import { apiGet } from "../api/client";
import PageShell from "../components/PageShell";
import Panel from "../components/Panel";

export default function DefenseCenter() {
  const { tick } = useApp();
  const { notify } = useToast();
  const [defenses, setDefenses] = useState([]);

  const load = async () => {
    try {
      const r = await apiGet("/defenses");
      setDefenses(r.data.defenses || []);
    } catch (e) {
      notify("Could not load defenses", "warning");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return (
    <>
      <PageShell
        eyebrow="Defender"
        title="Defense Center"
        subtitle="Defensive mechanisms to harden models against adversarial attacks."
        onRefresh={load}
      />
      <Grid container spacing={3} className="mh-reveal">
        {defenses.map((d) => (
          <Grid item xs={12} sm={6} md={4} key={d.name}>
            <Panel accent="#2FD18A" sx={{ height: "100%" }}>
              <ShieldIcon sx={{ color: "#2FD18A" }} />
              <Typography variant="h5" className="mh-display" sx={{ mt: 1 }}>{d.name.replace(/_/g, " ")}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>{d.description}</Typography>
              {d.methods?.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  {d.methods.map((m) => <Chip key={m} label={m} size="small" variant="outlined" sx={{ mr: 0.5, mt: 0.5 }} />)}
                </Box>
              )}
              <Chip label={d.name} size="small" variant="outlined" />
            </Panel>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
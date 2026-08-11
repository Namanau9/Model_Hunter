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

export default function Settings() {
  const { info, health, refresh } = useApp();
  return (
    <>
      <PageShell
        eyebrow="Platform"
        title="Settings"
        subtitle="Platform configuration and architecture information."
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
          <Panel corners eyebrow="Design" title="Architecture" accent="#6D7CFF" sx={{ height: "100%" }}>
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
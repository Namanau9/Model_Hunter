import React from "react";
import { Grid, Card, CardContent, Typography, Box, Chip } from "@mui/material";
import { useApp } from "../contexts/AppContext";
import PageShell from "../components/PageShell";

export default function Settings() {
  const { info, health, refresh } = useApp();
    return (
    <>
      <PageShell
        title="Settings"
        subtitle="Platform configuration and architecture information."
        onRefresh={refresh}
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>System Status</Typography>
            <Typography>Application: <b>{info?.app}</b></Typography>
            <Typography>Version: <b>{info?.version}</b></Typography>
            <Typography>API: <Chip label={health?.status === "ok" ? "ONLINE" : "OFFLINE"} color={health?.status === "ok" ? "success" : "error"} size="small" /></Typography>
            <Typography>Database: <Chip label={health?.database} color="primary" size="small" /></Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Architecture</Typography>
            {["React Frontend", "FastAPI API", "Service Layer", "ML Engines", "Evaluation", "Database / Reports"].map((a) => (
              <Chip key={a} label={a} variant="outlined" sx={{ mr: 1, mb: 1, "&:nth-child": { color: "#00E5FF" } }} />
            ))}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Business logic lives in the service layer and registries — never inside API routes.
            </Typography>
          </Card>
        </Grid>
            </Grid>
    </>
  );
}

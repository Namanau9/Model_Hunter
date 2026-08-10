import React, { useEffect, useState } from "react";
import { Grid, Card, CardContent, Typography, Chip, Box } from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import { apiGet } from "../api/client";

export default function AttackCenter() {
  const [attacks, setAttacks] = useState([]);

  useEffect(() => {
    (async () => {
      try { const r = await apiGet("/attacks"); setAttacks(r.data.attacks || []); }
      catch (e) { /* offline */ }
    })();
  }, []);

  return (
    <Box>
      <Typography variant="h4" sx={{ color: "#00E5FF" }}>Attack Center</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Five adversarial attack engines with configurable parameters.
      </Typography>
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
    </Box>
  );
}

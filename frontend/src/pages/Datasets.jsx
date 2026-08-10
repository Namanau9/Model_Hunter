import React, { useEffect, useState } from "react";
import { Grid, Card, CardContent, Typography, Chip, Box } from "@mui/material";
import StorageIcon from "@mui/icons-material/Storage";
import { apiGet } from "../api/client";
import StatCard from "../components/StatCard";

export default function Datasets() {
  const [datasets, setDatasets] = useState([]);

  useEffect(() => {
    (async () => {
      try { const r = await apiGet("/datasets"); setDatasets(r.data.datasets || []); }
      catch (e) { /* offline */ }
    })();
  }, []);

  return (
    <Box>
      <Typography variant="h4" sx={{ color: "#00E5FF" }}>Datasets</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Datasets download automatically on first use.
      </Typography>
      <Grid container spacing={3}>
        {datasets.map((d) => (
          <Grid item xs={12} md={4} key={d.name}>
            <Card>
              <CardContent>
                <StorageIcon color="secondary" />
                <Typography variant="h5" sx={{ mt: 1 }}>{d.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{d.description}</Typography>
                <Chip label={`${d.classes} classes`} size="small" sx={{ mr: 1 }} />
                <Chip label={`${d.channels}-channel`} size="small" />
                <Box sx={{ mt: 2 }}>
                  <Typography variant="overline" color="text.secondary">Compatible models</Typography>
                  <Box>
                    {d.compatible_models.map((m) => <Chip key={m} label={m} size="small" variant="outlined" sx={{ mr: 0.5 }} />)}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

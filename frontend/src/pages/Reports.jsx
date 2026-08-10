import React, { useEffect, useState } from "react";
import { Grid, Card, CardContent, Typography, Chip, Box, Button, Stack } from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import { apiGet } from "../api/client";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await apiGet("/reports");
        setReports(r.data.reports || []);
        const h = await apiGet("/evaluation/history");
        setHistory(h.data.history || []);
      } catch (e) { /* offline */ }
    })();
  }, []);

  return (
    <Box>
      <Typography variant="h4" sx={{ color: "#00E5FF" }}>Reports</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        PDF, HTML and CSV benchmarking reports generated from real evaluations.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Evaluation History</Typography>
            <Stack spacing={1}>
              {history.map((h) => (
                <Card key={h.id} variant="outlined">
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="subtitle2">
                      #{h.id} · {h.model}/{h.dataset} · {h.attack} {h.defense !== "none" && `+ ${h.defense}`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Robustness: {h.robustness_score.toFixed(1)} ({h.robustness_class})
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Generated Report Files
            </Typography>
            {reports.length === 0 ? (
              <Typography color="text.secondary">No reports generated yet.</Typography>
            ) : (
              <Stack spacing={1}>
                {reports.map((r) => (
                  <Card key={r.name} variant="outlined">
                    <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <DescriptionIcon color="secondary" />
                        <Box>
                          <Typography variant="subtitle2">{r.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{(r.size_bytes / 1024).toFixed(1)} KB</Typography>
                        </Box>
                      </Box>
                      <Box>
                        <Chip label="HTML" size="small" sx={{ mr: 0.5 }} />
                        <Chip label="CSV" size="small" sx={{ mr: 0.5 }} />
                        <Chip label="PDF" size="small" />
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

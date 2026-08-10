import React, { useEffect, useState } from "react";
import { Grid, Card, CardContent, Typography, Box, Button, Stack, Alert, Tooltip } from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import { apiGet } from "../api/client";

// Trigger a browser download of the requested report file via the backend.
async function downloadReport(evaluationId, fmt, fallbackName) {
  if (!evaluationId) return;
  try {
    const res = await fetch(`/api/reports/${evaluationId}/download/${fmt}`, { headers: { Accept: "*/*" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const m = disposition.match(/filename="?([^"]+)"?/i);
    const filename = m ? m[1] : `${fallbackName || "report"}.${fmt}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    window.alert(`Download failed: ${e.message}`);
  }
}

function DownloadButtons({ id, name }) {
  if (!id) return <Typography variant="caption" color="text.secondary">(no matching evaluation)</Typography>;
  return (
    <Box sx={{ display: "flex", gap: 0.5 }}>
      {["html", "csv", "pdf"].map((fmt) => (
        <Tooltip key={fmt} title={`Download ${fmt.toUpperCase()}`}>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            onClick={() => downloadReport(id, fmt, name)}
          >
            {fmt.toUpperCase()}
          </Button>
        </Tooltip>
      ))}
    </Box>
  );
}

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
        PDF, HTML and CSV benchmarking reports generated from real evaluations. Use the buttons to download each format.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Evaluation History</Typography>
            <Stack spacing={1}>
              {history.length === 0 && (
                <Alert severity="info">No evaluations yet. Run one from the Evaluation page to generate reports.</Alert>
              )}
              {history.map((h) => (
                <Card key={h.id} variant="outlined">
                  <CardContent sx={{ py: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                      <Box>
                        <Typography variant="subtitle2">
                          #{h.id} · {h.model}/{h.dataset} · {h.attack} {h.defense !== "none" && `+ ${h.defense}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Robustness: {h.robustness_score.toFixed(1)} ({h.robustness_class})
                        </Typography>
                      </Box>
                      <DownloadButtons id={h.id} name={h.report_path} />
                    </Box>
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
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <DownloadButtons id={r.evaluation_id} name={r.name} />
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

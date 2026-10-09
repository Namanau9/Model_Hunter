import React, { useState } from "react";
import { Box, Button, CircularProgress, Tooltip, Typography } from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { useToast } from "../../contexts/ToastContext";
import { downloadReport } from "../../lib/reports";

const FORMATS = ["html", "csv", "pdf"];

/** HTML / CSV / PDF report downloads for one evaluation. */
export default function DownloadButtons({ id, name, compact = false }) {
  const { notify } = useToast();
  const [busy, setBusy] = useState(null);
  if (!id) {
    return (
      <Typography sx={{ fontSize: "0.76rem", color: "var(--ink-3)" }}>
        no linked evaluation
      </Typography>
    );
  }
  const handle = async (fmt) => {
    setBusy(fmt);
    try {
      const filename = await downloadReport(id, fmt, name);
      notify(`Downloaded ${filename}`, "success");
    } catch (e) {
      notify(`Download failed: ${e.message}`, "error");
    } finally {
      setBusy(null);
    }
  };
  return (
    <Box sx={{ display: "inline-flex", border: "1px solid var(--line-strong)", borderRadius: "6px", overflow: "hidden", flexShrink: 0 }}>
      {FORMATS.map((fmt, i) => (
        <Tooltip key={fmt} title={`Download ${fmt.toUpperCase()} report`}>
          <span style={{ display: "flex" }}>
            <Button
              size="small"
              onClick={() => handle(fmt)}
              disabled={!!busy}
              startIcon={busy === fmt ? <CircularProgress size={12} color="inherit" /> : !compact && i === 0 ? <FileDownloadOutlinedIcon /> : null}
              aria-label={`Download ${fmt.toUpperCase()} report for evaluation ${id}`}
              sx={{
                borderRadius: 0,
                minWidth: 0,
                minHeight: 32,
                px: compact ? 1 : 1.25,
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                fontWeight: 500,
                color: "var(--ink)",
                borderLeft: i ? "1px solid var(--line-strong)" : "none",
                "& .MuiButton-startIcon": { mr: 0.5 },
                "& svg": { fontSize: 15 },
              }}
            >
              {fmt.toUpperCase()}
            </Button>
          </span>
        </Tooltip>
      ))}
    </Box>
  );
}

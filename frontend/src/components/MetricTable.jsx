import React from "react";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
} from "@mui/material";

export default function MetricTable({ metrics }) {
  const rows = metrics
    ? Object.entries(metrics)
        .filter(([k]) => !["robustness_class", "n_samples"].includes(k))
        .map(([k, v]) => [k.replace(/_/g, " "), typeof v === "number" ? v : String(v)])
    : [];
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Metric</TableCell>
            <TableCell align="right">Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(([k, v], i) => (
            <TableRow key={k} sx={{ bgcolor: i % 2 ? "rgba(0,229,255,.03)" : "transparent" }}>
              <TableCell sx={{ textTransform: "capitalize" }}>{k}</TableCell>
              <TableCell align="right">{typeof v === "number" && k !== "execution_time" ? `${v.toFixed(2)}%` : v}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

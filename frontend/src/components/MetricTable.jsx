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
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
      <Table size="small" sx={{ minWidth: 380 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontFamily: "var(--mh-font-mono)", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "0.72rem" }}>Metric</TableCell>
            <TableCell align="right" sx={{ fontFamily: "var(--mh-font-mono)", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "0.72rem" }}>Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(([k, v], i) => (
            <TableRow key={k} sx={{ backgroundColor: i % 2 ? "rgba(255,255,255,0.02)" : "transparent" }}>
              <TableCell sx={{ textTransform: "capitalize", color: "text.secondary" }}>{k}</TableCell>
              <TableCell align="right" className="mh-mono" sx={{ fontWeight: 600 }}>
                {typeof v === "number" && k !== "execution_time" ? `${v.toFixed(2)}%` : v}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
import React, { useMemo, useState } from "react";
import {
  Box, Button, Grid, InputAdornment, MenuItem, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TextField, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import StatTile from "../components/ui/StatTile";
import ClassBadge from "../components/ui/ClassBadge";
import EmptyState from "../components/ui/EmptyState";
import DownloadButtons from "../components/ui/DownloadButtons";
import ChartTooltip, { useChartChrome } from "../components/viz/ChartTooltip";
import useApiGet from "../hooks/useApiGet";
import { bytes, pct, timeAgo, dateTime } from "../lib/format";
import { statusVar, statusTextVar } from "../theme/tokens";

const EMPTY = [];
const COLS = [
  { id: "id", label: "#", num: true },
  { id: "config", label: "Configuration" },
  { id: "clean_accuracy", label: "Clean", num: true },
  { id: "adversarial_accuracy", label: "Adversarial", num: true },
  { id: "attack_success_rate", label: "ASR", num: true },
  { id: "robustness_score", label: "Robustness", num: true },
  { id: "created_at", label: "When" },
];

function ScoreBar({ value, klass }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "flex-end" }}>
      <Box sx={{ width: 56, height: 4, borderRadius: 1, background: "var(--sunken)", overflow: "hidden", display: { xs: "none", lg: "block" } }} aria-hidden>
        <Box sx={{ width: `${Math.max(0, Math.min(100, value))}%`, height: "100%", background: statusVar(klass) }} />
      </Box>
      <Typography className="mh-mono" sx={{ fontWeight: 600, fontSize: "0.86rem", minWidth: 36, textAlign: "right" }}>
        {value.toFixed(1)}
      </Typography>
    </Box>
  );
}

export default function Reports() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("md"));
  const { axis, grid, cursorFill, t } = useChartChrome();
  // Same two requests as before: /reports and /evaluation/history.
  const reportsQ = useApiGet("/reports", (r) => r.data.reports || []);
  const historyQ = useApiGet("/evaluation/history", (r) => r.data.history || []);
  const reports = reportsQ.data || EMPTY;
  const history = historyQ.data || EMPTY;
  const loading = (reportsQ.loading && !reportsQ.data) || (historyQ.loading && !historyQ.data);
  const error = historyQ.error && !historyQ.data ? historyQ.error : null;

  const [q, setQ] = useState("");
  const [klass, setKlass] = useState("all");
  const [attack, setAttack] = useState("all");
  const [sort, setSort] = useState({ by: "id", dir: "desc" });

  const reload = () => {
    reportsQ.reload();
    historyQ.reload();
  };

  const attacks = useMemo(() => [...new Set(history.map((h) => h.attack))], [history]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    let r = history.filter(
      (h) =>
        (klass === "all" || h.robustness_class === klass) &&
        (attack === "all" || h.attack === attack) &&
        (!s || `${h.id} ${h.model} ${h.dataset} ${h.attack} ${h.defense}`.toLowerCase().includes(s))
    );
    const key = (h) => (sort.by === "config" ? `${h.model}/${h.dataset}/${h.attack}` : h[sort.by]);
    r = [...r].sort((a, b) => {
      const x = key(a);
      const y = key(b);
      const c = x < y ? -1 : x > y ? 1 : 0;
      return sort.dir === "asc" ? c : -c;
    });
    return r;
  }, [history, q, klass, attack, sort]);

  const stats = useMemo(() => {
    if (!history.length) return null;
    const mean = history.reduce((s, h) => s + h.robustness_score, 0) / history.length;
    const best = history.reduce((a, b) => (b.robustness_score > a.robustness_score ? b : a));
    const worst = history.reduce((a, b) => (b.robustness_score < a.robustness_score ? b : a));
    return { mean, best, worst };
  }, [history]);

  const byAttack = useMemo(() => {
    const m = {};
    history.forEach((h) => {
      m[h.attack] = m[h.attack] || { attack: h.attack.toUpperCase(), sum: 0, n: 0 };
      m[h.attack].sum += h.robustness_score;
      m[h.attack].n += 1;
    });
    return Object.values(m).map((v) => ({ attack: v.attack, mean: +(v.sum / v.n).toFixed(2), n: v.n }));
  }, [history]);

  const accuracyPairs = useMemo(
    () =>
      [...history]
        .slice(0, 10)
        .reverse()
        .map((h) => ({ name: `#${h.id}`, cfg: `${h.model}/${h.dataset}/${h.attack}`, clean: +h.clean_accuracy.toFixed(2), adv: +h.adversarial_accuracy.toFixed(2) })),
    [history]
  );

  const toggleSort = (id) => setSort((s) => (s.by === id ? { by: id, dir: s.dir === "asc" ? "desc" : "asc" } : { by: id, dir: id === "config" ? "asc" : "desc" }));

  return (
    <Box>
      <PageHeader section="Analysis" title="Reports" subtitle="Every evaluation is stored with HTML, CSV and PDF reports. Filter, compare and download them here." onRefresh={reload} />

      {error && (
        <Panel sx={{ mb: 2.5 }}>
          <EmptyState compact icon={<CloudOffOutlinedIcon />} tone="var(--status-weak-text)" title="Couldn't load evaluation history" text={error} action={<Button variant="outlined" onClick={reload}>Retry</Button>} />
        </Panel>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={6} md={3}>
          <StatTile label="Evaluations" value={history.length} sub={`${reports.length} report bundles on disk`} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatTile label="Mean robustness" value={stats?.mean} decimals={1} sub="across all runs" bar={stats?.mean} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatTile
            label="Most robust"
            display={<Box component="span" sx={{ color: stats ? statusTextVar(stats.best.robustness_class) : undefined }}>{stats ? stats.best.robustness_score.toFixed(1) : "—"}</Box>}
            sub={stats ? `#${stats.best.id} ${stats.best.model}/${stats.best.dataset} · ${stats.best.attack}` : "—"}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatTile
            label="Least robust"
            marker="var(--status-weak)"
            display={<Box component="span" sx={{ color: stats ? statusTextVar(stats.worst.robustness_class) : undefined }}>{stats ? stats.worst.robustness_score.toFixed(1) : "—"}</Box>}
            sub={stats ? `#${stats.worst.id} ${stats.worst.model}/${stats.worst.dataset} · ${stats.worst.attack}` : "—"}
          />
        </Grid>

        <Grid item xs={12} md={5}>
          <Panel title="Mean robustness by attack" caption="higher is more robust" sx={{ height: "100%" }}>
            {byAttack.length === 0 ? (
              <Typography sx={{ fontSize: "0.88rem", color: "var(--ink-2)" }}>{loading ? "Loading…" : "No data yet."}</Typography>
            ) : (
              <Box role="img" aria-label="Mean robustness score per attack">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={byAttack} margin={{ top: 18, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid {...grid} />
                    <XAxis dataKey="attack" {...axis} />
                    <YAxis domain={[0, 100]} ticks={[0, 30, 60, 100]} {...axis} axisLine={false} />
                    <Tooltip cursor={{ fill: cursorFill }} content={<ChartTooltip format={(v, n, p) => `${Number(v).toFixed(1)} (n=${p.n})`} />} />
                    <Bar dataKey="mean" name="Mean robustness" fill={t.series[0]} radius={[3, 3, 0, 0]} maxBarSize={40} label={{ position: "top", fill: t.ink2, fontSize: 11, fontFamily: "IBM Plex Mono", formatter: (v) => Number(v).toFixed(0) }} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Panel>
        </Grid>
        <Grid item xs={12} md={7}>
          <Panel title="Clean vs adversarial accuracy" caption="last 10 runs" sx={{ height: "100%" }}>
            {accuracyPairs.length === 0 ? (
              <Typography sx={{ fontSize: "0.88rem", color: "var(--ink-2)" }}>{loading ? "Loading…" : "No data yet."}</Typography>
            ) : (
              <Box role="img" aria-label="Grouped bars comparing clean and adversarial accuracy for the last 10 evaluations">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={accuracyPairs} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barGap={2}>
                    <CartesianGrid {...grid} />
                    <XAxis dataKey="name" {...axis} />
                    <YAxis domain={[0, 100]} unit="%" {...axis} axisLine={false} />
                    <Tooltip cursor={{ fill: cursorFill }} content={<ChartTooltip title={(p) => `${p.name} · ${p.cfg}`} format={(v) => `${Number(v).toFixed(1)}%`} />} />
                    <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 12, color: t.ink2, paddingTop: 6 }} />
                    <Bar dataKey="clean" name="Clean" fill={t.series[0]} radius={[2, 2, 0, 0]} maxBarSize={16} />
                    <Bar dataKey="adv" name="Adversarial" fill={t.series[1]} radius={[2, 2, 0, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Panel>
        </Grid>

        <Grid item xs={12}>
          <Panel title="Evaluation history" caption={`${rows.length} of ${history.length} shown`}>
            <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", mb: 2 }}>
              <TextField
                size="small"
                placeholder="Search model, dataset, attack…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                inputProps={{ "aria-label": "Search evaluations" }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ flex: "1 1 240px" }}
              />
              <TextField select size="small" label="Class" value={klass} onChange={(e) => setKlass(e.target.value)} sx={{ minWidth: 150 }}>
                {["all", "Strong", "Moderate", "Weak"].map((k) => (
                  <MenuItem key={k} value={k}>
                    {k === "all" ? "All classes" : k}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select size="small" label="Attack" value={attack} onChange={(e) => setAttack(e.target.value)} sx={{ minWidth: 150 }}>
                <MenuItem value="all">All attacks</MenuItem>
                {attacks.map((a) => (
                  <MenuItem key={a} value={a}>
                    {a.toUpperCase()}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {loading ? (
              <Box sx={{ display: "grid", gap: 1 }}>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rounded" height={44} />
                ))}
              </Box>
            ) : history.length === 0 ? (
              <EmptyState
                compact
                icon={<AssessmentOutlinedIcon />}
                title="No evaluations yet"
                text="Run one from the Evaluation page and its reports appear here."
                action={
                  <Button component={RouterLink} to="/evaluation" variant="contained" startIcon={<PlayArrowRoundedIcon />}>
                    New evaluation
                  </Button>
                }
              />
            ) : rows.length === 0 ? (
              <Typography sx={{ color: "var(--ink-2)", py: 3, textAlign: "center" }}>No evaluations match these filters.</Typography>
            ) : mobile ? (
              <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, borderTop: "1px solid var(--line)" }}>
                {rows.map((h) => (
                  <Box component="li" key={h.id} sx={{ py: 1.5, borderBottom: "1px solid var(--line)" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.88rem" }}>
                        <Box component="span" className="mh-mono" sx={{ color: "var(--ink-3)", fontWeight: 400 }}>
                          #{h.id}
                        </Box>{" "}
                        {h.model}/{h.dataset}
                      </Typography>
                      <ClassBadge klass={h.robustness_class} size="sm" />
                    </Box>
                    <Typography sx={{ fontSize: "0.78rem", color: "var(--ink-3)", mt: 0.25 }}>
                      {h.attack.toUpperCase()}
                      {h.defense && h.defense !== "none" ? ` + ${h.defense.replace(/_/g, " ")}` : ""} · {timeAgo(h.created_at)}
                    </Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, my: 1 }}>
                      {[
                        ["clean", pct(h.clean_accuracy)],
                        ["adv", pct(h.adversarial_accuracy)],
                        ["ASR", pct(h.attack_success_rate)],
                        ["score", h.robustness_score.toFixed(1)],
                      ].map(([k, v]) => (
                        <Box key={k}>
                          <Typography sx={{ fontSize: "0.7rem", color: "var(--ink-3)" }}>{k}</Typography>
                          <Typography className="mh-mono" sx={{ fontSize: "0.82rem", fontWeight: 500 }}>
                            {v}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    <DownloadButtons id={h.id} name={h.report_path} compact />
                  </Box>
                ))}
              </Box>
            ) : (
              <TableContainer>
                <Table size="small" aria-label="Evaluation history">
                  <TableHead>
                    <TableRow>
                      {COLS.map((c) => (
                        <TableCell key={c.id} align={c.num ? "right" : "left"} sortDirection={sort.by === c.id ? sort.dir : false}>
                          <TableSortLabel active={sort.by === c.id} direction={sort.by === c.id ? sort.dir : "asc"} onClick={() => toggleSort(c.id)}>
                            {c.label}
                          </TableSortLabel>
                        </TableCell>
                      ))}
                      <TableCell align="right">Reports</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell align="right" className="mh-mono" sx={{ color: "var(--ink-3)" }}>
                          {h.id}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: "0.86rem", fontWeight: 500 }}>
                            {h.model}/{h.dataset}
                          </Typography>
                          <Typography sx={{ fontSize: "0.74rem", color: "var(--ink-3)" }}>
                            {h.attack.toUpperCase()}
                            {h.defense && h.defense !== "none" ? ` + ${h.defense.replace(/_/g, " ")}` : ""}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" className="mh-mono">
                          {pct(h.clean_accuracy)}
                        </TableCell>
                        <TableCell align="right" className="mh-mono">
                          {pct(h.adversarial_accuracy)}
                        </TableCell>
                        <TableCell align="right" className="mh-mono">
                          {pct(h.attack_success_rate)}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                            <ScoreBar value={h.robustness_score} klass={h.robustness_class} />
                            <ClassBadge klass={h.robustness_class} size="sm" />
                          </Box>
                        </TableCell>
                        <TableCell title={dateTime(h.created_at)} sx={{ color: "var(--ink-2)", whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                          {timeAgo(h.created_at)}
                        </TableCell>
                        <TableCell align="right">
                          <DownloadButtons id={h.id} name={h.report_path} compact />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Panel>
        </Grid>

        <Grid item xs={12}>
          <Panel title="Report files" caption={`${reports.length} bundles in the reports directory`}>
            {reports.length === 0 ? (
              <Typography sx={{ fontSize: "0.88rem", color: "var(--ink-2)" }}>{loading ? "Loading…" : "No reports generated yet."}</Typography>
            ) : (
              <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, columnGap: 4, borderTop: "1px solid var(--line)" }}>
                {reports.map((r) => (
                  <Box component="li" key={r.name} sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 1, borderBottom: "1px solid var(--line)", minWidth: 0 }}>
                    <InsertDriveFileOutlinedIcon sx={{ color: "var(--ink-3)", fontSize: 18 }} aria-hidden />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography className="mh-mono" noWrap title={r.name} sx={{ fontSize: "0.8rem" }}>
                        {r.name}
                      </Typography>
                      <Typography className="mh-mono" sx={{ fontSize: "0.7rem", color: "var(--ink-3)" }}>
                        {bytes(r.size_bytes)}
                        {r.evaluation_id ? ` · evaluation #${r.evaluation_id}` : ""}
                      </Typography>
                    </Box>
                    <DownloadButtons id={r.evaluation_id} name={r.name} compact />
                  </Box>
                ))}
              </Box>
            )}
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
}

import React, { useMemo } from "react";
import { Box, Button, Grid, Skeleton, Typography, useMediaQuery, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import { Link as RouterLink } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, BarChart, Bar, Cell } from "recharts";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import RadarOutlinedIcon from "@mui/icons-material/RadarOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import RobustnessRing from "../components/ui/RobustnessRing";
import ClassBadge from "../components/ui/ClassBadge";
import EmptyState from "../components/ui/EmptyState";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import AdversarialHero from "../components/adversarial/AdversarialHero";
import PipelineFlow from "../components/viz/PipelineFlow";
import ChartTooltip, { useChartChrome } from "../components/viz/ChartTooltip";
import useApiGet from "../hooks/useApiGet";
import { useApp } from "../contexts/AppContext";
import { pct, timeAgo, dateTime } from "../lib/format";
import { statusVar, statusTextVar } from "../theme/tokens";

const EMPTY = [];
const SHORT = { hopskipjump: "HSJ", fgsm: "FGSM", pgd: "PGD", cw: "C&W", zoo: "ZOO" };
const cfgName = (r) => `${r.model}/${r.dataset}/${SHORT[r.attack] || r.attack}${r.defense && r.defense !== "none" ? "+def" : ""}`;

function Inventory({ info }) {
  const cells = [
    ["Models", info?.models],
    ["Datasets", info?.datasets],
    ["Attacks", info?.attacks],
    ["Defenses", info?.defenses?.map((d) => d.replace(/_/g, " "))],
  ];
  return (
    <Panel padding={0} sx={{ mb: 2.5 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" } }}>
        {cells.map(([k, list], i) => (
          <Box
            key={k}
            sx={{
              p: 2,
              borderLeft: { md: i ? "1px solid var(--line)" : "none", xs: i % 2 ? "1px solid var(--line)" : "none" },
              borderTop: { xs: i > 1 ? "1px solid var(--line)" : "none", md: "none" },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
              <Typography className="mh-display mh-tabular" sx={{ fontSize: "1.6rem", fontWeight: 600, lineHeight: 1 }}>
                <AnimatedNumber value={list?.length} />
              </Typography>
              <Typography sx={{ fontSize: "0.86rem", color: "var(--ink-2)" }}>{k.toLowerCase()}</Typography>
            </Box>
            <Typography className="mh-mono" sx={{ mt: 0.75, fontSize: "0.72rem", color: "var(--ink-3)" }}>
              {list?.length ? list.join(" · ") : "—"}
            </Typography>
          </Box>
        ))}
      </Box>
    </Panel>
  );
}

function LatestReading({ latest, loading }) {
  if (loading) return <Skeleton variant="rounded" height={320} />;
  if (!latest) {
    return (
      <EmptyState
        icon={<RadarOutlinedIcon />}
        title="No evaluations yet"
        text="Run your first evaluation to see a robustness reading here."
        action={
          <Button component={RouterLink} to="/evaluation" variant="contained" endIcon={<ArrowForwardRoundedIcon />}>
            New evaluation
          </Button>
        }
      />
    );
  }
  const rows = [
    ["Configuration", `${latest.model} / ${latest.dataset}`],
    ["Attack", `${latest.attack.toUpperCase()}${latest.defense && latest.defense !== "none" ? ` + ${latest.defense.replace(/_/g, " ")}` : ""}`],
    ["Clean accuracy", pct(latest.clean_accuracy)],
    ["Adversarial accuracy", pct(latest.adversarial_accuracy)],
    ["Attack success rate", pct(latest.attack_success_rate)],
  ];
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "auto 1fr" }, gap: 3, alignItems: "center" }}>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <RobustnessRing score={latest.robustness_score} klass={latest.robustness_class} size={170} showBadge={false} />
      </Box>
      <Box>
        {rows.map(([k, v]) => (
          <Box key={k} sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.8, borderBottom: "1px solid var(--line)" }}>
            <Typography sx={{ fontSize: "0.84rem", color: "var(--ink-2)" }}>{k}</Typography>
            <Typography className="mh-mono" sx={{ fontSize: "0.84rem", fontWeight: 500, textAlign: "right" }}>
              {v}
            </Typography>
          </Box>
        ))}
        <Typography className="mh-mono" sx={{ fontSize: "0.72rem", color: "var(--ink-3)", mt: 1 }}>
          evaluation #{latest.id} · {timeAgo(latest.created_at)}
        </Typography>
      </Box>
    </Box>
  );
}

function ClassMix({ history }) {
  const counts = useMemo(() => {
    const c = { Weak: 0, Moderate: 0, Strong: 0 };
    history.forEach((h) => c[h.robustness_class] != null && c[h.robustness_class]++);
    return c;
  }, [history]);
  const total = history.length || 1;
  return (
    <Box>
      <Box sx={{ display: "flex", height: 10, borderRadius: "3px", overflow: "hidden", gap: "2px" }} role="img" aria-label={`Weak ${counts.Weak}, Moderate ${counts.Moderate}, Strong ${counts.Strong}`}>
        {["Weak", "Moderate", "Strong"].map((k) =>
          counts[k] ? (
            <Box key={k} component={motion.div} initial={{ flexGrow: 0 }} animate={{ flexGrow: counts[k] }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} sx={{ flexBasis: 0, background: statusVar(k), minWidth: 4 }} />
          ) : null
        )}
      </Box>
      <Box sx={{ mt: 1.75, display: "grid", gap: 0.75 }}>
        {["Strong", "Moderate", "Weak"].map((k) => (
          <Box key={k} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <ClassBadge klass={k} size="sm" />
            <Typography className="mh-mono" sx={{ fontSize: "0.84rem" }}>
              {counts[k]}{" "}
              <Box component="span" sx={{ color: "var(--ink-3)" }}>
                ({Math.round((counts[k] / total) * 100)}%)
              </Box>
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function Dashboard() {
  const { info, refresh } = useApp();
  const { axis, grid, cursorFill, t } = useChartChrome();
  const small = useMediaQuery(useTheme().breakpoints.down("sm"));
  const { data: history, loading, error, reload } = useApiGet("/evaluation/history", (r) => r.data?.history || []);
  const rows = history || EMPTY;
  const latest = rows[0] || null;

  const trend = useMemo(
    () =>
      [...rows].reverse().map((r) => ({ id: r.id, label: `#${r.id}`, when: dateTime(r.created_at), score: Number(r.robustness_score), klass: r.robustness_class, cfg: cfgName(r) })),
    [rows]
  );
  const byConfig = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => {
      const k = cfgName(r);
      if (!m.has(k)) m.set(k, { name: k, score: r.robustness_score, klass: r.robustness_class });
    });
    return [...m.values()].slice(0, 12);
  }, [rows]);
  const weakest = useMemo(() => (rows.length ? rows.reduce((a, b) => (b.robustness_score < a.robustness_score ? b : a)) : null), [rows]);

  return (
    <Box>
      <PageHeader
        section="Overview"
        title="Dashboard"
        subtitle="How your models hold up under attack, from evaluation runs stored by the backend."
        actions={
          <>
            <Button component={RouterLink} to="/attacks#lab" variant="outlined" sx={{ display: { xs: "none", sm: "inline-flex" } }}>
              Open lab
            </Button>
            <Button component={RouterLink} to="/evaluation" variant="contained" startIcon={<PlayArrowRoundedIcon />}>
              New evaluation
            </Button>
          </>
        }
      />

      <Inventory info={info} />

      {error && !history && (
        <Panel sx={{ mb: 2.5 }}>
          <EmptyState
            compact
            icon={<CloudOffOutlinedIcon />}
            tone="var(--status-weak-text)"
            title="Couldn't load evaluation history"
            text={error}
            action={
              <Button
                variant="outlined"
                onClick={() => {
                  refresh();
                  reload();
                }}
              >
                Retry
              </Button>
            }
          />
        </Panel>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={7}>
          <Panel title="What an adversarial attack does" caption="x + δ = x′" sx={{ height: "100%" }}>
            <AdversarialHero figure={1} />
          </Panel>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Panel title="Latest evaluation" marker="var(--blue)" sx={{ height: "100%" }} actions={latest && <ClassBadge klass={latest.robustness_class} size="sm" />}>
            <LatestReading latest={latest} loading={loading && !history} />
          </Panel>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Panel title="Robustness over time" caption={`${rows.length} runs · score 0–100`} sx={{ height: "100%" }}>
            {loading && !history ? (
              <Skeleton variant="rounded" height={280} />
            ) : trend.length < 2 ? (
              <EmptyState compact icon={<TimelineOutlinedIcon />} title="Needs at least two runs" text="Each evaluation adds a point to this line." />
            ) : (
              <Box role="img" aria-label={`Robustness trend across ${trend.length} evaluations; latest ${trend[trend.length - 1].score}`}>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trend} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid {...grid} />
                    <XAxis dataKey="label" {...axis} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis domain={[0, 100]} ticks={[0, 30, 60, 100]} {...axis} axisLine={false} />
                    <ReferenceLine y={30} stroke={t.lineStrong} strokeDasharray="4 4" label={{ value: "weak ≤ 30", position: "insideBottomRight", fill: t.ink3, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                    <ReferenceLine y={60} stroke={t.lineStrong} strokeDasharray="4 4" label={{ value: "strong > 60", position: "insideTopRight", fill: t.ink3, fontSize: 10, fontFamily: "IBM Plex Mono" }} />
                    <Tooltip cursor={{ stroke: t.lineStrong }} content={<ChartTooltip title={(p) => `${p.label} · ${p.cfg} · ${p.when}`} format={(v, n, p) => `${Number(v).toFixed(1)} (${p.klass})`} />} />
                    <Area
                      type="linear"
                      dataKey="score"
                      name="Robustness"
                      stroke={t.series[0]}
                      strokeWidth={2}
                      fill={t.series[0]}
                      fillOpacity={0.08}
                      dot={{ r: 3.5, strokeWidth: 2, stroke: t.raised, fill: t.series[0] }}
                      activeDot={{ r: 5, stroke: t.raised, strokeWidth: 2 }}
                      animationDuration={800}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Panel>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: "grid", gap: 2.5, height: "100%" }}>
            <Panel title="Robustness classes" caption="share of all runs">
              {rows.length ? <ClassMix history={rows} /> : <Typography sx={{ fontSize: "0.88rem", color: "var(--ink-2)" }}>No runs yet.</Typography>}
            </Panel>
            <Panel title="Weakest configuration" marker="var(--status-weak)">
              {weakest ? (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
                    <Typography className="mh-mono" sx={{ fontSize: "0.9rem", fontWeight: 600 }}>
                      {weakest.model}/{weakest.dataset}
                    </Typography>
                    <Typography className="mh-display mh-tabular" sx={{ fontSize: "1.6rem", fontWeight: 600, color: statusTextVar(weakest.robustness_class), lineHeight: 1 }}>
                      {weakest.robustness_score.toFixed(1)}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: "0.84rem", color: "var(--ink-2)", mt: 0.5 }}>
                    {weakest.attack.toUpperCase()}
                    {weakest.defense && weakest.defense !== "none" ? ` with ${weakest.defense.replace(/_/g, " ")}` : ", no defense"}. Attack success {pct(weakest.attack_success_rate)}.
                  </Typography>
                  <Button component={RouterLink} to="/defenses" size="small" color="primary" endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 1, px: 0 }}>
                    Compare defenses
                  </Button>
                </Box>
              ) : (
                <Typography sx={{ fontSize: "0.88rem", color: "var(--ink-2)" }}>Nothing measured yet.</Typography>
              )}
            </Panel>
          </Box>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Panel title="Latest score per configuration" caption="model / dataset / attack" sx={{ height: "100%" }}>
            {loading && !history ? (
              <Skeleton variant="rounded" height={280} />
            ) : byConfig.length === 0 ? (
              <Typography sx={{ fontSize: "0.88rem", color: "var(--ink-2)" }}>Run evaluations across models and attacks to compare them here.</Typography>
            ) : (
              <>
                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1.5 }}>
                  {["Strong", "Moderate", "Weak"].map((k) => (
                    <ClassBadge key={k} klass={k} size="sm" />
                  ))}
                </Box>
                <Box role="img" aria-label="Latest robustness score for each configuration">
                  <ResponsiveContainer width="100%" height={Math.max(220, byConfig.length * 30)}>
                    <BarChart data={byConfig} layout="vertical" margin={{ top: 0, right: 36, left: 4, bottom: 0 }} barCategoryGap={6}>
                      <CartesianGrid {...grid} horizontal={false} vertical />
                      <XAxis type="number" domain={[0, 100]} ticks={[0, 30, 60, 100]} {...axis} />
                      <YAxis type="category" dataKey="name" width={small ? 150 : 190} {...axis} tick={{ ...axis.tick, fontSize: small ? 9.5 : 11 }} axisLine={false} />
                      <Tooltip cursor={{ fill: cursorFill }} content={<ChartTooltip format={(v, n, p) => `${Number(v).toFixed(1)} · ${p.klass}`} />} />
                      <Bar dataKey="score" name="Robustness" radius={[0, 3, 3, 0]} maxBarSize={14} label={{ position: "right", fill: t.ink2, fontSize: 11, fontFamily: "IBM Plex Mono", formatter: (v) => Number(v).toFixed(0) }}>
                        {byConfig.map((d) => (
                          <Cell key={d.name} fill={t.status[d.klass]?.fill || t.series[0]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </>
            )}
          </Panel>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Panel
            title="Recent evaluations"
            sx={{ height: "100%" }}
            actions={
              <Button component={RouterLink} to="/reports" size="small" endIcon={<ArrowForwardRoundedIcon />}>
                All reports
              </Button>
            }
          >
            {rows.length === 0 ? (
              <Typography sx={{ fontSize: "0.88rem", color: "var(--ink-2)" }}>{loading ? "Loading…" : "No evaluations logged."}</Typography>
            ) : (
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
                {rows.slice(0, 7).map((r, i) => (
                  <Box
                    component={motion.li}
                    key={r.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.04 }}
                    sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, borderTop: i ? "1px solid var(--line)" : "none" }}
                  >
                    <Typography className="mh-mono" sx={{ fontSize: "0.74rem", color: "var(--ink-3)", width: 28 }}>
                      #{r.id}
                    </Typography>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: "0.86rem", fontWeight: 500 }}>
                        {r.model}/{r.dataset}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: "0.76rem", color: "var(--ink-3)" }}>
                        {r.attack.toUpperCase()}
                        {r.defense && r.defense !== "none" ? ` + ${r.defense.replace(/_/g, " ")}` : ""} · {timeAgo(r.created_at)}
                      </Typography>
                    </Box>
                    <Typography className="mh-mono" sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {r.robustness_score.toFixed(1)}
                    </Typography>
                    <ClassBadge klass={r.robustness_class} size="sm" />
                  </Box>
                ))}
              </Box>
            )}
          </Panel>
        </Grid>

        <Grid item xs={12}>
          <Panel title="Evaluation pipeline" caption="score = 0.4·adv_acc + 0.3·(100 − ASR) + 0.3·retained_confidence">
            <PipelineFlow steps={info?.architecture || ["React Frontend", "FastAPI API", "Service Layer", "ML Engines", "Evaluation", "Database / Reports"]} compact />
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
}

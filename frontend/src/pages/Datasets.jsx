import React, { useMemo, useState } from "react";
import { Box, Button, Collapse, Grid, Skeleton, Typography } from "@mui/material";
import { motion } from "framer-motion";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import PageHeader from "../components/ui/PageHeader";
import Panel, { FieldLabel, FigCaption } from "../components/ui/Panel";
import EmptyState from "../components/ui/EmptyState";
import useApiGet from "../hooks/useApiGet";
import { CLASS_NAMES, DATASET_META, MODEL_META } from "../lib/constants";
import { datasetMosaic } from "../lib/adversarial/mosaic";

function Mosaic({ dataset }) {
  const tiles = useMemo(() => datasetMosaic(dataset, 12, 64), [dataset]);
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0,1fr))", gap: 0.5 }}>
      {tiles.map((t, i) => (
        <Box
          key={i}
          component={motion.img}
          src={t.src}
          alt=""
          title={t.label}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.025, duration: 0.25 }}
          style={{ scaleX: t.flip ? -1 : 1 }}
          className="mh-pixel"
          sx={{ width: "100%", aspectRatio: "1/1", borderRadius: "3px", display: "block", filter: t.hue ? `hue-rotate(${t.hue}deg)` : undefined }}
        />
      ))}
    </Box>
  );
}

function DatasetCard({ d, n }) {
  const [open, setOpen] = useState(false);
  const meta = DATASET_META[d.name] || {};
  const names = CLASS_NAMES[d.name] || [];
  return (
    <Panel lift title={meta.label || d.name} caption={d.description} sx={{ height: "100%" }}>
      <Mosaic dataset={d.name} />
      <FigCaption n={n}>Illustrative tiles drawn in the browser, not dataset images.</FigCaption>

      <Box component="dl" sx={{ m: 0, mt: 2, borderTop: "1px solid var(--line)" }}>
        {[
          ["Classes", d.classes],
          ["Channels", d.channels],
          ["Input shape", meta.shape || "—"],
          ["Standard split", meta.train ? `${meta.train} train / ${meta.test} test` : "—"],
        ].map(([k, v]) => (
          <Box key={k} sx={{ display: "flex", justifyContent: "space-between", py: 0.7, borderBottom: "1px solid var(--line)" }}>
            <Typography component="dt" sx={{ fontSize: "0.84rem", color: "var(--ink-2)" }}>
              {k}
            </Typography>
            <Typography component="dd" className="mh-mono" sx={{ m: 0, fontSize: "0.84rem", fontWeight: 500 }}>
              {v}
            </Typography>
          </Box>
        ))}
      </Box>

      <FieldLabel sx={{ mt: 2 }}>Compatible models</FieldLabel>
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
        {d.compatible_models.map((m) => (
          <Box key={m} sx={{ px: 0.9, py: 0.3, borderRadius: "4px", fontSize: "0.78rem", fontWeight: 500, border: "1px solid var(--line-strong)" }}>
            {MODEL_META[m]?.label || m}
          </Box>
        ))}
      </Box>

      {names.length > 0 && (
        <>
          <Button
            size="small"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            endIcon={<ExpandMoreRoundedIcon sx={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />}
            sx={{ mt: 1.5, px: 0 }}
          >
            {open ? "Hide" : "Show"} {names.length} class labels
          </Button>
          <Collapse in={open}>
            <Box component="ol" start={0} sx={{ m: 0, mt: 1, pl: 3.5, columns: names.length > 12 ? 2 : 1, fontSize: "0.8rem", color: "var(--ink-2)", "& li": { py: 0.15 }, "& li::marker": { color: "var(--ink-3)", fontFamily: "var(--font-mono)" } }}>
              {names.map((nm) => (
                <li key={nm}>{nm}</li>
              ))}
            </Box>
          </Collapse>
        </>
      )}
    </Panel>
  );
}

export default function Datasets() {
  const { data: datasets, loading, error, reload } = useApiGet("/datasets", (r) => r.data.datasets || []);
  return (
    <Box>
      <PageHeader section="Assets" title="Datasets" subtitle="Benchmarks the platform attacks. Each one downloads automatically the first time a model trains or evaluates on it." onRefresh={reload} />
      {error && !datasets && (
        <Panel sx={{ mb: 2.5 }}>
          <EmptyState compact icon={<CloudOffOutlinedIcon />} tone="var(--status-weak-text)" title="Couldn't load datasets" text={error} action={<Button variant="outlined" onClick={reload}>Retry</Button>} />
        </Panel>
      )}
      <Grid container spacing={2.5}>
        {loading && !datasets
          ? [0, 1, 2].map((i) => (
              <Grid item xs={12} md={6} lg={4} key={i}>
                <Skeleton variant="rounded" height={520} />
              </Grid>
            ))
          : (datasets || []).map((d, i) => (
              <Grid item xs={12} md={6} lg={4} key={d.name}>
                <DatasetCard d={d} n={i + 1} />
              </Grid>
            ))}
      </Grid>
    </Box>
  );
}

import React from "react";
import { Box, Button, Grid, Skeleton, Tooltip, Typography } from "@mui/material";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import PageHeader from "../components/ui/PageHeader";
import Panel, { FieldLabel } from "../components/ui/Panel";
import EmptyState from "../components/ui/EmptyState";
import AttackThumb from "../components/adversarial/AttackThumb";
import AdversarialLab from "../components/adversarial/AdversarialLab";
import useApiGet from "../hooks/useApiGet";
import { ATTACK_META } from "../lib/constants";

function Rating({ label, value }) {
  return (
    <Tooltip title={`${label}: ${value} of 5`}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }} aria-label={`${label} ${value} of 5`}>
        <Typography sx={{ fontSize: "0.76rem", color: "var(--ink-3)", width: 56 }}>{label}</Typography>
        <Box sx={{ display: "flex", gap: "3px" }} aria-hidden>
          {[1, 2, 3, 4, 5].map((i) => (
            <Box key={i} sx={{ width: 12, height: 4, borderRadius: "1px", background: i <= value ? "var(--ink-2)" : "var(--line)" }} />
          ))}
        </Box>
      </Box>
    </Tooltip>
  );
}

function AttackCard({ a }) {
  const meta = ATTACK_META[a.name] || { label: a.label, name: a.label, access: "—", norm: "—", blurb: "" };
  const defaults = Object.entries(a.defaults || {});
  return (
    <Panel lift sx={{ height: "100%" }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 2, alignItems: "start" }}>
        <AttackThumb attack={a.name} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: "1.15rem", fontWeight: 600, lineHeight: 1.2 }}>{meta.label || a.label}</Typography>
          <Typography sx={{ fontSize: "0.8rem", color: "var(--ink-2)", mt: 0.25 }}>{meta.name}</Typography>
          <Box sx={{ display: "flex", gap: 0.5, mt: 0.75, flexWrap: "wrap" }}>
            {[meta.access, meta.norm].map((x) => (
              <Box key={x} component="span" className="mh-mono" sx={{ px: 0.75, py: 0.1, borderRadius: "3px", fontSize: "0.68rem", border: "1px solid var(--line-strong)", color: "var(--ink-2)" }}>
                {x}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      <Typography sx={{ mt: 1.5, fontSize: "0.86rem", color: "var(--ink-2)", minHeight: 42 }}>{meta.blurb}</Typography>
      {meta.speed && (
        <Box sx={{ mt: 1.25, display: "grid", gap: 0.4 }}>
          <Rating label="Speed" value={meta.speed} />
          <Rating label="Strength" value={meta.strength} />
        </Box>
      )}
      <FieldLabel sx={{ mt: 1.75 }}>Backend defaults</FieldLabel>
      <Typography className="mh-mono" sx={{ fontSize: "0.76rem", color: "var(--ink)", lineHeight: 1.8 }}>
        {defaults.length ? defaults.map(([k, v]) => `${k}=${v}`).join("  ") : "no tunables"}
      </Typography>
    </Panel>
  );
}

export default function AttackCenter() {
  const { data: attacks, loading, error, reload } = useApiGet("/attacks", (r) => r.data.attacks || []);
  const list = attacks || [];
  const white = list.filter((a) => ATTACK_META[a.name]?.access === "White-box").length;
  const black = list.filter((a) => ATTACK_META[a.name]?.access === "Black-box").length;

  return (
    <Box>
      <PageHeader
        section="Operations"
        title="Attacks"
        subtitle={`${list.length || 5} attack engines: ${white || 3} white-box (full gradient access) and ${black || 2} black-box (queries only). Hover a thumbnail to see the attacked image.`}
        onRefresh={reload}
        actions={
          <Button variant="outlined" endIcon={<ArrowDownwardRoundedIcon />} onClick={() => document.getElementById("lab")?.scrollIntoView({ behavior: "smooth", block: "start" })} sx={{ display: { xs: "none", sm: "inline-flex" } }}>
            Adversarial Lab
          </Button>
        }
      />

      {error && !attacks && (
        <Panel sx={{ mb: 2.5 }}>
          <EmptyState compact icon={<CloudOffOutlinedIcon />} tone="var(--status-weak-text)" title="Couldn't load attacks" text={error} action={<Button variant="outlined" onClick={reload}>Retry</Button>} />
        </Panel>
      )}

      <Grid container spacing={2.5}>
        {loading && !attacks
          ? [0, 1, 2, 3, 4].map((i) => (
              <Grid item xs={12} sm={6} lg={4} key={i}>
                <Skeleton variant="rounded" height={280} />
              </Grid>
            ))
          : list.map((a) => (
              <Grid item xs={12} sm={6} lg={4} key={a.name}>
                <AttackCard a={a} />
              </Grid>
            ))}
        {!loading && list.length > 0 && (
          <Grid item xs={12} sm={6} lg={4}>
            <Panel title="Threat models" sx={{ height: "100%" }}>
              {[
                ["White-box", "The attacker sees weights and gradients. Strongest and fastest; the worst case to plan for."],
                ["Black-box", "The attacker can only query predictions. Slower, but realistic for models behind an API."],
              ].map(([tt, d], i) => (
                <Box key={tt} sx={{ py: 1.25, borderTop: i ? "1px solid var(--line)" : "none" }}>
                  <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>{tt}</Typography>
                  <Typography sx={{ fontSize: "0.84rem", color: "var(--ink-2)", mt: 0.25 }}>{d}</Typography>
                </Box>
              ))}
            </Panel>
          </Grid>
        )}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <AdversarialLab id="lab" />
      </Box>
    </Box>
  );
}

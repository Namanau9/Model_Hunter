import React from "react";
import { Box, Button, Grid, Skeleton, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import PageHeader from "../components/ui/PageHeader";
import Panel, { FieldLabel } from "../components/ui/Panel";
import EmptyState from "../components/ui/EmptyState";
import PurificationLab from "../components/adversarial/PurificationLab";
import useApiGet from "../hooks/useApiGet";
import { DEFENSE_META } from "../lib/constants";
import { titleCase } from "../lib/format";

const ICON = { adversarial_training: SchoolOutlinedIcon, ensemble: GroupsOutlinedIcon, input_preprocessing: FilterAltOutlinedIcon };

export default function DefenseCenter() {
  const { data: defenses, loading, error, reload } = useApiGet("/defenses", (r) => r.data.defenses || []);
  return (
    <Box>
      <PageHeader
        section="Operations"
        title="Defenses"
        subtitle="Ways to harden a model. Choose one as the defense in an evaluation to measure how much robustness it buys."
        onRefresh={reload}
        actions={
          <Button component={RouterLink} to="/evaluation" variant="contained" endIcon={<ArrowForwardRoundedIcon />} sx={{ display: { xs: "none", sm: "inline-flex" } }}>
            Test a defense
          </Button>
        }
      />
      {error && !defenses && (
        <Panel sx={{ mb: 2.5 }}>
          <EmptyState compact icon={<CloudOffOutlinedIcon />} tone="var(--status-weak-text)" title="Couldn't load defenses" text={error} action={<Button variant="outlined" onClick={reload}>Retry</Button>} />
        </Panel>
      )}
      <Grid container spacing={2.5}>
        {loading && !defenses
          ? [0, 1, 2].map((i) => (
              <Grid item xs={12} md={4} key={i}>
                <Skeleton variant="rounded" height={240} />
              </Grid>
            ))
          : (defenses || []).map((d) => {
              const Icon = ICON[d.name] || ShieldOutlinedIcon;
              return (
                <Grid item xs={12} md={4} key={d.name}>
                  <Panel lift sx={{ height: "100%" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: "6px", display: "grid", placeItems: "center", color: "var(--green)", border: "1px solid var(--line-strong)" }} aria-hidden>
                        <Icon fontSize="small" />
                      </Box>
                      <Typography sx={{ fontSize: "1.1rem", fontWeight: 600 }}>{DEFENSE_META[d.name]?.label || titleCase(d.name)}</Typography>
                    </Box>
                    <Typography sx={{ mt: 1.5, fontSize: "0.9rem" }}>{d.description}.</Typography>
                    {DEFENSE_META[d.name]?.blurb && <Typography sx={{ mt: 0.75, fontSize: "0.84rem", color: "var(--ink-2)" }}>{DEFENSE_META[d.name].blurb}</Typography>}
                    {d.methods?.length > 0 && (
                      <>
                        <FieldLabel sx={{ mt: 1.75 }}>Methods</FieldLabel>
                        <Typography className="mh-mono" sx={{ fontSize: "0.76rem", lineHeight: 1.8 }}>
                          {d.methods.join("  ·  ")}
                        </Typography>
                      </>
                    )}
                    <Typography className="mh-mono" sx={{ mt: 1.75, fontSize: "0.72rem", color: "var(--ink-3)" }}>
                      defense_name="{d.name}"
                    </Typography>
                  </Panel>
                </Grid>
              );
            })}
      </Grid>
      <Box sx={{ mt: 4 }}>
        <PurificationLab />
      </Box>
    </Box>
  );
}

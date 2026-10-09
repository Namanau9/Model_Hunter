import React from "react";
import { Box, IconButton, Tooltip, Typography, ButtonBase } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import StatusPill from "../components/ui/StatusPill";
import ThemeToggle from "../components/ui/ThemeToggle";
import { useApp } from "../contexts/AppContext";

export default function Topbar({ current, onMenu, onSearch, isMobile }) {
  const { health, loading, refresh } = useApp();
  const online = health?.status === "ok";
  const degraded = health?.status === "degraded";
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");

  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        height: 60,
        display: "flex",
        alignItems: "center",
        gap: { xs: 0.75, md: 1.5 },
        px: { xs: 1.5, md: 3 },
        borderBottom: "1px solid var(--line)",
        background: "color-mix(in srgb, var(--bg) 88%, transparent)",
        backdropFilter: "saturate(1.2) blur(8px)",
        WebkitBackdropFilter: "saturate(1.2) blur(8px)",
      }}
    >
      <AnimatePresence>
        {loading && (
          <Box
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="progressbar"
            aria-label="Loading platform status"
            sx={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, overflow: "hidden" }}
          >
            <Box sx={{ width: "35%", height: "100%", background: "var(--blue)", animation: "mhIndeterminate 1.1s ease-in-out infinite" }} />
          </Box>
        )}
      </AnimatePresence>

      {isMobile && (
        <IconButton onClick={onMenu} aria-label="Open navigation" sx={{ width: 40, height: 40 }}>
          <MenuRoundedIcon />
        </IconButton>
      )}

      <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, minWidth: 0, flex: 1 }}>
        <Typography sx={{ display: { xs: "none", sm: "block" }, fontSize: "0.84rem", color: "var(--ink-3)" }}>{current?.group ?? "ModelHunter"}</Typography>
        <Typography sx={{ display: { xs: "none", sm: "block" }, fontSize: "0.84rem", color: "var(--ink-3)" }} aria-hidden>
          /
        </Typography>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={current?.to ?? "x"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }} style={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
              {current?.label ?? "Not found"}
            </Typography>
          </motion.div>
        </AnimatePresence>
      </Box>

      <ButtonBase
        onClick={onSearch}
        aria-label="Open command palette"
        sx={{
          display: { xs: "none", sm: "flex" },
          alignItems: "center",
          gap: 1,
          height: 36,
          pl: 1.25,
          pr: 0.75,
          minWidth: { sm: 180, md: 240 },
          borderRadius: "6px",
          color: "var(--ink-3)",
          border: "1px solid var(--line-strong)",
          background: "var(--raised)",
          fontSize: "0.84rem",
          "&:hover": { borderColor: "var(--ink-3)", color: "var(--ink-2)" },
        }}
      >
        <SearchRoundedIcon sx={{ fontSize: 17 }} />
        <Box component="span" sx={{ flex: 1, textAlign: "left" }}>
          Search…
        </Box>
        <Box component="kbd" className="mh-mono" sx={{ fontSize: "0.68rem", px: 0.6, py: 0.15, borderRadius: "4px", border: "1px solid var(--line-strong)", background: "var(--sunken)" }}>
          {isMac ? "⌘K" : "Ctrl K"}
        </Box>
      </ButtonBase>
      <IconButton onClick={onSearch} aria-label="Open command palette" sx={{ display: { xs: "inline-flex", sm: "none" }, width: 40, height: 40 }}>
        <SearchRoundedIcon />
      </IconButton>

      <StatusPill tone={online ? "ok" : degraded ? "warn" : loading ? "info" : "down"} sx={{ display: { xs: "none", md: "inline-flex" } }}>
        API {online ? "online" : degraded ? "degraded" : loading ? "checking" : "offline"}
      </StatusPill>

      <Tooltip title="Refresh platform status">
        <IconButton onClick={refresh} aria-label="Refresh platform status" sx={{ width: 40, height: 40 }}>
          <RefreshRoundedIcon fontSize="small" className={loading ? "mh-spin" : undefined} />
        </IconButton>
      </Tooltip>
      <ThemeToggle />
    </Box>
  );
}

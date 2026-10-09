import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, Box, InputBase, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import KeyboardReturnRoundedIcon from "@mui/icons-material/KeyboardReturnRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import BiotechOutlinedIcon from "@mui/icons-material/BiotechOutlined";
import MotionPhotosOffOutlinedIcon from "@mui/icons-material/MotionPhotosOffOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import SettingsBrightnessOutlinedIcon from "@mui/icons-material/SettingsBrightnessOutlined";
import { NAV } from "./nav";
import { useApp } from "../contexts/AppContext";
import { useUiPrefs } from "../contexts/UiPrefsContext";

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { refresh } = useApp();
  const prefs = useUiPrefs();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const listRef = useRef(null);

  const items = useMemo(
    () => [
      ...NAV.map((n) => ({ id: n.to, group: "Go to", label: n.label, desc: n.desc, Icon: n.Icon, run: () => navigate(n.to) })),
      { id: "lab", group: "Actions", label: "Open Adversarial Lab", desc: "Perturb a demo image or your own", Icon: BiotechOutlinedIcon, run: () => navigate("/attacks#lab") },
      { id: "refresh", group: "Actions", label: "Refresh platform status", desc: "Re-query /info and /health", Icon: RefreshRoundedIcon, run: () => refresh() },
      { id: "t-light", group: "Appearance", label: "Light theme", desc: prefs.theme === "light" ? "Current" : "Paper and ink", Icon: LightModeOutlinedIcon, run: () => prefs.set({ theme: "light" }) },
      { id: "t-dark", group: "Appearance", label: "Dark theme", desc: prefs.theme === "dark" ? "Current" : "Low-light charcoal", Icon: DarkModeOutlinedIcon, run: () => prefs.set({ theme: "dark" }) },
      { id: "t-system", group: "Appearance", label: "System theme", desc: prefs.theme === "system" ? "Current" : "Follow the OS setting", Icon: SettingsBrightnessOutlinedIcon, run: () => prefs.set({ theme: "system" }) },
      {
        id: "motion",
        group: "Appearance",
        label: prefs.reduceMotion ? "Enable animations" : "Reduce motion",
        desc: "Toggle interface animation",
        Icon: MotionPhotosOffOutlinedIcon,
        run: () => prefs.set({ reduceMotion: !prefs.reduceMotion }),
      },
    ],
    [navigate, refresh, prefs]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((i) => `${i.label} ${i.desc} ${i.group}`.toLowerCase().includes(s));
  }, [items, q]);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
    }
  }, [open]);
  useEffect(() => setIdx(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  const run = (item) => {
    if (!item) return;
    onClose();
    item.run();
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(filtered[idx]);
    }
  };

  let lastGroup = null;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { alignSelf: "flex-start", mt: { xs: 8, md: 12 }, overflow: "hidden" } }} aria-labelledby="palette-title">
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        <Typography id="palette-title" className="mh-visually-hidden">
          Command palette
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 2, py: 1.5, borderBottom: "1px solid var(--line)" }}>
          <SearchRoundedIcon sx={{ color: "var(--ink-3)" }} />
          <InputBase
            autoFocus
            fullWidth
            placeholder="Search pages and actions…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            inputProps={{
              "aria-label": "Search pages and actions",
              role: "combobox",
              "aria-expanded": true,
              "aria-controls": "palette-list",
              "aria-activedescendant": filtered[idx] ? `pal-${filtered[idx].id}` : undefined,
            }}
            sx={{ fontSize: "1rem" }}
          />
          <Box component="kbd" className="mh-mono" sx={{ fontSize: "0.66rem", px: 0.6, py: 0.15, borderRadius: "4px", border: "1px solid var(--line-strong)", color: "var(--ink-3)" }}>
            Esc
          </Box>
        </Box>
        <Box id="palette-list" role="listbox" ref={listRef} sx={{ maxHeight: 420, overflowY: "auto", p: 0.75 }}>
          {filtered.length === 0 && <Typography sx={{ p: 3, textAlign: "center", color: "var(--ink-2)" }}>No matches for “{q}”.</Typography>}
          {filtered.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : null;
            lastGroup = it.group;
            const sel = i === idx;
            return (
              <React.Fragment key={it.id}>
                {header && <Typography sx={{ px: 1.25, pt: 1, pb: 0.5, fontSize: "0.72rem", fontWeight: 500, color: "var(--ink-3)" }}>{header}</Typography>}
                <Box
                  id={`pal-${it.id}`}
                  data-idx={i}
                  role="option"
                  aria-selected={sel}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => run(it)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    px: 1.25,
                    minHeight: 44,
                    borderRadius: "6px",
                    cursor: "pointer",
                    background: sel ? "var(--hover)" : "transparent",
                  }}
                >
                  <Box sx={{ display: "flex", color: sel ? "var(--ink)" : "var(--ink-3)", "& svg": { fontSize: 18 } }} aria-hidden>
                    <it.Icon />
                  </Box>
                  <Typography sx={{ fontWeight: 500, fontSize: "0.9rem", flex: "0 0 auto" }}>{it.label}</Typography>
                  <Typography noWrap sx={{ fontSize: "0.8rem", color: "var(--ink-3)", flex: 1, minWidth: 0 }}>
                    {it.desc}
                  </Typography>
                  {sel && <KeyboardReturnRoundedIcon sx={{ fontSize: 15, color: "var(--ink-3)" }} aria-hidden />}
                </Box>
              </React.Fragment>
            );
          })}
        </Box>
      </motion.div>
    </Dialog>
  );
}

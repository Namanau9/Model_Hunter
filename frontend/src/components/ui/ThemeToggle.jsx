import React, { useState } from "react";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import SettingsBrightnessOutlinedIcon from "@mui/icons-material/SettingsBrightnessOutlined";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { useUiPrefs } from "../../contexts/UiPrefsContext";
import Segmented from "./Segmented";

export const THEME_OPTIONS = [
  { value: "light", label: "Light", Icon: LightModeOutlinedIcon },
  { value: "dark", label: "Dark", Icon: DarkModeOutlinedIcon },
  { value: "system", label: "System", Icon: SettingsBrightnessOutlinedIcon },
];

/** Top-bar theme switch: icon reflects the active mode; menu offers Light / Dark / System. */
export default function ThemeToggle() {
  const { theme, mode, set } = useUiPrefs();
  const [anchor, setAnchor] = useState(null);
  const Icon = mode === "dark" ? DarkModeOutlinedIcon : LightModeOutlinedIcon;
  return (
    <>
      <Tooltip title={`Theme: ${theme === "system" ? `System (${mode})` : mode}`}>
        <IconButton
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label="Change colour theme"
          aria-haspopup="menu"
          aria-expanded={!!anchor}
          sx={{ width: 40, height: 40 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={mode}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex" }}
            >
              <Icon fontSize="small" />
            </motion.span>
          </AnimatePresence>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 180, mt: 0.5 } } }}
      >
        {THEME_OPTIONS.map((o) => (
          <MenuItem
            key={o.value}
            selected={theme === o.value}
            onClick={() => {
              set({ theme: o.value });
              setAnchor(null);
            }}
          >
            <ListItemIcon>
              <o.Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={o.label} />
            {theme === o.value && <CheckRoundedIcon fontSize="small" sx={{ color: "var(--ink)", ml: 1 }} />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/** Inline three-way switch for the Settings page. */
export function ThemeSegmented() {
  const { theme, set } = useUiPrefs();
  return (
    <Segmented
      layoutId="theme-seg"
      ariaLabel="Colour theme"
      value={theme}
      onChange={(v) => set({ theme: v })}
      options={THEME_OPTIONS.map((o) => ({ value: o.value, label: o.label, icon: <o.Icon /> }))}
    />
  );
}

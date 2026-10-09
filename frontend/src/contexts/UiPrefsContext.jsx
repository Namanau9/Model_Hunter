import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MotionConfig } from "framer-motion";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { buildTheme } from "../theme/theme";
import { applyCssVars, palettes } from "../theme/tokens";

// Purely cosmetic, per-browser preferences (never sent to the backend).
// Key is read by the inline pre-paint script in index.html / demo.html.
const KEY = "mh.ui-prefs.v2";
const DEFAULTS = { theme: "system", reduceMotion: false, paper: true, sidebarCollapsed: false };

function read() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function useSystemDark() {
  const q = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(() => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(q).matches : false));
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(q);
    const on = (e) => setDark(e.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return dark;
}

const UiPrefsContext = createContext({ ...DEFAULTS, mode: "light", tokens: palettes.light, set: () => {} });

/** Owns theme mode (light / dark / system), motion and layout prefs; provides the MUI theme. */
export function UiPrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(read);
  const systemDark = useSystemDark();
  const mode = prefs.theme === "system" ? (systemDark ? "dark" : "light") : prefs.theme;

  const set = useCallback((patch) => {
    setPrefs((p) => {
      const next = { ...p, ...(typeof patch === "function" ? patch(p) : patch) };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — keep in memory only */
      }
      return next;
    });
  }, []);

  // Write palette → CSS variables synchronously during render of a new mode,
  // so children painting this frame already see the right values.
  useMemo(() => {
    if (typeof document !== "undefined") applyCssVars(mode);
  }, [mode]);

  useEffect(() => {
    document.documentElement.classList.toggle("mh-reduce-motion", !!prefs.reduceMotion);
  }, [prefs.reduceMotion]);
  useEffect(() => {
    document.body.classList.toggle("mh-paper", !!prefs.paper);
  }, [prefs.paper]);

  const theme = useMemo(() => buildTheme(mode), [mode]);
  const value = useMemo(() => ({ ...prefs, mode, tokens: palettes[mode], set }), [prefs, mode, set]);

  return (
    <UiPrefsContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MotionConfig reducedMotion={prefs.reduceMotion ? "always" : "user"}>{children}</MotionConfig>
      </ThemeProvider>
    </UiPrefsContext.Provider>
  );
}

export const useUiPrefs = () => useContext(UiPrefsContext);

/** Active palette as JS values (for SVG / canvas / Recharts). */
export const useTokens = () => useContext(UiPrefsContext).tokens;

/** True when motion should be minimised (system setting or in-app toggle). */
export function useMotionOff() {
  const { reduceMotion } = useUiPrefs();
  const [sys, setSys] = useState(() =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false
  );
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = (e) => setSys(e.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduceMotion || sys;
}

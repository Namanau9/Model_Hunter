import { createTheme } from "@mui/material/styles";
import { FONT_UI, FONT_DISPLAY, FONT_MONO, palettes, tint } from "./tokens";

// =====================================================================
// ModelHunter MUI theme — "instrument": housing greys, graphite keys,
// colour only where it carries meaning. Built per mode.
// Component overrides reference CSS variables so they follow the
// active palette without rebuilding styles.
// =====================================================================

export function buildTheme(mode = "light") {
  const p = palettes[mode] || palettes.light;
  return createTheme({
    palette: {
      mode,
      primary: { main: p.inverse, contrastText: p.inverseInk },
      secondary: { main: p.ink, contrastText: p.bg },
      success: { main: p.green, contrastText: mode === "light" ? "#fff" : "#08140D" },
      warning: { main: p.ochre, contrastText: mode === "light" ? "#fff" : "#1A1002" },
      error: { main: p.status.Weak.text, contrastText: mode === "light" ? "#fff" : "#1A0505" },
      info: { main: p.blue, contrastText: mode === "light" ? "#fff" : "#06101F" },
      background: { default: p.bg, paper: p.raised },
      text: { primary: p.ink, secondary: p.ink2, disabled: p.ink3 },
      divider: p.line,
      action: { hover: p.hover, selected: p.hover },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: FONT_UI,
      fontSize: 14,
      h1: { fontFamily: FONT_DISPLAY, fontWeight: 600, letterSpacing: "-0.01em" },
      h2: { fontFamily: FONT_DISPLAY, fontWeight: 600, letterSpacing: "-0.01em" },
      h3: { fontFamily: FONT_DISPLAY, fontWeight: 600 },
      h4: { fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: "2.4rem", letterSpacing: "-0.005em", lineHeight: 1.08 },
      h5: { fontWeight: 600, fontSize: "1.1rem" },
      h6: { fontWeight: 600, fontSize: "0.98rem", letterSpacing: 0 },
      body1: { lineHeight: 1.6 },
      body2: { lineHeight: 1.55 },
      overline: { fontFamily: FONT_UI, fontWeight: 500, letterSpacing: "0.02em", fontSize: "0.78rem", textTransform: "none", lineHeight: 1.5 },
      caption: { fontFamily: FONT_MONO, fontSize: "0.74rem" },
      button: { fontFamily: FONT_UI, textTransform: "none", fontWeight: 600, letterSpacing: 0 },
    },
    shadows: ["none", ...Array.from({ length: 24 }, () => p.shadowPop)],
    components: {
      MuiCssBaseline: {
        styleOverrides: `code, pre { font-family: ${FONT_MONO}; }`,
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 6,
            minHeight: 40,
            paddingInline: 16,
            transition: "background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 120ms ease",
            "&:active": { transform: "translateY(1px)" },
            "&.Mui-disabled": { opacity: 0.5 },
          },
          sizeLarge: { minHeight: 46, fontSize: "0.98rem", paddingInline: 20 },
          sizeSmall: { minHeight: 32, paddingInline: 10 },
          containedPrimary: {
            backgroundColor: "var(--inverse)",
            color: "var(--inverse-ink)",
            boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.25)",
            "&:hover": { backgroundColor: `color-mix(in srgb, var(--inverse) 84%, var(--bg))` },
            "&.Mui-disabled": { backgroundColor: "var(--inverse)", color: "var(--inverse-ink)" },
          },
          containedSecondary: {
            backgroundColor: "var(--inverse)",
            color: "var(--inverse-ink)",
            "&:hover": { backgroundColor: `color-mix(in srgb, var(--inverse) 84%, var(--bg))` },
          },
          containedSuccess: { backgroundColor: "var(--green)" },
          outlined: {
            borderColor: "var(--line-strong)",
            color: "var(--ink)",
            backgroundColor: "var(--raised)",
            "&:hover": { borderColor: "var(--ink-3)", backgroundColor: "var(--hover)" },
          },
          text: { color: "var(--ink)", "&:hover": { backgroundColor: "var(--hover)" } },
          textPrimary: { color: "var(--blue)", "&:hover": { backgroundColor: "var(--hover)", textDecoration: "underline" } },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            color: "var(--ink-2)",
            "&:hover": { backgroundColor: "var(--hover)", color: "var(--ink)" },
          },
        },
      },
      MuiTooltip: {
        defaultProps: { arrow: false, enterDelay: 300 },
        styleOverrides: {
          tooltip: {
            backgroundColor: "var(--inverse)",
            color: "var(--inverse-ink)",
            fontSize: "0.76rem",
            fontWeight: 500,
            padding: "6px 9px",
            borderRadius: 5,
            maxWidth: 320,
          },
        },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 4, fontFamily: FONT_MONO, fontSize: "0.72rem" } },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            backgroundColor: "var(--raised)",
            "& fieldset": { borderColor: "var(--line-strong)" },
            "&:hover fieldset": { borderColor: "var(--ink-3)" },
            "&.Mui-focused fieldset": { borderColor: "var(--blue)", borderWidth: 1.5 },
          },
          input: { fontFamily: FONT_MONO, fontSize: "0.9rem" },
        },
      },
      MuiInputLabel: { styleOverrides: { root: { color: "var(--ink-2)", "&.Mui-focused": { color: "var(--blue)" } } } },
      MuiFormHelperText: { styleOverrides: { root: { color: "var(--ink-3)", marginInline: 0, fontSize: "0.74rem" } } },
      MuiSelect: { styleOverrides: { select: { fontFamily: FONT_MONO } } },
      MuiMenu: {
        styleOverrides: {
          paper: { backgroundColor: "var(--raised)", border: "1px solid var(--line)", boxShadow: "var(--shadow-pop)" },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: "0.88rem",
            minHeight: 38,
            "&.Mui-selected": { backgroundColor: "var(--hover)" },
            "&.Mui-selected:hover": { backgroundColor: "var(--hover)" },
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          root: { height: 4, paddingBlock: "14px", color: "var(--ink)" },
          rail: { backgroundColor: "var(--line-strong)", opacity: 1 },
          track: { border: "none", backgroundColor: "var(--ink)" },
          thumb: {
            width: 16,
            height: 16,
            backgroundColor: "var(--raised)",
            border: "2px solid var(--ink)",
            boxShadow: "none",
            "&:hover, &.Mui-focusVisible": { boxShadow: `0 0 0 6px ${tint("var(--ink)", 12)}` },
            "&.Mui-active": { boxShadow: `0 0 0 8px ${tint("var(--ink)", 14)}` },
          },
          valueLabel: { fontFamily: FONT_MONO, backgroundColor: "var(--inverse)", color: "var(--inverse-ink)", borderRadius: 4 },
          mark: { backgroundColor: "var(--ink-3)", width: 1, height: 6 },
          markLabel: { fontFamily: FONT_MONO, fontSize: "0.68rem", color: "var(--ink-3)" },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            "&.Mui-checked": { color: "var(--raised)" },
            "&.Mui-checked + .MuiSwitch-track": { backgroundColor: "var(--inverse)", opacity: 1 },
          },
          track: { backgroundColor: "var(--line-strong)", opacity: 1 },
          thumb: { boxShadow: "0 1px 2px rgba(0,0,0,0.3)" },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 2, height: 3, backgroundColor: "var(--line)" },
          bar: { borderRadius: 2, backgroundColor: "var(--ink)" },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottom: "1px solid var(--line)", paddingBlock: 11 },
          head: { color: "var(--ink-3)", fontSize: "0.76rem", fontWeight: 500, backgroundColor: "transparent", whiteSpace: "nowrap" },
        },
      },
      MuiTableRow: { styleOverrides: { root: { "&:hover td": { backgroundColor: "var(--hover)" } } } },
      MuiTableSortLabel: {
        styleOverrides: { root: { "&.Mui-active": { color: "var(--ink)" }, "&:hover": { color: "var(--ink)" } } },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { backgroundColor: "var(--raised)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow-pop)" },
        },
      },
      MuiBackdrop: { styleOverrides: { root: { backgroundColor: mode === "light" ? "rgba(28,27,24,0.32)" : "rgba(0,0,0,0.55)" } } },
      MuiDrawer: { styleOverrides: { paper: { backgroundColor: "var(--side)", borderRight: "1px solid var(--line)" } } },
      MuiDivider: { styleOverrides: { root: { borderColor: "var(--line)" } } },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 6, border: "1px solid var(--line)", alignItems: "center", color: "var(--ink)" },
          standardError: { backgroundColor: tint("var(--status-weak)", 10), borderColor: tint("var(--status-weak)", 35) },
          standardInfo: { backgroundColor: tint("var(--blue)", 10) },
          standardWarning: { backgroundColor: tint("var(--ochre)", 10) },
          standardSuccess: { backgroundColor: tint("var(--green)", 10) },
        },
      },
      MuiSkeleton: { styleOverrides: { root: { backgroundColor: "var(--sunken)" } } },
    },
  });
}

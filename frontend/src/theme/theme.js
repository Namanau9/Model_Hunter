import { createTheme, alpha } from "@mui/material/styles";

// =====================================================================
// ModelHunter — Cyber Operations Console theme
// =====================================================================
const FONT_UI = `'IBM Plex Sans','Segoe UI',system-ui,-apple-system,sans-serif`;
const FONT_DISPLAY = `'Chakra Petch','IBM Plex Sans','Segoe UI',sans-serif`;
const FONT_MONO = `'IBM Plex Mono','SFMono-Regular','Cascadia Code',Consolas,monospace`;

const cyan = "#27E0FF";
const indigo = "#6D7CFF";
const blue = "#2563EB";
const panel = "#070D18";
const surface = "#0E1726";
const surface2 = "#152238";
const surfaceHover = "#1B2A44";
const border = "#22334E";
const borderStrong = "#2F4568";

export const cyberTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: indigo, light: "#8E9BFF", dark: "#4E5BDD", contrastText: "#FFFFFF" },
    secondary: { main: cyan, light: "#6FEFFF", dark: "#00B6D6", contrastText: "#001014" },
    success: { main: "#2FD18A", light: "#6BE8B4", dark: "#17A066", contrastText: "#002B17" },
    warning: { main: "#F9B44C", light: "#FCD38A", dark: "#D98A1D", contrastText: "#3B2400" },
    error: { main: "#FF5C66", light: "#FF9BA2", dark: "#D63844", contrastText: "#3D0005" },
    info: { main: "#4C8BFF", light: "#84AFFF", dark: "#2A5DD4", contrastText: "#001A3D" },
    background: { default: panel, paper: surface },
    text: { primary: "#E6EDF7", secondary: "#9BB0CD", disabled: "#5A6E8C" },
    divider: border,
    custom: { cyan, indigo, blue, panel, surface, surface2, surfaceHover, border, borderStrong, monoFont: FONT_MONO, displayFont: FONT_DISPLAY },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: FONT_UI,
    fontSize: 14,
    h1: { fontFamily: FONT_DISPLAY, fontWeight: 700, letterSpacing: ".01em" },
    h2: { fontFamily: FONT_DISPLAY, fontWeight: 700, letterSpacing: ".01em" },
    h3: { fontFamily: FONT_DISPLAY, fontWeight: 700, letterSpacing: ".01em" },
    h4: { fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "1.6rem", letterSpacing: "0.02em" },
    h5: { fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: "1.15rem", letterSpacing: "0.015em" },
    h6: { fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: "1rem", letterSpacing: "0.01em" },
    subtitle1: { letterSpacing: "0.01em" },
    subtitle2: { letterSpacing: "0.01em" },
    overline: { fontFamily: FONT_MONO, fontWeight: 600, letterSpacing: "0.14em", fontSize: "0.72rem" },
    caption: { fontFamily: FONT_MONO, fontWeight: 500, fontSize: "0.74rem", letterSpacing: "0.02em", fontVariantNumeric: "tabular-nums" },
    button: { fontFamily: FONT_DISPLAY, textTransform: "none", fontWeight: 600, letterSpacing: "0.04em" },
  },
  shadows: Array.from({ length: 25 }).map((_, i) =>
    i === 0 ? "none" : `0 1px ${i + 1}px 0 rgb(0 0 0 / 0.32), 0 6px ${i + 6}px -2px rgb(0 0 0 / 0.4)`
  ),
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        body { min-height: 100vh; }
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background-color: ${border}; border-radius: 6px; border: 2px solid ${panel}; }
        code, pre { font-family: ${FONT_MONO}; }
      `,
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(panel, 0.72),
          backdropFilter: "blur(14px) saturate(1.3)",
          backgroundImage: "none",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: surface,
          backgroundImage: `linear-gradient(180deg, ${surface2} 0%, ${surface} 100%)`,
          borderRight: `1px solid ${border}`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          position: "relative",
          backgroundColor: surface,
          backgroundImage: `linear-gradient(180deg, ${alpha(surface2, 0.55)} 0%, ${surface} 100%)`,
          border: `1px solid ${border}`,
          borderRadius: 14,
          boxShadow: "0 10px 26px -10px rgb(0 0 0 / 0.5)",
          transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
          "&:hover": {
            boxShadow: `0 18px 40px -14px rgb(0 0 0 / 0.55), 0 0 0 1px ${alpha(cyan, 0.18)}`,
            borderColor: alpha(cyan, 0.28),
            transform: "translateY(-2px)",
          },
        },
      },
    },
    MuiCardContent: { styleOverrides: { root: { padding: "1.5rem" } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          "&:focus-visible": { outline: `2px solid ${cyan}`, outlineOffset: 2 },
        },
        contained: {
          backgroundColor: cyan,
          color: "#001014",
          boxShadow: `0 0 0 1px ${alpha(cyan, 0.4)}, 0 8px 20px -8px ${alpha(cyan, 0.6)}`,
          "&:hover": {
            backgroundColor: "#ffffff",
            color: "#001014",
            boxShadow: `0 0 0 1px ${alpha(cyan, 0.6)}, 0 0 20px 2px ${alpha(cyan, 0.5)}`,
          },
        },
        outlined: {
          borderColor: alpha(cyan, 0.4),
          color: cyan,
          "&:hover": { borderColor: cyan, backgroundColor: alpha(cyan, 0.08) },
        },
        text: { color: "#9BB0CD", "&:hover": { color: cyan, backgroundColor: alpha(cyan, 0.08) } },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 10, color: "#9BB0CD", "&:hover": { backgroundColor: alpha(cyan, 0.1), color: cyan } },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          marginInline: 6,
          "&.Mui-selected": { color: cyan },
        },
      },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: 36 } } },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 99, height: 8, backgroundColor: alpha(border, 0.5) },
        bar: { borderRadius: 99 },
      },
    },
    MuiTable: { styleOverrides: { root: { borderCollapse: "separate" } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${alpha(border, 0.7)}` },
        head: {
          color: "#C7D4E8",
          backgroundColor: alpha(surface2, 0.4),
          borderBottom: `1px solid ${border}`,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: { root: { "&:hover td": { backgroundColor: alpha(cyan, 0.04) } } },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 },
        colorDefault: { backgroundColor: alpha(surfaceHover, 0.8), color: "#9BB0CD" },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: surface2,
          color: "#E6EDF7",
          border: `1px solid ${border}`,
          boxShadow: "0 10px 26px -8px rgb(0 0 0 / 0.5)",
          fontSize: "0.75rem",
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          backgroundColor: surface,
          backgroundImage: "none",
          border: `1px solid ${border}`,
          boxShadow: "0 14px 34px -10px rgb(0 0 0 / 0.55)",
        },
      },
    },
    MuiMenuItem: { styleOverrides: { root: { "&.Mui-selected": { backgroundColor: alpha(cyan, 0.12), color: cyan } } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: alpha(panel, 0.4),
          "& fieldset": { borderColor: border },
          "&:hover fieldset": { borderColor: alpha(cyan, 0.3) },
          "&.Mui-focused fieldset": { borderColor: cyan, boxShadow: `0 0 0 2px ${alpha(cyan, 0.22)}` },
        },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { color: "#9BB0CD", "&.Mui-focused": { color: cyan } } } },
    MuiFormHelperText: { styleOverrides: { root: { color: "#9BB0CD" } } },
    MuiDivider: { styleOverrides: { root: { borderColor: alpha(border, 0.9) } } },
    MuiBackdrop: { styleOverrides: { root: { backgroundColor: alpha(panel, 0.6), backdropFilter: "blur(3px)" } } },
  },
});

export const cyanMain = cyan;
export const blueMain = indigo;
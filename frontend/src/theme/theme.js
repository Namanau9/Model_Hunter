import { createTheme, alpha } from "@mui/material/styles";

// Modern Cybersecurity Dashboard — dark theme per project spec.
const cyan = "#00E5FF";
const blue = "#2563EB";
const panel = "#0B1220";
const surface = "#1E293B";
const surfaceHover = "#273449";
const border = "#334155";

export const cyberTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: blue, contrastText: "#ffffff" },
    secondary: { main: cyan, contrastText: "#001014" },
    success: { main: "#00C853" },
    warning: { main: "#FF9800" },
    error: { main: "#FF1744" },
    background: { default: panel, paper: surface },
    text: { primary: "#E2E8F0", secondary: "#94A3B8", disabled: "#64748B" },
    custom: { cyan, blue, panel, surface, surfaceHover, border },
  },
    shape: { round: 12, button: 8, borderRadius: 12 },
  typography: {
    fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    letterSpacing: "-0.01em",
    h4: { fontSize: "1.75rem", fontWeight: 700, letterSpacing: 0.5 },
    h5: { fontSize: "1.25rem", fontWeight: 600 },
    h6: { fontSize: "1rem", fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0.25 },
  },
  shadows: Array.from({ length: 25 }).map((_, i) => {
    if (i === 0) return "none";
    return `0 1px ${i + 1}px 0 rgb(0 0 0 / 0.3), 0 1px ${i + 2}px 0 rgb(0 0 0 / 0.22)`;
  }),
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        body { background: ${panel}; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background-color: ${border}; border-radius: 4px; }
      `,
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(surface, 0.85),
          backdropFilter: "blur(8px) saturate(1.2)",
          borderBottom: `1px solid ${border}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: surface,
          borderRight: `1px solid ${border}`,
          backgroundImage: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: surface,
          border: `1px solid ${border}`,
          boxShadow: "0 6px 16px 0 rgb(0 0 0 / 0.25)",
          transition: "box-shadow 180ms ease, border-color 180ms ease, transform 140ms ease",
          "&:hover": {
            boxShadow: `0 12px 28px 0 rgb(0 0 0 / 0.35), 0 0 0 1px ${alpha(cyan, 0.25)}`,
            borderColor: alpha(cyan, 0.35),
            transform: "translateY(-1px)",
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: { root: { padding: "1rem" } },
    },
    MuiButton: {
      styleOverrides: {
                root: {
          borderRadius: 8,
          "&:focus-visible": { outline: `2px solid ${cyan}`, outlineOffset: 2 },
        },
        contained: { backgroundColor: cyan, color: "#001014", boxShadow: `0 0 12px 2px ${alpha(cyan, 0.35)}`,
          "&:hover": { backgroundColor: cyan, boxShadow: `0 0 18px 4px ${alpha(cyan, 0.5)}` } },
        outlined: {
          borderColor: alpha(cyan, 0.4), color: cyan,
          "&:hover": { borderColor: cyan, backgroundColor: alpha(cyan, 0.08) },
        },
        text: { color: cyan, "&:hover": { backgroundColor: alpha(cyan, 0.08) } },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: 8, color: "#94A3B8", "&:hover": { backgroundColor: alpha(cyan, 0.08), color: cyan } } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginInline: 4,
          "&.Mui-selected, &:hover": { backgroundColor: alpha(cyan, 0.08), color: cyan },
          "&.Mui-selected": { color: cyan },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 5, height: 10, backgroundColor: border } },
    },
    MuiTable: { styleOverrides: { root: { borderCollapse: "separate" } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${border}` },
        head: { color: "#CBD5E1", borderBottomColor: border },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:hover td": { backgroundColor: alpha(cyan, 0.04) },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { backgroundColor: surface, color: "#E2E8F0", border: `1px solid ${border}`, boxShadow: "0 6px 16px 0 rgb(0 0 0 / 0.35)" } },
    },
    MuiPopover: { styleOverrides: { paper: { backgroundColor: surface, border: `1px solid ${border}`, boxShadow: "0 12px 28px 0 rgb(0 0 0 / 0.35)" } } },
    MuiSelect: { styleOverrides: { select: { borderRadius: 8 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          "& fieldset": { borderColor: border },
          "&:hover fieldset": { borderColor: alpha(cyan, 0.3) },
          "&.Mui-focused fieldset": { borderColor: cyan, boxShadow: `0 0 0 2px ${alpha(cyan, 0.25)}` },
        },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { color: "#94A3B8", "&.Mui-focused": { color: cyan } } } },
    MuiFormHelperText: { styleOverrides: { root: { color: "#94A3B8" } } },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 },
        colorDefault: { backgroundColor: surfaceHover, color: "#94A3B8" },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: border } } },
  },
});

export const cyanMain = cyan;
export const blueMain = blue;


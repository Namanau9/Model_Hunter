import { createTheme } from "@mui/material/styles";

// Modern Cybersecurity Dashboard — dark theme per project spec.
export const cyberTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#2563EB" },
    secondary: { main: "#00E5FF" },
    success: { main: "#00C853" },
    warning: { main: "#FF9800" },
    error: { main: "#FF1744" },
    background: { default: "#0F172A", paper: "#1E293B" },
    text: { primary: "#E2E8F0", secondary: "#94A3B8" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
  },
  components: {
    MuiCard: {
      styleOverrides: { root: { backgroundImage: "none", border: "1px solid #334155" } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
  },
});

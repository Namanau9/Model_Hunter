// Review entry point — serves the real UI against an in-browser
// mock of the API so it can be explored without the Python backend.
// Production uses src/main.jsx; nothing here is bundled into `npm run build`.
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { Box, Tooltip } from "@mui/material";
import "../index.css";
import App from "../App";
import { AppProvider } from "../contexts/AppContext";
import { ToastProvider } from "../contexts/ToastContext";
import { UiPrefsProvider } from "../contexts/UiPrefsContext";
import ErrorBoundary from "../components/ErrorBoundary";
import { installMockApi } from "./mockApi";

installMockApi();

function MockDataRibbon() {
  return (
    <Tooltip title="Mock API: the API is mocked in your browser. Attack numbers are seeded from results/attacks/*.json; anything not in those files is estimated. Run `npm run dev` with the backend for live data.">
      <Box
        tabIndex={0}
        sx={{
          position: "fixed",
          right: { xs: 12, md: 24 },
          top: 70,
          zIndex: 1100,
          px: 1.25,
          py: 0.5,
          borderRadius: "4px",
          fontFamily: "var(--font-mono)",
          fontSize: "0.72rem",
          fontWeight: 500,
          color: "var(--inverse-ink)",
          background: "var(--inverse)",
          boxShadow: "var(--shadow-pop)",
          cursor: "help",
          whiteSpace: "nowrap",
        }}
      >
demo data · mock API
      </Box>
    </Tooltip>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <UiPrefsProvider>
      <HashRouter>
        <AppProvider>
          <ToastProvider>
            <ErrorBoundary>
              <App />
              <MockDataRibbon />
            </ErrorBoundary>
          </ToastProvider>
        </AppProvider>
      </HashRouter>
    </UiPrefsProvider>
  </React.StrictMode>
);

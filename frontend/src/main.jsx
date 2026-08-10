import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import App from "./App";
import { AppProvider } from "./contexts/AppContext";
import { cyberTheme } from "./theme/theme";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={cyberTheme}>
      <CssBaseline />
      <BrowserRouter>
        <AppProvider>
          <App />
        </AppProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);

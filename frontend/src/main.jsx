import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { AppProvider } from "./contexts/AppContext";
import { ToastProvider } from "./contexts/ToastContext";
import { UiPrefsProvider } from "./contexts/UiPrefsContext";
import ErrorBoundary from "./components/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <UiPrefsProvider>
      <BrowserRouter>
        <AppProvider>
          <ToastProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </ToastProvider>
        </AppProvider>
      </BrowserRouter>
    </UiPrefsProvider>
  </React.StrictMode>
);

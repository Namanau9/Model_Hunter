import React, { createContext, useContext, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";

const ToastContext = createContext(null);

/** Global toast notifications (Success / Error / Info / Warning). */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, severity = "success") => {
    setToast({ message, severity, key: Date.now() });
  }, []);

  const close = useCallback(() => setToast(null), []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <Snackbar
        key={toast?.key}
        open={!!toast}
        autoHideDuration={4200}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={close} severity={toast?.severity || "success"} variant="filled" sx={{ width: "100%" }}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

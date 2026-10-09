import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

const ToastContext = createContext(null);

const STYLE = {
  success: { color: "var(--status-strong-text)", Icon: CheckCircleOutlineRoundedIcon },
  error: { color: "var(--status-weak-text)", Icon: ErrorOutlineRoundedIcon },
  warning: { color: "var(--ochre)", Icon: WarningAmberRoundedIcon },
  info: { color: "var(--blue)", Icon: InfoOutlinedIcon },
};
const DURATION = 4200;

function Toast({ t, onClose }) {
  const s = STYLE[t.severity] || STYLE.info;
  const [paused, setPaused] = useState(false);
  const remaining = useRef(DURATION);
  const started = useRef(Date.now());

  useEffect(() => {
    if (paused) return undefined;
    started.current = Date.now();
    const timer = setTimeout(() => onClose(t.key), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - started.current;
    };
  }, [paused, onClose, t.key]);

  return (
    <Box
      component={motion.div}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      role={t.severity === "error" ? "alert" : "status"}
      sx={{
        pointerEvents: "auto",
        position: "relative",
        overflow: "hidden",
        width: { xs: "calc(100vw - 32px)", sm: 360 },
        display: "flex",
        gap: 1.25,
        alignItems: "flex-start",
        p: 1.5,
        pr: 0.75,
        borderRadius: "8px",
        border: "1px solid var(--line-strong)",
        borderLeft: `3px solid ${s.color}`,
        background: "var(--raised)",
        boxShadow: "var(--shadow-pop)",
      }}
    >
      <s.Icon sx={{ color: s.color, fontSize: 20, mt: 0.1 }} aria-hidden />
      <Typography sx={{ flex: 1, minWidth: 0, fontSize: "0.86rem", wordBreak: "break-word", pt: 0.1 }}>{t.message}</Typography>
      <IconButton size="small" onClick={() => onClose(t.key)} aria-label="Dismiss notification" sx={{ mt: -0.4 }}>
        <CloseRoundedIcon fontSize="small" />
      </IconButton>
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 2,
          width: "100%",
          background: "var(--line-strong)",
          transformOrigin: "left",
          animation: `mhToastBar ${DURATION}ms linear forwards`,
          animationPlayState: paused ? "paused" : "running",
        }}
      />
    </Box>
  );
}

/** Global toast notifications (Success / Error / Info / Warning). */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, severity = "success") => {
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((ts) => [...ts.slice(-3), { message, severity, key }]);
  }, []);

  const close = useCallback((key) => setToasts((ts) => ts.filter((t) => t.key !== key)), []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <Box
        aria-live="polite"
        sx={{
          position: "fixed",
          zIndex: 1500,
          right: { xs: 16, sm: 24 },
          bottom: { xs: 16, sm: 24 },
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 1,
          pointerEvents: "none",
        }}
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <Toast key={t.key} t={t} onClose={close} />
          ))}
        </AnimatePresence>
      </Box>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

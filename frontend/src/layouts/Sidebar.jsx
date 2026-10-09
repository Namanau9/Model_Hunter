import React from "react";
import { Box, Typography, Tooltip, IconButton } from "@mui/material";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import FirstPageRoundedIcon from "@mui/icons-material/FirstPageRounded";
import LastPageRoundedIcon from "@mui/icons-material/LastPageRounded";
import Logo from "../components/Logo";
import { NAV_GROUPS, findNav } from "./nav";
import { useApp } from "../contexts/AppContext";

export const SIDEBAR_W = 240;
export const SIDEBAR_W_COLLAPSED = 68;

export default function Sidebar({ collapsed = false, onToggle, onNavigate, showToggle = true }) {
  const { pathname } = useLocation();
  const { health, info } = useApp();
  const active = findNav(pathname);
  const online = health?.status === "ok";

  return (
    <Box component="nav" aria-label="Primary" sx={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: collapsed ? 0 : 2.25, height: 60, justifyContent: collapsed ? "center" : "flex-start", borderBottom: "1px solid var(--line)" }}>
        <NavLink to="/" aria-label="ModelHunter home" style={{ display: "flex" }} onClick={onNavigate}>
          <Logo size={28} />
        </NavLink>
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.98rem", lineHeight: 1.1, letterSpacing: "-0.01em" }}>ModelHunter</Typography>
            <Typography sx={{ fontSize: "0.7rem", color: "var(--ink-3)" }}>Adversarial ML lab</Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", px: collapsed ? 1 : 1.25, py: 1.5 }}>
        {NAV_GROUPS.map((g) => (
          <Box key={g.label} sx={{ mb: 1.25 }}>
            {!collapsed ? (
              <Typography sx={{ px: 1.25, py: 0.5, fontSize: "0.7rem", fontWeight: 500, color: "var(--ink-3)" }}>{g.label}</Typography>
            ) : (
              <Box sx={{ height: "1px", mx: 1, my: 1, background: "var(--line)" }} aria-hidden />
            )}
            {g.items.map((n) => {
              const isActive = active?.to === n.to;
              const link = (
                <Box
                  component={NavLink}
                  to={n.to}
                  end={n.to === "/"}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  sx={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    minHeight: 38,
                    px: collapsed ? 0 : 1.25,
                    justifyContent: collapsed ? "center" : "flex-start",
                    mb: 0.25,
                    borderRadius: "6px",
                    textDecoration: "none",
                    color: isActive ? "var(--ink)" : "var(--ink-2)",
                    transition: "color 140ms ease, background-color 140ms ease",
                    "&:hover": { color: "var(--ink)", backgroundColor: isActive ? undefined : "var(--hover)" },
                    "&:focus-visible": { outline: "2px solid var(--blue)", outlineOffset: 1 },
                  }}
                >
                  {isActive && (
                    <Box
                      component={motion.span}
                      layoutId="nav-active"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      aria-hidden
                      sx={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "6px",
                        background: "var(--raised)",
                        border: "1px solid var(--line-strong)",
                        boxShadow: "var(--shadow)",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          left: -1,
                          top: 9,
                          bottom: 9,
                          width: 2,
                          borderRadius: 2,
                          background: "var(--ink)",
                        },
                      }}
                    />
                  )}
                  <Box aria-hidden sx={{ position: "relative", display: "flex", color: isActive ? "var(--ink)" : "inherit", "& svg": { fontSize: 19 } }}>
                    <n.Icon />
                  </Box>
                  {!collapsed && (
                    <Typography component="span" sx={{ position: "relative", fontSize: "0.88rem", fontWeight: isActive ? 600 : 500 }}>
                      {n.label}
                    </Typography>
                  )}
                </Box>
              );
              return collapsed ? (
                <Tooltip key={n.to} title={n.label} placement="right">
                  {link}
                </Tooltip>
              ) : (
                <React.Fragment key={n.to}>{link}</React.Fragment>
              );
            })}
          </Box>
        ))}
      </Box>

      <Box sx={{ px: collapsed ? 1 : 2, py: 1.5, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", gap: 1, flexDirection: collapsed ? "column" : "row" }}>
        {!collapsed ? (
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: "0.76rem", display: "flex", alignItems: "center", gap: 0.75, color: "var(--ink-2)" }}>
              <Box component="span" className="mh-dot" sx={{ color: online ? "var(--status-strong-text)" : "var(--status-weak-text)" }} aria-hidden />
              {online ? "Backend online" : health ? "Backend offline" : "Connecting…"}
            </Typography>
            <Typography className="mh-mono" noWrap sx={{ fontSize: "0.68rem", color: "var(--ink-3)", mt: 0.25 }}>
              v{info?.version ?? "—"} · {info?.device?.type ? info.device.type.toUpperCase() : "—"}
            </Typography>
          </Box>
        ) : (
          <Tooltip title={online ? "Backend online" : "Backend offline"} placement="right">
            <Box component="span" className="mh-dot" sx={{ color: online ? "var(--status-strong-text)" : "var(--status-weak-text)" }} aria-label={online ? "Backend online" : "Backend offline"} />
          </Tooltip>
        )}
        {showToggle && (
          <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"} placement="right">
            <IconButton onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} size="small" sx={{ width: 32, height: 32 }}>
              {collapsed ? <LastPageRoundedIcon fontSize="small" /> : <FirstPageRoundedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}

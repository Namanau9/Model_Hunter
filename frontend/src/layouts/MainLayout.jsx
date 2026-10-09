import React, { useEffect, useState } from "react";
import {
  AppBar, Toolbar, Typography, Box, Chip, IconButton, Tooltip, Drawer, List,
  ListItemButton, ListItemIcon, ListItemText, Divider, useTheme, useMediaQuery,
  Backdrop, CircularProgress,
} from "@mui/material";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import RefreshIcon from "@mui/icons-material/Refresh";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MemoryIcon from "@mui/icons-material/Memory";
import StorageIcon from "@mui/icons-material/Storage";
import SecurityIcon from "@mui/icons-material/Security";
import ShieldIcon from "@mui/icons-material/Shield";
import AssessmentIcon from "@mui/icons-material/Assessment";
import InsightsIcon from "@mui/icons-material/Insights";
import DescriptionIcon from "@mui/icons-material/Description";
import SettingsIcon from "@mui/icons-material/Settings";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import Logo from "../components/Logo";
import { useApp } from "../contexts/AppContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: <DashboardIcon /> },
  { to: "/models", label: "Models", icon: <MemoryIcon /> },
  { to: "/datasets", label: "Datasets", icon: <StorageIcon /> },
  { to: "/attacks", label: "Attack Center", icon: <SecurityIcon /> },
  { to: "/defenses", label: "Defense Center", icon: <ShieldIcon /> },
  { to: "/evaluation", label: "Evaluation", icon: <AssessmentIcon /> },
  { to: "/demo", label: "Demo Mode", icon: <RocketLaunchIcon /> },
  { to: "/explainability", label: "Explainability", icon: <InsightsIcon /> },
  { to: "/reports", label: "Reports", icon: <DescriptionIcon /> },
  { to: "/settings", label: "Settings", icon: <SettingsIcon /> },
];

const DRAWER_W = 252;

function UtcClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    <Box className="mh-mono" sx={{ mr: 2, textAlign: "right", lineHeight: 1.1, display: { xs: "none", sm: "block" } }}>
      <Typography variant="caption" sx={{ color: "text.secondary", letterSpacing: "0.08em" }}>
        {`${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`}
      </Typography>
      <Typography variant="overline" sx={{ fontSize: "0.58rem", color: "text.disabled", letterSpacing: "0.16em" }}>
        UTC
      </Typography>
    </Box>
  );
}

export default function MainLayout() {
  const { health, refresh, loading, info } = useApp();
  const statusOk = health?.status === "ok";
  const theme = useTheme();
  const cy = theme.palette.secondary.main;
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const activeKey = location.pathname;
  const activeLabel = NAV.find((n) => n.to === activeKey)?.label ?? "ModelHunter";

  const drawer = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 2.5 }}>
        <Logo size={48} />
        <Box>
          <Typography
            variant="h6"
            className="mh-display"
            sx={{ color: "secondary.main", fontWeight: 700, letterSpacing: 1, lineHeight: 1 }}
          >
            ModelHunter
          </Typography>
          <Typography variant="overline" sx={{ fontSize: "0.58rem", color: "text.disabled", letterSpacing: "0.18em" }}>
            Adversarial ML Ops
          </Typography>
        </Box>
      </Box>
      <Divider sx={{ borderColor: "divider", opacity: 0.6, mx: 2 }} />
      <Typography variant="overline" sx={{ px: 3, pt: 2.5, pb: 1, fontSize: "0.6rem", color: "text.disabled", letterSpacing: "0.18em" }}>
        Operations
      </Typography>
      <List sx={{ flexGrow: 1, px: 1 }}>
        {NAV.map((n) => {
          const active = n.to === activeKey;
          return (
            <ListItemButton
              key={n.to}
              component={NavLink}
              to={n.to}
              onClick={() => setMobileOpen(false)}
              sx={{
                color: active ? "secondary.main" : "text.secondary",
                py: 1.05,
                pl: 2,
                pr: 2.5,
                mb: 0.25,
                borderRadius: 2,
                position: "relative",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  left: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 3,
                  height: active ? 18 : 0,
                  borderRadius: 2,
                  backgroundColor: "secondary.main",
                  boxShadow: active ? `0 0 8px ${alpha(cy, 0.8)}` : "none",
                  transition: "height 180ms ease, box-shadow 180ms ease",
                },
                "&::after": active
                  ? {
                      content: '""',
                      position: "absolute",
                      inset: 0,
                      borderRadius: 2,
                      background: `linear-gradient(90deg, ${alpha(cy, 0.14)}, rgba(39,224,255,0))`,
                    }
                  : undefined,
                "&.Mui-selected, &:hover": { backgroundColor: "transparent" },
                "&:hover": {
                  color: "secondary.main",
                  background: `linear-gradient(90deg, ${alpha(cy, 0.09)}, transparent)`,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>{n.icon}</ListItemIcon>
              <ListItemText
                primary={n.label}
                primaryTypographyProps={{ fontSize: "0.92rem", fontWeight: active ? 600 : 500, letterSpacing: "0.01em" }}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Box
        sx={{
          px: 2.5,
          py: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Chip
          size="small"
          label={statusOk ? "SYSTEM \u2022 ONLINE" : "SYSTEM \u2022 OFFLINE"}
          sx={{
            fontFamily: "var(--mh-font-mono)",
            letterSpacing: "0.08em",
            fontSize: "0.66rem",
            fontWeight: 600,
            color: statusOk ? "success.main" : "error.main",
            border: `1px solid ${alpha(statusOk ? theme.palette.success.main : theme.palette.error.main, 0.5)}`,
            backgroundColor: alpha(statusOk ? theme.palette.success.main : theme.palette.error.main, 0.12),
            "& .MuiChip-label": { px: 1 },
          }}
        />
        <Typography variant="caption" className="mh-mono" sx={{ color: "text.disabled" }}>
          v{info?.version ?? "\u2014"}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          ml: { md: `${DRAWER_W}px` },
          bgcolor: "transparent",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 1, display: { md: "none" } }}
              aria-label="open navigation"
            >
              <MenuIcon />
            </IconButton>
          )}
          <Logo size={38} sx={{ mr: 1.25, display: { md: "none" } }} />
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, letterSpacing: 1, display: { md: "none" }, color: "secondary.main", fontWeight: 700 }}
          >
            ModelHunter
          </Typography>
          <Typography
            className="mh-display"
            variant="subtitle1"
            sx={{
              flexGrow: 1,
              display: { xs: "none", md: "block" },
              color: "text.primary",
              fontWeight: 600,
              letterSpacing: 1,
            }}
          >
            {activeLabel}
            <Typography component="span" className="mh-blink" sx={{ ml: 1, color: "secondary.main", fontSize: "0.9em" }}>_</Typography>
          </Typography>
          <UtcClock />
          <Tooltip title="Refresh data">
            <IconButton onClick={refresh} size="small" color="inherit">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Chip
            size="small"
            label={statusOk ? "API \u2022 ONLINE" : "API \u2022 OFFLINE"}
            sx={{
              ml: 1,
              fontFamily: "var(--mh-font-mono)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              fontSize: "0.66rem",
              color: statusOk ? "success.main" : "error.main",
              border: `1px solid ${alpha(statusOk ? theme.palette.success.main : theme.palette.error.main, 0.5)}`,
              backgroundColor: alpha(statusOk ? theme.palette.success.main : theme.palette.error.main, 0.12),
              boxShadow: `0 0 14px 1px ${alpha(statusOk ? theme.palette.success.main : theme.palette.error.main, 0.35)}`,
            }}
          />
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_W }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          ModalProps={isMobile ? { keepMounted: true } : undefined}
          open={isMobile ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          sx={{
            "& .MuiDrawer-paper": { width: DRAWER_W, boxSizing: "border-box" },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2.5, md: 3.5 }, mt: 8, pb: 6 }}>
        <Backdrop
          open={!!loading}
          sx={{ color: "secondary.main", zIndex: (t) => t.zIndex.drawer + 2 }}
        >
          <CircularProgress color="secondary" />
        </Backdrop>
        <Outlet />
      </Box>
    </Box>
  );
}
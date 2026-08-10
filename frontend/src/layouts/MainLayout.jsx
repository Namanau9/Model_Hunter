import React, { useState } from "react";
import {
  AppBar, Toolbar, Typography, Box, Chip, IconButton, Tooltip, Drawer, List,
  ListItemButton, ListItemIcon, ListItemText, Divider, useTheme, useMediaQuery,
  Backdrop, CircularProgress,
} from "@mui/material";
import { NavLink, Outlet, useLocation } from "react-router-dom";
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
import Logo from "../components/Logo";
import { useApp } from "../contexts/AppContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: <DashboardIcon /> },
  { to: "/models", label: "Models", icon: <MemoryIcon /> },
  { to: "/datasets", label: "Datasets", icon: <StorageIcon /> },
  { to: "/attacks", label: "Attack Center", icon: <SecurityIcon /> },
  { to: "/defenses", label: "Defense Center", icon: <ShieldIcon /> },
  { to: "/evaluation", label: "Evaluation", icon: <AssessmentIcon /> },
  { to: "/explainability", label: "Explainability", icon: <InsightsIcon /> },
  { to: "/reports", label: "Reports", icon: <DescriptionIcon /> },
  { to: "/settings", label: "Settings", icon: <SettingsIcon /> },
];

const DRAWER_W = 250;

export default function MainLayout() {
  const { health, refresh, loading } = useApp();
  const statusOk = health?.status === "ok";
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const activeLabel = NAV.find((n) => n.to === location.pathname)?.label ?? "ModelHunter";

  const drawer = (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 2 }}>
        <Logo size={32} />
        <Typography variant="h6" sx={{ color: "#00E5FF", fontWeight: 700, letterSpacing: 1 }}>
          ModelHunter
        </Typography>
      </Box>
      <Divider sx={{ borderColor: "#1E293B" }} />
      <List>
        {NAV.map((n) => (
          <ListItemButton
            key={n.to}
            component={NavLink}
            to={n.to}
            onClick={() => setMobileOpen(false)}
            sx={{
              color: "#94A3B8",
              " &.active, &:hover": { color: "#00E5FF", bgcolor: "rgba(0,229,255,.08)" },
              "& .MuiListItemIcon-root": { color: "inherit", minWidth: 40 },
            }}
          >
            <ListItemIcon>{n.icon}</ListItemIcon>
            <ListItemText primary={n.label} />
          </ListItemButton>
        ))}
      </List>
    </>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: 1300,
          ml: { md: `${DRAWER_W}px` },
          bgcolor: "#1E293B",
          boxShadow: "0 0 20px rgba(0,229,255,.15)",
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 1, display: { md: "none" } }}
              aria-label="open navigation"
            >
              <MenuIcon />
            </IconButton>
          )}
          <Logo size={28} sx={{ mr: 1, display: { md: "none" } }} />
          <Typography variant="h6" sx={{ flexGrow: 1, letterSpacing: 1, display: { md: "none" } }}>
            ModelHunter
          </Typography>
          <Typography variant="subtitle2" sx={{ mr: 2, display: { xs: "none", md: "block" } }}>
            {activeLabel}
          </Typography>
          <Tooltip title="Refresh data">
            <IconButton color="inherit" onClick={refresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Chip
            size="small"
            label={statusOk ? "API ONLINE" : "API OFFLINE"}
            color={statusOk ? "success" : "error"}
            variant="outlined"
          />
        </Toolbar>
      </AppBar>

      {/* Drawer: permanent on desktop, temporary on mobile */}
      <Box component="nav" sx={{ width: { md: DRAWER_W }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          ModalProps={isMobile ? { keepMounted: true } : undefined}
          open={isMobile ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          sx={{
            display: { xs: "block", md: "block" },
            "& .MuiDrawer-paper": {
              width: DRAWER_W,
              boxSizing: "border-box",
              bgcolor: "#0B1220",
              borderRight: "1px solid #1E293B",
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, pb: 4 }}>
        <Backdrop open={!!loading} sx={{ color: "#00E5FF", zIndex: (t) => t.zIndex.drawer + 1 }}>
          <CircularProgress color="inherit" />
        </Backdrop>
        <Outlet />
      </Box>
    </Box>
  );
}


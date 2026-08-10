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
import { alpha } from "@mui/material/styles";

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

        const activeKey = location.pathname;
  const activeLabel = NAV.find((n) => n.to === activeKey)?.label ?? "ModelHunter";

  const drawer = (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 2.5 }}>
        <Logo size={34} />
        <Typography variant="h6" sx={{ color: "secondary.main", fontWeight: 700, letterSpacing: 1 }}>
          ModelHunter
        </Typography>
      </Box>
      <Divider sx={{ borderColor: "divider" }} />
      <List>
        {NAV.map((n) => {
          const active = n.to === activeKey;
          return (
            <ListItemButton
              key={n.to}
              component={NavLink}
              to={n.to}
              onClick={() => setMobileOpen(false)}
              sx={{
                color: "text.secondary",
                py: 1.25,
                pl: 1.5,
                pr: 2.5,
                position: "relative",
                alignItems: "center",
                gap: 1,
                "&::before": {
                  content: '""',
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 4,
                  height: active ? 24 : 0,
                  borderRadius: 2,
                  backgroundColor: active ? "secondary.main" : "transparent",
                  transition: "height 200ms ease, background-color 200ms ease",
                },
                "&.active, &:hover": { color: "secondary.main", backgroundColor: "rgba(0,229,255,.08)" },
                "& .MuiListItemIcon-root": { color: "inherit", minWidth: 40 },
              }}
            >
              <ListItemIcon>{n.icon}</ListItemIcon>
              <ListItemText primary={n.label} />
            </ListItemButton>
          );
        })}
      </List>
    </>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: 1300,
          ml: { md: `${DRAWER_W}px` },
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          boxShadow: "0 0 22px rgba(0,229,255,.10)",
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
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              letterSpacing: 1,
              display: { md: "none" },
              color: "secondary.main",
              fontWeight: 700,
            }}
          >
            ModelHunter
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{ mr: 2, display: { xs: "none", md: "block" }, color: "text.primary", fontWeight: 600 }}
          >
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
            variant="filled"
            sx={{
              ml: 1,
              fontWeight: 700,
              letterSpacing: 1,
              bgcolor: statusOk ? "success.main" : "error.main",
              color: statusOk ? "#001014" : "#ffffff",
              boxShadow: statusOk
                ? `0 0 10px 2px ${alpha(theme.palette.success.main, 0.45)}`
                : `0 0 10px 2px ${alpha(theme.palette.error.main, 0.45)}`,
            }}
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
              bgcolor: "background.default",
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, pb: 4 }}>
        <Backdrop open={!!loading} sx={{ color: "secondary.main", zIndex: (t) => t.zIndex.drawer + 1 }}>
          <CircularProgress color="secondary" />
        </Backdrop>
        <Outlet />
      </Box>
    </Box>
  );
}


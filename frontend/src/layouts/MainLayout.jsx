import React from "react";
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, AppBar, Typography, Chip, IconButton } from "@mui/material";
import { NavLink, Outlet } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MemoryIcon from "@mui/icons-material/Memory";
import StorageIcon from "@mui/icons-material/Storage";
import SecurityIcon from "@mui/icons-material/Security";
import ShieldIcon from "@mui/icons-material/Shield";
import AssessmentIcon from "@mui/icons-material/Assessment";
import InsightsIcon from "@mui/icons-material/Insights";
import DescriptionIcon from "@mui/icons-material/Description";
import SettingsIcon from "@mui/icons-material/Settings";
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
  const { health } = useApp();
  const statusOk = health?.status === "ok";

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: 1300, ml: `${DRAWER_W}px`, bgcolor: "#1E293B", boxShadow: "0 0 20px rgba(0,229,255,.15)" }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, letterSpacing: 1 }}>
            <Box component="span" color="#00E5FF">
              Model
            </Box>
            Hunter
          </Typography>
          <Chip
            size="small"
            label={statusOk ? "API ONLINE" : "API OFFLINE"}
            color={statusOk ? "success" : "error"}
            variant="outlined"
          />
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_W,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: DRAWER_W, boxSizing: "border-box", bgcolor: "#0B1220", borderRight: "1px solid #1E293B" },
        }}
      >
        <Toolbar />
        <List>
          {NAV.map((n) => (
            <ListItemButton
              key={n.to}
              component={NavLink}
              to={n.to}
              sx={{
                color: "#94A3B8",
                "&.active": { color: "#00E5FF", bgcolor: "rgba(0,229,255,.08)", borderLeft: "3px solid #00E5FF" },
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>{n.icon}</ListItemIcon>
              <ListItemText primary={n.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Outlet />
      </Box>
    </Box>
  );
}

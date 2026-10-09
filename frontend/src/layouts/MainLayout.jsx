import React, { useEffect, useRef, useState } from "react";
import { Box, Drawer, useMediaQuery, useTheme } from "@mui/material";
import { useLocation, useOutlet } from "react-router-dom";
import { motion } from "framer-motion";
import Sidebar, { SIDEBAR_W, SIDEBAR_W_COLLAPSED } from "./Sidebar";
import Topbar from "./Topbar";
import CommandPalette from "./CommandPalette";
import { findNav } from "./nav";
import { page } from "../lib/motion";
import { useUiPrefs } from "../contexts/UiPrefsContext";

export default function MainLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { sidebarCollapsed, set } = useUiPrefs();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const outlet = useOutlet();
  const mainRef = useRef(null);
  const current = findNav(location.pathname);
  const collapsed = !isMobile && sidebarCollapsed;
  const width = collapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W;

  // ⌘K / Ctrl+K opens the command palette.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // On route change: scroll to top (or to #hash) and move focus to <main>.
  useEffect(() => {
    document.title = `${current?.label ?? "Not found"} · ModelHunter`;
    if (location.hash) {
      const t = setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" }), 380);
      return () => clearTimeout(t);
    }
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
    return undefined;
  }, [location.pathname, location.hash, current?.label]);

  return (
    <>
      <a href="#main" className="mh-skip">
        Skip to content
      </a>
      <Box sx={{ display: "flex", minHeight: "100dvh" }}>
        {isMobile ? (
          <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} PaperProps={{ sx: { width: SIDEBAR_W } }}>
            <Sidebar onNavigate={() => setMobileOpen(false)} showToggle={false} />
          </Drawer>
        ) : (
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width,
              zIndex: 41,
              transition: "width 240ms cubic-bezier(.22,1,.36,1)",
              borderRight: "1px solid var(--line)",
              background: "var(--side)",
            }}
          >
            <Sidebar collapsed={collapsed} onToggle={() => set({ sidebarCollapsed: !sidebarCollapsed })} />
          </Box>
        )}

        <Box sx={{ flex: 1, minWidth: 0, ml: isMobile ? 0 : `${width}px`, transition: "margin-left 240ms cubic-bezier(.22,1,.36,1)" }}>
          <Topbar current={current} isMobile={isMobile} onMenu={() => setMobileOpen(true)} onSearch={() => setPaletteOpen(true)} />
          <Box
            component="main"
            id="main"
            ref={mainRef}
            tabIndex={-1}
            sx={{ outline: "none", px: { xs: 2, sm: 3, md: 4.5 }, pt: { xs: 3, md: 4 }, pb: 10, maxWidth: 1480, mx: "auto" }}
          >
            {/* Enter-only page transition. An exit animation (AnimatePresence
                mode="wait") can stall when the leaving page holds layoutId
                elements, which would leave the old page on screen. */}
            <motion.div key={location.pathname} variants={page} initial="initial" animate="animate">
              {outlet}
            </motion.div>
          </Box>
        </Box>
      </Box>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}

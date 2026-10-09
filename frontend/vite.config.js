import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Backend is expected on http://localhost:8000; proxy keeps CORS simple in dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split heavy vendors so the app shell loads and caches independently.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          mui: ["@mui/material", "@emotion/react", "@emotion/styled"],
          charts: ["recharts"],
          motion: ["framer-motion"],
        },
      },
    },
  },
});

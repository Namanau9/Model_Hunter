import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// UI review build: serves demo.html, which mocks the API in the browser.
// `npm run demo` (dev server) or `npm run build:demo` (static, any host).
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { port: 5174, open: "/demo.html" },
  preview: { port: 4174, open: "/demo.html" },
  build: {
    outDir: "dist-demo",
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: { input: resolve(__dirname, "demo.html") },
  },
});

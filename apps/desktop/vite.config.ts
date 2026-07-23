import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Puerto fijo: tauri.conf.json apunta a él en desarrollo.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
});

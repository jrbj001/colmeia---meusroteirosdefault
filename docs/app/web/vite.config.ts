import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base './' -> assets relativos (o bundle é servido pelo api/server.py em /)
// proxy /api -> backend python (dev com HMR)
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8137" },
  },
});

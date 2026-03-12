import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://localhost:5000",
      "/experiments": "http://localhost:5000",
      "/ai": "http://localhost:5000",
    },
  },
});

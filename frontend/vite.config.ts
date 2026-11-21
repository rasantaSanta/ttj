import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Alle /api-Anfragen ans Backend weiterleiten (kein CORS-Aerger, Keys bleiben serverseitig).
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});

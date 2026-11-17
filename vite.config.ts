import { defineConfig } from "vite";

// GitHub Pages project site needs /racer-online/.
// Render sets RENDER=true — serve the game from the service root instead.
const onRender = Boolean(process.env.RENDER);
const base = process.env.VITE_BASE || (onRender ? "/" : "/racer-online/");

export default defineConfig({
  base,
  server: {
    // 0.0.0.0 so a phone on the same Wi-Fi can open the page and link as a controller.
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/ws": {
        target: "ws://127.0.0.1:8787",
        ws: true,
        changeOrigin: true,
      },
      "/api": {
        // Keep /api prefix — server routes are /api/leaderboard, /api/presence, …
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
});

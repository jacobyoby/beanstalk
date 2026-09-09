import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Beanstalk — Food Recall Tracker",
        short_name: "Beanstalk",
        description: "Track FDA food recalls and get alerts",
        theme_color: "#fafafa",
        background_color: "#fafafa",
        display: "standalone",
        icons: [
          { src: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
          { src: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png,ico}"] },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api/food": {
        target: "https://api.fda.gov",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/food/, "/food"),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            const url = new URL(req.url || "", "https://api.fda.gov");
            const apiKey = process.env.OPENFDA_API_KEY;
            if (apiKey && !url.searchParams.has("api_key")) {
              const separator = url.search ? "&" : "?";
              proxyReq.path += `${separator}api_key=${apiKey}`;
            }
          });
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
});

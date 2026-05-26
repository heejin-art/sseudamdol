import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  server: { host: true, port: 5174 },
  build: { target: "es2020" },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "쓰담돌 · Sseudamdol",
        short_name: "쓰담돌",
        description: "마음이 불안할 때, 돌을 문질러보세요",
        theme_color: "#2D2B3D",
        background_color: "#1A1828",
        display: "standalone",
        orientation: "portrait",
        scope: "./",
        start_url: "./",
        lang: "ko",
        categories: ["health", "lifestyle"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/hangeul\.pstatic\.net\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "nanum-font", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
});

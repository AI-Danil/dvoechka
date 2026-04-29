import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "production" && legacy({
      targets: ["defaults", "Chrome >= 61", "Safari >= 12", "iOS >= 12", "Android >= 7"],
      modernPolyfills: true,
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  build: {
    target: "es2018",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

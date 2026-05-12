import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
// GitHub Pages and GitLab Pages project sites live under /<repo>/.
// - GitHub Actions: GITHUB_PAGES=true + GITHUB_REPOSITORY=<owner>/<repo>
// - GitLab CI: GITLAB_PAGES=true + CI_PROJECT_NAME=<repo>
// All other hosts (Lovable, Netlify, Cloudflare) keep base="/".
const projectBase = (() => {
  if (process.env.GITHUB_PAGES === "true") {
    const repo = (process.env.GITHUB_REPOSITORY || "").split("/")[1];
    return repo ? `/${repo}/` : "/";
  }
  if (process.env.GITLAB_PAGES === "true") {
    const repo = process.env.CI_PROJECT_NAME || "";
    return repo ? `/${repo}/` : "/";
  }
  return "/";
})();

export default defineConfig(({ mode }) => ({
  base: mode === "production" ? projectBase : "/",
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
      // Cover ancient school PCs and tablets: IE11, very old Android WebView, old Safari.
      targets: ["defaults", "Chrome >= 49", "Safari >= 10", "iOS >= 10", "Android >= 5", "ie >= 11"],
      modernPolyfills: true,
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean) as any,
  build: {
    target: "es2018",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

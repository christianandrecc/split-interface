import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { execFileSync } from "node:child_process";

function releaseId() {
  try {
    const sha = process.env.VERCEL_GIT_COMMIT_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    return /^[a-f0-9]{7,40}$/.test(sha) ? `split@${sha}${process.env.VERCEL_GIT_COMMIT_SHA ? "" : "-local"}` : "";
  } catch {
    return "";
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: { __SPLIT_RELEASE__: JSON.stringify(releaseId()) },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

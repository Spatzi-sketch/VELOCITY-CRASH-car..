import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build also works from a sub-path or a plain
  // static host (e.g. dragging the dist folder somewhere), not just "/".
  base: "./",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // vite-plugin-singlefile inlines JS + CSS into one index.html, so no
    // /assets/* files are produced. These settings keep that inlining
    // un-truncated and the output free of sourcemaps.
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 4096,
    sourcemap: false,
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    // Accept any host (tunnel, LAN IP, preview domain) instead of only
    // localhost, so the dev server also works behind a proxy.
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
});

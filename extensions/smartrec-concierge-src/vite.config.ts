import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "SmartRecConcierge",
      formats: ["iife"],
      fileName: () => "smartrec-concierge.iife.js",
    },
    outDir: resolve(__dirname, "../smartrec-theme-ext/assets"),
    emptyOutDir: false, // preserve smartrec-signal-collector.js and smartrec-widget-renderer.js
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});

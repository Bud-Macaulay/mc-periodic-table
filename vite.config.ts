import { defineConfig } from "vite";

export default defineConfig({
  root: "demo",

  server: {
    open: true,
  },

  build: {
    outDir: "../dist",
    emptyOutDir: true,
    lib: {
      entry: "../src/index.ts",
      name: "PeriodicTable",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
  },
});

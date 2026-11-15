import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    app: "src/app.ts",
  },
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  noExternal: ["@aguateria/shared"],
});

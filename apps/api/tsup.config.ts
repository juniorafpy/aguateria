import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // El paquete compartido se publica como código TypeScript fuente dentro del
  // monorepo, así que hay que incluirlo en el bundle en lugar de externalizarlo.
  noExternal: ["@aguateria/shared"],
});

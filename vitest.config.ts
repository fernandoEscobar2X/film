import { defineConfig } from "vitest/config";

/** Pruebas de funciones puras del estudio (guion, loop, muestreo). No necesitan navegador. */
export default defineConfig({
  test: { include: ["film/src/**/*.test.ts", "scripts/**/*.test.mjs"] },
});

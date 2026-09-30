import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/** Servidor del estudio de video. Solo desarrollo: nada de `film/` entra al bundle del sitio. */
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  // Lee `src/styles/tokens.css` (paleta de marca) desde la raíz del repo.
  // Sin HMR ni watcher: editar código durante un render largo no debe recargar la página.
  server: {
    // Si hay otro render en curso, toma el siguiente puerto libre.
    port: 5199,
    strictPort: false,
    hmr: false,
    watch: null,
    fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] },
  },
  logLevel: "warn",
  clearScreen: false,
});

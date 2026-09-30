/// <reference types="vite/client" />

import type { Clip } from "./clips";
import type { Layer } from "./worlds/types";

declare global {
  interface Window {
    /** API que usa `scripts/film.mjs` para pedir cuadros. */
    film?: {
      readonly clip: Clip;
      readonly frames: number;
      /** Renderiza el cuadro `index` de una capa y lo devuelve como PNG (data URL). */
      frame(index: number, layer: Layer): Promise<string>;
    };
    filmError?: string;
  }
}

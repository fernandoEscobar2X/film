/// <reference types="vite/client" />

import type { Clip } from "./clips";
import type { Anchor, Layer, ScriptEvent } from "./worlds/types";

/**
 * Ancla proyectada en un cuadro, en 0–1 desde arriba a la izquierda: la torreta (x, y) y el centro
 * del cuerpo de la máquina (bodyX, bodyY). Distancia en metros.
 */
export interface ProjectedAnchor {
  readonly id: string;
  readonly kind: Anchor["kind"];
  readonly x: number;
  readonly y: number;
  readonly bodyX: number;
  readonly bodyY: number;
  readonly distance: number;
  readonly visible: boolean;
}

declare global {
  interface Window {
    /** API que usa `scripts/film.mjs` para pedir cuadros. */
    film?: {
      readonly clip: Clip;
      readonly frames: number;
      /** Renderiza el cuadro `index` de una capa y lo devuelve como PNG (data URL). */
      frame(index: number, layer: Layer): Promise<string>;
      /** Anclas del mundo proyectadas con la cámara del cuadro `index` (sin render). */
      anchors(index: number): ProjectedAnchor[];
      /** Campo de visión vertical de la cámara, en grados (para estimar tamaños en pantalla). */
      readonly fov: number;
      readonly events: readonly ScriptEvent[];
    };
    filmError?: string;
  }
}

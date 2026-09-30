/**
 * Catálogo de tomas. El id sigue el patrón `<industria>-<luz>-<encuadre>` y es también
 * el nombre del archivo final (`public/media/hero/<id>.*`).
 */

export const industries = ["manufactura", "logistica", "construccion", "agroindustria", "energia"] as const;
export type Industry = (typeof industries)[number];

export const lights = ["noche", "dia"] as const;
export type Light = (typeof lights)[number];

/** h = 16:9 (desktop), v = 9:16 (móvil). Son composiciones distintas, no recortes. */
export const framings = ["h", "v"] as const;
export type Framing = (typeof framings)[number];

export interface Clip {
  readonly id: string;
  readonly industry: Industry;
  readonly light: Light;
  readonly framing: Framing;
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  /** Duración del loop en segundos. La escena en `duration` es idéntica a la de 0. */
  readonly duration: number;
  /** Subcuadros acumulados por cuadro (antialias, sombras suaves, desenfoque y motion blur). */
  readonly samples: number;
  /** Fracción del cuadro con el obturador abierto (0.5 = 180°, como en cine). */
  readonly shutter: number;
}

const sizes: Record<Framing, readonly [number, number]> = { h: [1920, 1080], v: [1080, 1920] };

/** Duración por industria: la cámara recorre exactamente un periodo del mundo en ese tiempo. */
const durations: Record<Industry, number> = {
  manufactura: 12,
  logistica: 12,
  construccion: 12,
  agroindustria: 12,
  energia: 12,
};

function isOneOf<T extends string>(values: readonly T[], value: string | undefined): value is T {
  return value !== undefined && (values as readonly string[]).includes(value);
}

export function parseClip(id: string): Clip {
  const [industry, light, framing] = id.split("-");
  if (!isOneOf(industries, industry) || !isOneOf(lights, light) || !isOneOf(framings, framing)) {
    throw new Error(`Toma desconocida: "${id}". Formato: <industria>-<noche|dia>-<h|v>`);
  }
  const [width, height] = sizes[framing];
  return {
    id,
    industry,
    light,
    framing,
    width,
    height,
    fps: 30,
    duration: durations[industry],
    samples: 48,
    shutter: 0.5,
  };
}

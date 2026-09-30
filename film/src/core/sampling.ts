/**
 * Secuencias de baja discrepancia para los subcuadros. Son fijas (no aleatorias), así que
 * el mismo cuadro siempre produce los mismos píxeles y el ruido no parpadea entre cuadros.
 */

export function halton(index: number, base: number): number {
  let fraction = 1;
  let result = 0;
  let i = index;
  while (i > 0) {
    fraction /= base;
    result += fraction * (i % base);
    i = Math.floor(i / base);
  }
  return result;
}

/** Mapea [0,1)² a un disco unitario conservando la distribución (Shirley y Chiu). */
export function concentricDisk(u: number, v: number): [number, number] {
  const a = 2 * u - 1;
  const b = 2 * v - 1;
  if (a === 0 && b === 0) return [0, 0];
  if (Math.abs(a) > Math.abs(b)) {
    const phi = (Math.PI / 4) * (b / a);
    return [a * Math.cos(phi), a * Math.sin(phi)];
  }
  const phi = Math.PI / 2 - (Math.PI / 4) * (a / b);
  return [b * Math.cos(phi), b * Math.sin(phi)];
}

/** Filtro de reconstrucción en tienda, radio en píxeles. */
function tent(u: number, radius: number): number {
  const x = u < 0.5 ? Math.sqrt(2 * u) - 1 : 1 - Math.sqrt(2 - 2 * u);
  return x * radius;
}

export interface Subsample {
  /** Desplazamiento subpíxel en píxeles. */
  readonly pixel: readonly [number, number];
  /** Punto en la apertura del lente, en el disco unitario. */
  readonly lens: readonly [number, number];
  /** Instante dentro del obturador, de 0 a 1. */
  readonly time: number;
  /** Dos variables libres para que cada mundo reparta sus luces de área. */
  readonly light: readonly [number, number];
  /** Dos variables uniformes en [0, 1) para recorrer el lóbulo de los reflejos difusos. */
  readonly glossy: readonly [number, number];
}

const PIXEL_FILTER_RADIUS = 0.8;

export function subsample(i: number, count: number): Subsample {
  const k = i + 1;
  // Tiempo estratificado y permutado (7 es coprimo con cualquier potencia de 2).
  const stratum = (i * 7) % count;
  return {
    pixel: [tent(halton(k, 2), PIXEL_FILTER_RADIUS), tent(halton(k, 3), PIXEL_FILTER_RADIUS)],
    lens: concentricDisk(halton(k, 5), halton(k, 7)),
    time: (stratum + 0.5) / count,
    light: [halton(k, 11), halton(k, 13)],
    glossy: [halton(k, 17), halton(k, 19)],
  };
}

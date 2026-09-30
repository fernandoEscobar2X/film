/**
 * Simulador de planta: una sola fuente de datos simulados para todo el sitio (manifiesto, y en
 * fases siguientes el tablero Andon y las etiquetas de la lente). Determinista con semilla:
 * la misma semilla da la misma serie, en el servidor, en el navegador y en las pruebas.
 *
 * Cuando haya datos reales, se reemplaza esta fuente sin tocar las vistas.
 */

export interface PlantSnapshot {
  /** Producción por intervalo, normalizada 0–100 (para una sparkline). */
  readonly throughput: readonly number[];
  /** Carga de cada línea, 0–100 (para barras). */
  readonly lines: readonly number[];
}

export interface Plant {
  snapshot(): PlantSnapshot;
  /** Avanza un intervalo: entra una lectura nueva y sale la más vieja. */
  step(): PlantSnapshot;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export function createPlant({ seed = 7, points = 8, lines = 6 } = {}): Plant {
  const random = mulberry32(seed);
  // Caminata aleatoria con regreso a la media: se mueve como una línea de producción real.
  const next = (previous: number, mean: number, spread: number) =>
    clamp(previous + (mean - previous) * 0.35 + (random() - 0.5) * spread);

  let throughput: number[] = [];
  let value = 62;
  for (let i = 0; i < points; i++) {
    value = next(value, 68, 26);
    throughput.push(value);
  }
  let load = Array.from({ length: lines }, () => clamp(45 + random() * 45));

  const snapshot = (): PlantSnapshot => ({ throughput: [...throughput], lines: [...load] });

  return {
    snapshot,
    step() {
      throughput = [...throughput.slice(1), next(throughput.at(-1) ?? 60, 68, 26)];
      load = load.map((current) => next(current, 70, 22));
      return snapshot();
    },
  };
}

/** Texto que Datatype dibuja como gráfica: `{l:…}` línea, `{b:…}` barras. */
export const datatype = {
  line: (values: readonly number[]) => `{l:${values.join(",")}}`,
  bars: (values: readonly number[]) => `{b:${values.join(",")}}`,
};

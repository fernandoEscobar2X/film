import {
  CanvasTexture,
  DataTexture,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
} from "three";
import { createRandom } from "./rng";

/**
 * Ruido de valor periódico (se repite sin costura). Las texturas que se mueven respecto a la
 * cámara deben ser periódicas para que el loop cierre exacto.
 */
function periodicValueNoise(size: number, periods: readonly number[], seed: number): Float32Array {
  const random = createRandom(seed);
  const out = new Float32Array(size * size);
  let amplitude = 1;
  let total = 0;
  for (const period of periods) {
    const lattice = Float32Array.from({ length: period * period }, () => random());
    const at = (x: number, y: number) =>
      lattice[((y + period) % period) * period + ((x + period) % period)] ?? 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * period;
        const fy = (y / size) * period;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const sx = (fx - x0) * (fx - x0) * (3 - 2 * (fx - x0));
        const sy = (fy - y0) * (fy - y0) * (3 - 2 * (fy - y0));
        const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
        const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
        const index = y * size + x;
        out[index] = (out[index] ?? 0) + (top + (bottom - top) * sy) * amplitude;
      }
    }
    total += amplitude;
    amplitude *= 0.55;
  }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) / total;
  return out;
}

export interface NoiseTextureOptions {
  readonly size?: number;
  readonly periods?: readonly number[];
  readonly seed: number;
  /** Rango de salida: el ruido 0–1 se lleva a [min, max]. */
  readonly min: number;
  readonly max: number;
}

/** Textura de datos (rugosidad, variación) en los tres canales, lineal y periódica. */
export function noiseTexture({
  size = 256,
  periods = [4, 8, 16, 32, 64],
  seed,
  min,
  max,
}: NoiseTextureOptions): DataTexture {
  const noise = periodicValueNoise(size, periods, seed);
  const data = new Uint8Array(size * size * 4);
  noise.forEach((value, i) => {
    // El ruido promediado se concentra cerca de 0.5: se estira antes de mapear.
    const stretched = Math.min(1, Math.max(0, (value - 0.5) * 2.2 + 0.5));
    const byte = Math.round((min + (max - min) * stretched) * 255);
    data.set([byte, byte, byte, 255], i * 4);
  });
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = NoColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/** Textura dibujada en canvas 2D (pantallas, señalética sin texto). */
export function canvasTexture(
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D no disponible");
  draw(context);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

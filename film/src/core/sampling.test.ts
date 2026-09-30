import { describe, expect, it } from "vitest";
import { parseClip } from "../clips";
import { concentricDisk, halton, subsample } from "./sampling";

describe("muestreo de subcuadros", () => {
  it("Halton en base 2 genera la secuencia de van der Corput", () => {
    expect([1, 2, 3, 4].map((i) => halton(i, 2))).toEqual([0.5, 0.25, 0.75, 0.125]);
  });

  it("el disco concéntrico queda dentro del círculo unitario", () => {
    for (let i = 1; i < 500; i++) {
      const [x, y] = concentricDisk(halton(i, 5), halton(i, 7));
      expect(Math.hypot(x, y)).toBeLessThanOrEqual(1 + 1e-12);
    }
  });

  it("los instantes del obturador cubren cada estrato una sola vez", () => {
    const count = 48;
    const strata = Array.from({ length: count }, (_, i) => Math.floor(subsample(i, count).time * count));
    expect(new Set(strata).size).toBe(count);
  });

  it("el filtro de píxel no se sale de su radio", () => {
    for (let i = 0; i < 64; i++) {
      for (const offset of subsample(i, 64).pixel) expect(Math.abs(offset)).toBeLessThanOrEqual(0.8);
    }
  });
});

describe("catálogo de tomas", () => {
  it("interpreta industria, luz y encuadre", () => {
    expect(parseClip("manufactura-dia-v")).toMatchObject({
      industry: "manufactura",
      light: "dia",
      framing: "v",
      width: 1080,
      height: 1920,
    });
  });

  it("rechaza tomas desconocidas", () => {
    expect(() => parseClip("mineria-noche-h")).toThrow();
    expect(() => parseClip("manufactura-tarde-h")).toThrow();
  });
});

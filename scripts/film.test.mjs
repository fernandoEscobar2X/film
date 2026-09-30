import { describe, expect, it } from "vitest";
import { parseFrames } from "./film.mjs";

describe("rangos de cuadros", () => {
  it("acepta rangos, listas y pasos", () => {
    expect(parseFrames("0-4", 359)).toEqual([0, 1, 2, 3, 4]);
    expect(parseFrames("0,90,180", 359)).toEqual([0, 90, 180]);
    expect(parseFrames("0-359:90", 359)).toEqual([0, 90, 180, 270]);
  });

  it("ordena y quita repetidos", () => {
    expect(parseFrames("10,2-3,3,10", 359)).toEqual([2, 3, 10]);
  });

  it("rechaza cuadros fuera de la toma y rangos mal escritos", () => {
    expect(() => parseFrames("360", 359)).toThrow(/va del 0 al 359/);
    expect(() => parseFrames("5-2", 359)).toThrow();
    expect(() => parseFrames("a-b", 359)).toThrow();
    expect(() => parseFrames("0-10:0", 359)).toThrow();
  });
});

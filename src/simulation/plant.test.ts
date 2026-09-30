import { describe, expect, it } from "vitest";
import { createPlant, datatype } from "./plant";

describe("simulador de planta", () => {
  it("la misma semilla da la misma serie (servidor y navegador coinciden)", () => {
    const a = createPlant({ seed: 11 });
    const b = createPlant({ seed: 11 });
    expect(a.snapshot()).toEqual(b.snapshot());
    for (let i = 0; i < 20; i++) expect(a.step()).toEqual(b.step());
  });

  it("cada paso agrega una lectura y descarta la más vieja", () => {
    const plant = createPlant({ points: 8 });
    const before = plant.snapshot().throughput;
    const after = plant.step().throughput;
    expect(after).toHaveLength(8);
    expect(after.slice(0, 7)).toEqual(before.slice(1));
  });

  it("los valores quedan en 0–100 aun después de muchos pasos", () => {
    const plant = createPlant({ seed: 3 });
    for (let i = 0; i < 500; i++) {
      const { throughput, lines } = plant.step();
      for (const value of [...throughput, ...lines]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });

  it("arma la sintaxis de Datatype", () => {
    expect(datatype.line([1, 2, 3])).toBe("{l:1,2,3}");
    expect(datatype.bars([4, 5])).toBe("{b:4,5}");
  });
});

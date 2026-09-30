import { describe, expect, it } from "vitest";
import { parseClip } from "../../clips";
import { BOARD_PITCH, MODULES, PERIOD } from "./layout";
import { ALERT, alertLevel, boardX, towerState } from "./script";

const { duration } = parseClip("manufactura-noche-h");
const instants = Array.from({ length: 97 }, (_, i) => (i / 96) * duration);

describe("loop de manufactura", () => {
  it("el módulo k+1 en t+D se ve igual que el módulo k en t (la cámara avanza un módulo por loop)", () => {
    for (const t of instants) {
      for (let k = -3; k <= 12; k++) {
        for (const line of [0, 1, 2]) {
          for (let tower = 0; tower < 4; tower++) {
            expect(towerState(line, k + 1, tower, t + duration, duration)).toBe(
              towerState(line, k, tower, t, duration),
            );
            expect(alertLevel(line, k + 1, tower, t + duration, duration)).toBeCloseTo(
              alertLevel(line, k, tower, t, duration),
              9,
            );
          }
        }
      }
    }
  });

  it("las tarjetas en la banda forman el mismo conjunto al cerrar el loop", () => {
    const count = Math.round(PERIOD / BOARD_PITCH);
    const at = (t: number) =>
      Array.from({ length: count }, (_, j) => boardX(j, t))
        .map((x) => Math.round(x * 1e6) / 1e6)
        .sort((a, b) => a - b);
    for (const t of instants) expect(at(t + duration)).toEqual(at(t));
  });

  it("hay exactamente una alerta por loop, en el módulo 1 de la línea principal", () => {
    const alerted = new Set<number>();
    for (let k = MODULES.first; k <= MODULES.last; k++) {
      if (instants.some((t) => towerState(ALERT.line, k, ALERT.tower, t, duration) === "alerta"))
        alerted.add(k);
    }
    expect([...alerted]).toEqual([1]);
    const active = instants.filter((t) => towerState(ALERT.line, 1, ALERT.tower, t, duration) === "alerta");
    expect(active[0]).toBeGreaterThanOrEqual(ALERT.from);
    expect(active.at(-1)).toBeLessThan(ALERT.to);
  });

  it("ninguna otra línea ni torreta entra en alerta", () => {
    for (const t of instants) {
      for (let k = -3; k <= 12; k++) {
        for (const line of [1, 2]) expect(towerState(line, k, ALERT.tower, t, duration)).toBe("operando");
        expect(towerState(ALERT.line, k, 0, t, duration)).toBe("operando");
      }
    }
  });
});

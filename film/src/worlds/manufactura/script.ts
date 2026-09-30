import { smoothstep, wrap } from "../../core/rng";
import { BOARD_PITCH, BOARD_SPEED, PERIOD } from "./layout";

/**
 * Guion de la toma de manufactura: funciones puras del tiempo, sin three. Cada módulo vive con
 * su propio desfase `τ = t − k·D`, de modo que el módulo k+1 en t+D se ve igual que el módulo
 * k en t: la cámara avanza un módulo por loop y el loop cierra sin costura.
 */

export type TowerState = "operando" | "alerta" | "paro";

/**
 * Guion de la alerta: el segundo pick-and-place de la línea principal pasa a ámbar y vuelve a
 * operar. El guion se repite cada 16 loops (16 módulos), más lejos que el último módulo
 * modelado: en pantalla hay una sola alerta por loop, siempre en el módulo 1.
 */
export const ALERT = { line: 0, tower: 1, cycleLoops: 16, from: 3.6, to: 8.4, ramp: 0.35 } as const;

/** Tiempo dentro de la ventana del guion; negativo o mayor que `to` fuera del evento. */
function alertClock(line: number, module: number, tower: number, t: number, duration: number): number {
  if (line !== ALERT.line || tower !== ALERT.tower) return Number.NEGATIVE_INFINITY;
  return wrap(t - module * duration, ALERT.cycleLoops * duration) - (ALERT.cycleLoops - 1) * duration;
}

/** La torreta cambia en seco, como una real. */
export function towerState(
  line: number,
  module: number,
  tower: number,
  t: number,
  duration: number,
): TowerState {
  const clock = alertClock(line, module, tower, t, duration);
  return clock >= ALERT.from && clock < ALERT.to ? "alerta" : "operando";
}

/** Intensidad de la alerta de 0 a 1, dentro de la misma ventana (la capa de datos la anima). */
export function alertLevel(line: number, module: number, tower: number, t: number, duration: number): number {
  const clock = alertClock(line, module, tower, t, duration);
  return (
    smoothstep(ALERT.from, ALERT.from + ALERT.ramp, clock) *
    (1 - smoothstep(ALERT.to - ALERT.ramp, ALERT.to, clock))
  );
}

/** Posición en x (local del módulo) de la tarjeta j en el instante t. */
export function boardX(j: number, t: number): number {
  return wrap(j * BOARD_PITCH + BOARD_SPEED * t, PERIOD);
}

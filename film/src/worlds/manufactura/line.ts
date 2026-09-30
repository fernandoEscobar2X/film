import { PlaneGeometry } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createRandom } from "../../core/rng";
import { compose, Kit, type Vec3 } from "../kit";
import { AOI, BELT_Y, GAPS, OVEN, PERIOD, PNP, STATIONS, TOWER_SEGMENT, TRAY_Y, TRUSS_Y } from "./layout";
import type { Materials } from "./materials";

/**
 * Un módulo de línea SMT en coordenadas locales: x de 0 a PERIOD en el sentido del flujo,
 * z centrado en la banda, lado del pasillo hacia -z.
 */

export interface LineModule {
  readonly kit: Kit;
  /** Base de cada torreta (centro del poste), en orden: pnpA, pnpB, aoi, horno. */
  readonly towers: readonly Vec3[];
  /** Zona de trabajo de cada pick-and-place para animar el cabezal. */
  readonly heads: ReadonlyArray<{
    readonly x0: number;
    readonly x1: number;
    readonly z0: number;
    readonly z1: number;
  }>;
  /** Sensores de presencia en los huecos de la banda. */
  readonly sensors: readonly Vec3[];
  /** Bajadas de cable de cada máquina a la charola: [x, altura del techo de la máquina]. */
  readonly drops: ReadonlyArray<readonly [number, number]>;
  /** Volúmenes simplificados de cada máquina (la capa de datos los dibuja como bloques). */
  readonly envelopes: ReadonlyArray<{ readonly size: Vec3; readonly base: Vec3 }>;
}

const FRONT = (depth: number) => -depth / 2;

function tower(kit: Kit, m: Materials, base: Vec3): Vec3 {
  const [x, y, z] = base;
  kit.cylinder(m.steel, 0.012, TOWER_SEGMENT.base, [x, y, z], { segments: 10 });
  // De abajo hacia arriba: blanco, verde, ámbar, rojo (orden estándar de una torreta).
  const order = [m.towerSegments[3], m.towerSegments[2], m.towerSegments[1], m.towerSegments[0]];
  order.forEach((material, index) => {
    kit.cylinder(material, TOWER_SEGMENT.radius, TOWER_SEGMENT.height - 0.002, [
      x,
      y + TOWER_SEGMENT.base + index * TOWER_SEGMENT.height,
      z,
    ]);
  });
  kit.cylinder(m.charcoal, TOWER_SEGMENT.radius, 0.014, [
    x,
    y + TOWER_SEGMENT.base + 4 * TOWER_SEGMENT.height,
    z,
  ]);
  return base;
}

/** Monitor en brazo: sale de la máquina en `mountZ` y queda de cara al pasillo en `screenZ`. */
function monitor(kit: Kit, m: Materials, x: number, mountZ: number, screenZ: number, screen: number): void {
  kit.rod(m.structure, 0.014, [x, 1.33, mountZ], [x, 1.33, screenZ + 0.015]);
  kit.box(m.charcoal, [0.36, 0.25, 0.03], [x, 1.2, screenZ]);
  const material = m.screens[screen % m.screens.length];
  if (!material) return;
  kit.add(material, new PlaneGeometry(0.33, 0.22), compose([x, 1.325, screenZ - 0.016], [0, Math.PI, 0]));
}

function pickAndPlace(kit: Kit, m: Materials, x0: number, seed: number) {
  const { width: w, depth: d } = PNP;
  const cx = x0 + w / 2;
  const front = FRONT(d);
  kit.box(m.charcoal, [w - 0.06, 0.08, d - 0.06], [cx, 0, 0]);
  kit.box(m.paint, [w, 0.8, d], [cx, 0.08, 0]);
  // Juntas de puertas y jaladeras.
  kit.box(m.charcoal, [w - 0.04, 0.012, 0.006], [cx, 0.52, front - 0.002]);
  kit.box(m.charcoal, [0.008, 0.37, 0.006], [cx, 0.13, front - 0.002]);
  kit.box(m.steel, [0.02, 0.14, 0.02], [cx - 0.06, 0.28, front - 0.012]);
  kit.box(m.steel, [0.02, 0.14, 0.02], [cx + 0.06, 0.28, front - 0.012]);

  // Cubierta superior: bloque trasero sólido, costados, tapa con el azul de la marca y vidrio al frente.
  kit.box(m.paint, [w, 0.62, d / 2 - 0.1], [cx, 0.88, d / 4 + 0.05]);
  kit.box(m.paint, [0.06, 0.62, d / 2 + 0.1], [x0 + 0.03, 0.88, -d / 4 + 0.05]);
  kit.box(m.paint, [0.06, 0.62, d / 2 + 0.1], [x0 + w - 0.03, 0.88, -d / 4 + 0.05]);
  kit.box(m.paintAccent, [w, 0.06, d], [cx, 1.5, 0]);
  kit.box(m.glass, [w - 0.12, 0.6, 0.012], [cx, 0.89, front + 0.006]);
  kit.box(m.interior, [w - 0.12, 0.02, d / 2], [cx, 0.88, -d / 4 + 0.05]);
  kit.box(m.steel, [w - 0.14, 0.05, 0.06], [cx, 1.36, -0.02]);
  kit.box(m.steel, [w - 0.14, 0.05, 0.06], [cx, 1.36, front + 0.12]);
  kit.box(m.ledStrip, [w - 0.18, 0.012, 0.025], [cx, 1.475, front + 0.07]);

  // Carro de alimentadores: los carretes de componentes asoman sobre su bandeja.
  kit.box(m.feeder, [w - 0.08, 0.38, 0.32], [cx, 0.52, front - 0.16]);
  kit.box(m.charcoal, [w - 0.06, 0.02, 0.34], [cx, 0.9, front - 0.16]);
  const random = createRandom(seed);
  const reels = [m.reelDark, m.reelDark, m.reelDark, m.reelBlue, m.reelLight];
  for (let x = x0 + 0.07; x < x0 + w - 0.07; x += 0.02) {
    const radius = 0.055 + random() * 0.012;
    const material = reels[Math.floor(random() * reels.length)] ?? m.reelDark;
    kit.cylinder(material, radius, 0.009, [x, 0.9 + radius * 0.35, front - 0.16], {
      segments: 24,
      rotation: [0, 0, Math.PI / 2],
    });
  }
  monitor(kit, m, x0 + 0.12, front, front - 0.42, seed);
  return {
    tower: tower(kit, m, [x0 + w - 0.1, 1.56, front + 0.1]),
    head: { x0: x0 + 0.16, x1: x0 + w - 0.16, z0: front + 0.14, z1: -0.04 },
  };
}

function inspection(kit: Kit, m: Materials, x0: number): Vec3 {
  const { width: w, depth: d } = AOI;
  const cx = x0 + w / 2;
  const front = FRONT(d);
  kit.box(m.charcoal, [w - 0.06, 0.08, d - 0.06], [cx, 0, 0]);
  kit.box(m.paint, [w, 0.8, d], [cx, 0.08, 0]);
  kit.box(m.paint, [w, 0.56, d], [cx, 0.88, 0]);
  kit.box(m.paintAccent, [w, 0.05, d], [cx, 1.44, 0]);
  kit.box(m.charcoal, [w - 0.04, 0.012, 0.006], [cx, 0.52, front - 0.002]);
  kit.box(m.interior, [w - 0.18, 0.36, 0.01], [cx, 0.98, front - 0.004]);
  kit.box(m.ledStrip, [w - 0.3, 0.01, 0.012], [cx, 1.3, front - 0.01]);
  kit.box(m.glass, [w - 0.14, 0.4, 0.01], [cx, 0.96, front - 0.012]);
  monitor(kit, m, x0 + w / 2, front, front - 0.14, 2);
  return tower(kit, m, [x0 + w - 0.1, 1.49, front + 0.1]);
}

function reflowOven(kit: Kit, m: Materials, x0: number): Vec3 {
  const { width: w, depth: d } = OVEN;
  const cx = x0 + w / 2;
  const front = FRONT(d);
  for (const x of [x0 + 0.1, x0 + w - 0.1]) {
    for (const z of [front + 0.1, -front - 0.1]) kit.box(m.charcoal, [0.07, 0.1, 0.07], [x, 0, z]);
  }
  kit.box(m.paint, [w, 0.9, d], [cx, 0.1, 0]);
  const hood = new RoundedBoxGeometry(w - 0.04, 0.34, d - 0.04, 3, 0.05);
  hood.translate(0, 0.17, 0);
  kit.add(m.paint, hood, compose([cx, 1.0, 0]));
  kit.box(m.charcoal, [w + 0.004, 0.014, d + 0.004], [cx, 0.995, 0]);
  // Rejillas de ventilación por zona de calentamiento.
  for (let zone = 0; zone < 5; zone++) {
    for (let slat = 0; slat < 6; slat++) {
      kit.box(m.charcoal, [0.42, 0.012, 0.006], [x0 + 0.42 + zone * 0.6, 0.36 + slat * 0.045, front - 0.003]);
    }
  }
  // Mirilla con el brillo del horno: la única luz cálida de la línea.
  kit.box(m.charcoal, [w - 0.7, 0.07, 0.006], [cx - 0.1, 0.83, front - 0.002]);
  kit.box(m.ovenGlow, [w - 0.78, 0.034, 0.006], [cx - 0.1, 0.848, front - 0.006]);
  kit.box(m.charcoal, [0.32, 0.42, 0.12], [x0 + w - 0.2, 0.62, front - 0.06]);
  const screen = m.screens[1];
  if (screen)
    kit.add(
      screen,
      new PlaneGeometry(0.24, 0.16),
      compose([x0 + w - 0.2, 0.9, front - 0.121], [0, Math.PI, 0]),
    );
  // Chimeneas de extracción hacia el ducto general.
  for (const x of [x0 + 0.8, x0 + 2.6]) {
    kit.cylinder(m.galvanized, 0.055, 5.3 - 1.3, [x, 1.3, 0.25], { segments: 18 });
    kit.cylinder(m.galvanized, 0.075, 0.08, [x, 1.3, 0.25], { segments: 18 });
  }
  return tower(kit, m, [x0 + w - 0.12, 1.34, front + 0.12]);
}

function conveyor(kit: Kit, m: Materials): Vec3[] {
  for (const side of [-1, 1]) {
    kit.box(m.steel, [PERIOD, 0.045, 0.025], [PERIOD / 2, BELT_Y - 0.045, side * 0.125]);
    kit.box(m.rubber, [PERIOD, 0.008, 0.02], [PERIOD / 2, BELT_Y - 0.004, side * 0.12]);
    kit.box(m.charcoal, [PERIOD, 0.09, 0.02], [PERIOD / 2, BELT_Y - 0.15, side * 0.15]);
  }
  const sensors: Vec3[] = [];
  for (const x of GAPS) {
    for (const side of [-1, 1]) {
      kit.box(m.charcoal, [0.04, BELT_Y - 0.15, 0.04], [x, 0, side * 0.15]);
      kit.box(m.charcoal, [0.08, 0.012, 0.08], [x, 0, side * 0.15]);
    }
    kit.box(m.charcoal, [0.03, 0.03, 0.34], [x, 0.18, 0]);
    // Sensor de presencia con su led: es lo que SIP lee.
    kit.box(m.structure, [0.012, 0.05, 0.012], [x, BELT_Y - 0.02, -0.17]);
    kit.box(m.charcoal, [0.03, 0.035, 0.028], [x, BELT_Y + 0.03, -0.17]);
    kit.box(m.ledStrip, [0.008, 0.008, 0.004], [x, BELT_Y + 0.052, -0.186]);
    sensors.push([x, BELT_Y + 0.05, -0.17]);
  }
  return sensors;
}

/** `drops`: bajadas de cable a cada máquina, como [x, altura del techo de la máquina]. */
function cableTray(kit: Kit, m: Materials, drops: ReadonlyArray<readonly [number, number]>): void {
  for (const side of [-1, 1]) kit.box(m.galvanized, [PERIOD, 0.07, 0.008], [PERIOD / 2, TRAY_Y, side * 0.16]);
  for (let x = 0.15; x < PERIOD; x += 0.3) kit.box(m.galvanized, [0.02, 0.008, 0.32], [x, TRAY_Y, 0]);
  kit.box(m.rubber, [PERIOD, 0.035, 0.26], [PERIOD / 2, TRAY_Y + 0.008, 0]);
  for (let x = 2.4; x < PERIOD; x += 4.8) {
    for (const side of [-1, 1])
      kit.rod(m.structure, 0.006, [x, TRAY_Y + 0.07, side * 0.16], [x, TRUSS_Y, side * 0.16], 5);
  }
  for (const [x, top] of drops) kit.rod(m.galvanized, 0.018, [x, TRAY_Y, 0.08], [x, top, 0.08], 8);
  // Ducto de extracción del horno, colgado de la estructura.
  kit.rod(m.galvanized, 0.17, [0, 5.47, 0.25], [PERIOD, 5.47, 0.25], 24);
  for (let x = 2.4; x < PERIOD; x += 4.8) kit.rod(m.structure, 0.006, [x, 5.64, 0.25], [x, TRUSS_Y, 0.25], 5);
}

export function buildLineModule(m: Materials): LineModule {
  const kit = new Kit();
  const sensors = conveyor(kit, m);
  const a = pickAndPlace(kit, m, STATIONS.pnpA, 101);
  const b = pickAndPlace(kit, m, STATIONS.pnpB, 202);
  const aoi = inspection(kit, m, STATIONS.aoi);
  const oven = reflowOven(kit, m, STATIONS.oven);
  const drops = [
    [STATIONS.pnpA + PNP.width / 2, 1.56],
    [STATIONS.pnpB + PNP.width / 2, 1.56],
    [STATIONS.aoi + AOI.width / 2, 1.49],
    [STATIONS.oven + OVEN.width / 2, 1.34],
  ] as const;
  cableTray(kit, m, drops);
  const envelopes = [
    ...[STATIONS.pnpA, STATIONS.pnpB].flatMap((x) => [
      { size: [PNP.width, 1.56, PNP.depth] as const, base: [x + PNP.width / 2, 0, 0] as const },
      {
        size: [PNP.width - 0.08, 0.78, 0.32] as const,
        base: [x + PNP.width / 2, 0.14, -PNP.depth / 2 - 0.16] as const,
      },
    ]),
    { size: [AOI.width, 1.49, AOI.depth] as const, base: [STATIONS.aoi + AOI.width / 2, 0, 0] as const },
    {
      size: [OVEN.width, 1.24, OVEN.depth] as const,
      base: [STATIONS.oven + OVEN.width / 2, 0.1, 0] as const,
    },
  ];
  return { kit, towers: [a.tower, b.tower, aoi, oven], heads: [a.head, b.head], sensors, drops, envelopes };
}

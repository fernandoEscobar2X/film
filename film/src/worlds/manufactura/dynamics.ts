import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  InstancedMesh,
  type Material,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import { brand } from "../../core/palette";
import { hash01, smoothstep } from "../../core/rng";
import { BELT_Y, BOARD_PITCH, PERIOD, TOWER_SEGMENT } from "./layout";
import type { LineModule } from "./line";
import type { Materials } from "./materials";
import { boardX, type TowerState, towerState } from "./script";

/**
 * Todo lo que se mueve en la línea: tarjetas en la banda, cabezales de los pick-and-place y
 * torretas. Cada módulo vive con su propio desfase de tiempo `τ = t − k·D`, de modo que el
 * módulo k+1 en t+D se ve igual que el módulo k en t: la cámara avanza un módulo por loop y
 * el loop cierra sin costura.
 */

export interface LinePlacement {
  readonly matrix: Matrix4;
  /** Índice del módulo (k) y de la línea, para el desfase de tiempo. */
  readonly module: number;
  readonly line: 0 | 1 | 2;
}

const SEGMENT_BY_STATE: Record<TowerState, number> = { operando: 1, alerta: 2, paro: 3 };

const scratch = {
  matrix: new Matrix4(),
  local: new Matrix4(),
  position: new Vector3(),
  quaternion: new Quaternion(),
  scale: new Vector3(1, 1, 1),
  color: new Color(),
};

function instanced(
  geometry: BoxGeometry | CylinderGeometry,
  material: Material,
  count: number,
  shadow = true,
) {
  const mesh = new InstancedMesh(geometry, material, count);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

/** Trayectoria de un cabezal: va al alimentador, recoge, vuelve a la tarjeta y coloca. */
function headPath(tau: number, seed: number): { u: number; v: number; dip: number } {
  const cycle = 0.75;
  const index = Math.floor(tau / cycle);
  const phase = tau / cycle - index;
  const place = (i: number) => ({
    u: 0.25 + 0.5 * hash01(i * 7 + seed),
    v: 0.62 + 0.3 * hash01(i * 13 + seed),
  });
  const from = place(index - 1);
  const feeder = { u: hash01(index * 3 + seed), v: 0.02 };
  const to = place(index);
  const go = smoothstep(0, 0.34, phase);
  const back = smoothstep(0.46, 0.8, phase);
  const u = from.u + (feeder.u - from.u) * go + (to.u - feeder.u) * back;
  const v = from.v + (feeder.v - from.v) * go + (to.v - feeder.v) * back;
  const dip = Math.exp(-(((phase - 0.4) / 0.04) ** 2)) + Math.exp(-(((phase - 0.9) / 0.04) ** 2));
  return { u, v, dip };
}

export function createDynamics(
  m: Materials,
  module: LineModule,
  placements: readonly LinePlacement[],
  duration: number,
) {
  const boardsPerModule = Math.round(PERIOD / BOARD_PITCH);
  const boards = instanced(new BoxGeometry(0.26, 0.006, 0.22), m.pcb, placements.length * boardsPerModule);
  const chips = instanced(
    new BoxGeometry(0.05, 0.008, 0.05),
    m.chip,
    placements.length * boardsPerModule * 3,
  );
  const gantryMaterial = new MeshStandardMaterial({
    name: "portal",
    color: new Color("#b9c3ce"),
    metalness: 0.8,
    roughness: 0.35,
    emissive: brand("hielo"),
    emissiveIntensity: 0.35,
  });
  const headCount = placements.length * module.heads.length;
  const gantries = instanced(new BoxGeometry(0.07, 0.05, 1), gantryMaterial, headCount);
  const heads = instanced(new BoxGeometry(0.08, 0.2, 0.08), gantryMaterial, headCount);
  const towerCount = placements.length * module.towers.length;
  const litSegments = instanced(
    new CylinderGeometry(
      TOWER_SEGMENT.radius + 0.0006,
      TOWER_SEGMENT.radius + 0.0006,
      TOWER_SEGMENT.height - 0.004,
      20,
    ),
    m.signalLit,
    towerCount,
    false,
  );
  const stateColors: Record<TowerState, Color> = {
    operando: brand("estado-operando").multiplyScalar(9),
    alerta: brand("estado-alerta").multiplyScalar(11),
    paro: brand("estado-paro").multiplyScalar(11),
  };

  const place = (
    mesh: InstancedMesh,
    index: number,
    parent: Matrix4,
    x: number,
    y: number,
    z: number,
    sz = 1,
  ) => {
    scratch.local.compose(
      scratch.position.set(x, y, z),
      scratch.quaternion.identity(),
      scratch.scale.set(1, 1, sz),
    );
    mesh.setMatrixAt(index, scratch.matrix.multiplyMatrices(parent, scratch.local));
  };

  function update(t: number): void {
    placements.forEach((placement, p) => {
      const tau = t - placement.module * duration;
      const seed = placement.line * 1000 + 17;

      for (let j = 0; j < boardsPerModule; j++) {
        const x = boardX(j, t);
        const index = p * boardsPerModule + j;
        place(boards, index, placement.matrix, x, BELT_Y + 0.003, 0);
        for (let c = 0; c < 3; c++) {
          place(chips, index * 3 + c, placement.matrix, x - 0.07 + c * 0.07, BELT_Y + 0.01, (c - 1) * 0.04);
        }
      }

      module.heads.forEach((zone, h) => {
        const path = headPath(tau + h * 0.31, seed + h * 97);
        const x = zone.x0 + (zone.x1 - zone.x0) * path.u;
        const z = zone.z0 + (zone.z1 - zone.z0) * path.v;
        const index = p * module.heads.length + h;
        place(gantries, index, placement.matrix, x, 1.33, (zone.z0 + zone.z1) / 2, zone.z1 - zone.z0 + 0.1);
        place(heads, index, placement.matrix, x, 1.12 - 0.035 * path.dip, z);
      });

      module.towers.forEach(([x, y, z], tower) => {
        const state = towerState(placement.line, placement.module, tower, t, duration);
        const segmentY = y + TOWER_SEGMENT.base + SEGMENT_BY_STATE[state] * TOWER_SEGMENT.height + 0.002;
        const index = p * module.towers.length + tower;
        place(litSegments, index, placement.matrix, x, segmentY + (TOWER_SEGMENT.height - 0.004) / 2, z);
        litSegments.setColorAt(index, stateColors[state]);
      });
    });
    for (const mesh of [boards, chips, gantries, heads, litSegments]) mesh.instanceMatrix.needsUpdate = true;
    if (litSegments.instanceColor) litSegments.instanceColor.needsUpdate = true;
  }

  return { meshes: [boards, chips, gantries, heads, litSegments], update };
}

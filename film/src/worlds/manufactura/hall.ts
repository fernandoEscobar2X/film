import { createRandom } from "../../core/rng";
import { Kit } from "../kit";
import {
  FIXTURE_OFFSET,
  FIXTURE_PITCH,
  FIXTURE_ROWS,
  FIXTURE_Y,
  PERIOD,
  ROOF_Y,
  TRUSS_Y,
  WALL_Z,
} from "./layout";
import type { Materials } from "./materials";

/** La nave: un módulo de PERIOD metros en coordenadas del mundo (x de 0 a PERIOD). */

const COLUMN_X = 7.2;
const COLUMN_Z = [5.05, -7.4] as const;

function columns(kit: Kit, m: Materials): void {
  for (const z of COLUMN_Z) {
    kit.box(m.column, [0.32, TRUSS_Y + 0.2, 0.32], [COLUMN_X, 0, z]);
    kit.box(m.concrete, [0.6, 0.12, 0.6], [COLUMN_X, 0, z]);
  }
}

function trusses(kit: Kit, m: Materials): void {
  for (const x of [COLUMN_X - PERIOD / 2, COLUMN_X]) {
    kit.box(m.structure, [0.12, 0.14, WALL_Z * 2], [x, TRUSS_Y, 0]);
    kit.box(m.structure, [0.12, 0.14, WALL_Z * 2], [x, ROOF_Y - 0.3, 0]);
    let previous: number | undefined;
    for (let z = -WALL_Z; z <= WALL_Z + 0.01; z += 1.75) {
      kit.box(m.structure, [0.07, ROOF_Y - 0.3 - TRUSS_Y, 0.07], [x, TRUSS_Y + 0.14, z]);
      if (previous !== undefined) {
        kit.rod(m.structure, 0.03, [x, TRUSS_Y + 0.14, previous], [x, ROOF_Y - 0.3, z], 6);
      }
      previous = z;
    }
  }
  for (let z = -9; z <= 9; z += 3) kit.box(m.structure, [PERIOD, 0.1, 0.07], [PERIOD / 2, ROOF_Y - 0.16, z]);
}

/** Luminarias visibles; su luz la calcula `withFixtureLights` con la misma retícula. */
function fixtures(kit: Kit, m: Materials): void {
  for (const z of FIXTURE_ROWS) {
    for (let x = FIXTURE_OFFSET; x < PERIOD; x += FIXTURE_PITCH) {
      kit.cylinder(m.structure, 0.24, 0.16, [x, FIXTURE_Y, z], { radiusTop: 0.12, segments: 28 });
      kit.cylinder(m.fixture, 0.215, 0.01, [x, FIXTURE_Y - 0.009, z], { segments: 28 });
      kit.rod(m.structure, 0.006, [x, FIXTURE_Y + 0.16, z], [x, TRUSS_Y, z], 5);
    }
  }
}

/** Banco de trabajo contra el muro; `facing` apunta hacia el pasillo. */
function bench(kit: Kit, m: Materials, x: number, z: number, facing: 1 | -1, seed: number): void {
  const random = createRandom(seed);
  const back = -facing;
  kit.box(m.benchTop, [2.0, 0.04, 0.75], [x, 0.86, z]);
  kit.box(m.esdMat, [1.9, 0.004, 0.64], [x, 0.9, z + facing * 0.02]);
  for (const dx of [-0.95, 0.95]) {
    for (const dz of [-0.32, 0.32]) kit.box(m.structure, [0.04, 0.86, 0.04], [x + dx, 0, z + dz]);
    kit.box(m.structure, [0.03, 0.7, 0.03], [x + dx, 0.9, z + back * 0.3]);
  }
  kit.box(m.structure, [2.0, 0.03, 0.3], [x, 1.58, z + back * 0.22]);
  kit.box(m.taskLight, [1.7, 0.016, 0.04], [x, 1.56, z + back * 0.12]);
  for (let i = 0; i < 4; i++) {
    if (random() < 0.2) continue;
    kit.box(m.tote, [0.36, 0.14, 0.26], [x - 0.72 + i * 0.48, 1.61, z + back * 0.22]);
  }
  if (random() < 0.6) kit.box(m.tote, [0.5, 0.18, 0.34], [x - 0.3 + random() * 0.6, 0.9, z + back * 0.12]);
}

function wall(kit: Kit, m: Materials, z: number): void {
  const inward = -Math.sign(z);
  for (let x = 0; x < PERIOD; x += PERIOD / 2) {
    kit.box(m.concrete, [PERIOD / 2 - 0.03, 7.0, 0.25], [x + PERIOD / 4, 0, z]);
  }
  kit.box(m.windowNight, [PERIOD, 1.5, 0.04], [PERIOD / 2, 7.15, z - inward * 0.05]);
  for (let x = 0; x < PERIOD; x += 1.2) kit.box(m.structure, [0.06, 1.6, 0.1], [x, 7.1, z + inward * 0.02]);
  kit.box(m.concrete, [PERIOD, 0.9, 0.25], [PERIOD / 2, 8.65, z]);
}

export function buildHallModule(m: Materials): Kit {
  const kit = new Kit();
  columns(kit, m);
  trusses(kit, m);
  fixtures(kit, m);
  for (const [index, x] of [1.6, 4.8, 8.0].entries()) bench(kit, m, x, -9.4, 1, 300 + index);
  wall(kit, m, WALL_Z);
  wall(kit, m, -WALL_Z);
  return kit;
}

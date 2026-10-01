import {
  BoxGeometry,
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  type Matrix4,
  Mesh,
  MeshStandardMaterial,
  type PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  type WebGLRenderer,
} from "three";
import { interiorEnvironment } from "../../core/environment";
import { withFixtureLights } from "../../core/fixture-lights";
import { brand } from "../../core/palette";
import { PlanarReflection, withPlanarReflection } from "../../core/planar-reflection";
import { TAU } from "../../core/rng";
import type { Subsample } from "../../core/sampling";
import { compose, instance } from "../kit";
import type { Anchor, CameraPose, FilmWorld, Grade, Layer, WorldOptions } from "../types";
import { createDataLayer } from "./data-layer";
import { createDynamics, type LinePlacement } from "./dynamics";
import { buildHallModule } from "./hall";
import {
  BOARD_PITCH,
  BOARD_SPEED,
  FIXTURE_GAINS,
  FIXTURE_OFFSET,
  FIXTURE_PITCH,
  FIXTURE_ROWS,
  FIXTURE_Y,
  LANES,
  LINE_A_Z,
  LINE_B_Z,
  LINE_C_Z,
  MODULES,
  PERIOD,
  ROOF_Y,
  TOWER_SEGMENT,
  WALL_Z,
} from "./layout";
import { buildLineModule } from "./line";
import { createMaterials } from "./materials";
import { ALERT } from "./script";

/** Nombres estables para las anclas: línea (a principal, b al otro lado del pasillo, c atrás). */
const LINE_IDS = ["a", "b", "c"] as const;
const MACHINE_IDS = ["pnp-1", "pnp-2", "aoi", "horno"] as const;

/**
 * Manufactura: línea SMT de una maquiladora de electrónica en Tijuana, turno de noche.
 * La cámara recorre el pasillo en paralelo a la línea a paso constante: la operación sigue
 * más allá del cuadro, en tiempo real.
 */

const FLOOR_TILE = PERIOD / 2;

function assertLoop(duration: number): void {
  const pitches = (BOARD_SPEED * duration) / BOARD_PITCH;
  if (Math.abs(pitches - Math.round(pitches)) > 1e-9) {
    throw new Error(`Las tarjetas no cierran el loop: avanzan ${pitches} pasos en ${duration} s`);
  }
}

/** Dirección muestreada en un casquete esférico alrededor de `axis` (luz de área cenital). */
function capDirection(axis: Vector3, halfAngle: number, u: number, v: number, out: Vector3): Vector3 {
  const cosTheta = 1 - u * (1 - Math.cos(halfAngle));
  const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
  const phi = TAU * v;
  const tangent = new Vector3(1, 0, 0).cross(axis).normalize();
  const bitangent = axis.clone().cross(tangent);
  return out
    .copy(axis)
    .multiplyScalar(cosTheta)
    .addScaledVector(tangent, Math.cos(phi) * sinTheta)
    .addScaledVector(bitangent, Math.sin(phi) * sinTheta)
    .normalize();
}

export function createManufactura(gl: WebGLRenderer, options: WorldOptions): FilmWorld {
  const { duration, framing, width, height } = options;
  assertLoop(duration);
  const speed = PERIOD / duration;
  const m = createMaterials();
  const scene = new Scene();

  const haze = brand("noche").lerp(new Color("#1b222c"), 0.55);
  scene.fog = new FogExp2(haze, 0.016);
  scene.background = haze;
  scene.environment = interiorEnvironment(gl, {
    shell: new Color("#0b1119"),
    fixtures: new Color("#eef4ff").multiplyScalar(14),
    windows: brand("pacifico-600").multiplyScalar(0.4),
  });
  scene.environmentIntensity = 0.55;

  // Módulos: línea principal, segunda línea girada 180° y desfasada medio periodo, y la nave.
  const line = buildLineModule(m);
  const placements: LinePlacement[] = [];
  const hallTransforms: Matrix4[] = [];
  for (let k = MODULES.first; k <= MODULES.last; k++) {
    placements.push({ matrix: compose([k * PERIOD, 0, LINE_A_Z]), module: k, line: 0 });
    placements.push({
      matrix: compose([k * PERIOD + 1.5 * PERIOD, 0, LINE_B_Z], [0, Math.PI, 0]),
      module: k,
      line: 1,
    });
    placements.push({ matrix: compose([k * PERIOD + 0.35 * PERIOD, 0, LINE_C_Z]), module: k, line: 2 });
    hallTransforms.push(compose([k * PERIOD, 0, 0]));
  }
  const lineParts = line.kit.build();
  scene.add(
    instance(
      lineParts,
      placements.map((p) => p.matrix),
    ),
  );
  scene.add(instance(buildHallModule(m).build(), hallTransforms));
  const dynamics = createDynamics(m, line, placements, duration);
  scene.add(...dynamics.meshes);

  // Piso epóxico continuo con carriles de seguridad; la textura se repite cada FLOOR_TILE.
  const start = MODULES.first * PERIOD;
  const length = (MODULES.last - MODULES.first + 1) * PERIOD;
  for (const map of [m.floor.map, m.floor.roughnessMap])
    map?.repeat.set(length / FLOOR_TILE, (2 * WALL_Z) / FLOOR_TILE);
  const floor = new Mesh(new PlaneGeometry(length, 2 * WALL_Z), m.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(start + length / 2, 0, 0);
  floor.receiveShadow = true;
  scene.add(floor);
  const stripes = LANES.map((z) => {
    const stripe = new Mesh(new BoxGeometry(length, 0.002, 0.1), m.lane);
    stripe.position.set(start + length / 2, 0.001, z);
    stripe.receiveShadow = true;
    scene.add(stripe);
    return stripe;
  });
  const roof = new Mesh(new PlaneGeometry(length, 2 * WALL_Z), m.deck);
  roof.rotation.x = Math.PI / 2;
  roof.position.set(start + length / 2, ROOF_Y, 0);
  scene.add(roof);

  // Luz: las luminarias de la nave como una sola luz de área cenital muestreada por subcuadro
  // (sombras suaves y oclusión de contacto reales), más un relleno frío muy bajo.
  const overhead = new DirectionalLight(new Color("#e9f0fa"), 0.9);
  overhead.castShadow = true;
  overhead.shadow.mapSize.set(4096, 4096);
  overhead.shadow.bias = -0.0003;
  overhead.shadow.normalBias = 0.025;
  Object.assign(overhead.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 });
  overhead.shadow.camera.updateProjectionMatrix();
  scene.add(overhead, overhead.target);
  scene.add(new HemisphereLight(new Color("#9fb6d1"), brand("noche"), 0.12));

  const grid = {
    rows: FIXTURE_ROWS,
    gains: FIXTURE_GAINS,
    pitch: FIXTURE_PITCH,
    offset: FIXTURE_OFFSET,
    height: FIXTURE_Y - 0.02,
    color: new Color("#fff4e8").multiplyScalar(40),
    reach: 4,
  };
  // A media resolución: el reflejo se desenfoca por la rugosidad del epóxico (decenas de píxeles),
  // así que se ve igual y cuesta la cuarta parte.
  const reflection = new PlanarReflection(Math.ceil(width / 2), Math.ceil(height / 2));
  const patched = new Set<MeshStandardMaterial>();
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const material = object.material;
    if (material instanceof MeshStandardMaterial && !patched.has(material)) {
      withFixtureLights(material, material === m.floor ? { ...grid, specular: 0 } : grid);
      patched.add(material);
    }
  });
  // El epóxico refleja la nave; su reflejo de entorno genérico se apaga para no duplicar.
  withPlanarReflection(m.floor, reflection, 0.75);
  m.floor.envMapIntensity = 0.15;

  const overheadAxis = new Vector3(0.12, 1, 0.08).normalize();
  const direction = new Vector3();

  const grade: Grade = {
    response: "filmica",
    exposure: -0.2,
    whiteBalance: [0.97, 1, 1.04],
    bloom: 0.05,
    lift: "noche",
    liftAmount: 0.9,
    gamma: 1.02,
    saturation: 0.92,
    vignette: 0.4,
    grain: 0.016,
    // El titular va abajo a la izquierda en horizontal y en el 40 % inferior en vertical.
    titleWindow:
      framing === "h"
        ? { center: [0.13, 0.14], radius: [0.55, 0.48], exposure: -0.9 }
        : { center: [0.5, 0.04], radius: [1.1, 0.46], exposure: -0.9 },
  };

  const drift = (t: number) => Math.sin((TAU * t) / duration);

  function pose(t: number): CameraPose {
    const x = t * speed;
    if (framing === "h") {
      return {
        position: new Vector3(x - 1.0, 1.8 + 0.015 * drift(t), -0.6),
        target: new Vector3(x + 9, 0.72, 2.6),
        fov: 32,
        focusDistance: 7.4,
        aperture: 0.006,
      };
    }
    return {
      position: new Vector3(x - 0.8, 2.7 + 0.015 * drift(t), -1.0),
      target: new Vector3(x + 8, 0.2, 2.0),
      fov: 62,
      focusDistance: 8,
      aperture: 0.005,
    };
  }

  function update(t: number, sample: Subsample): void {
    dynamics.update(t);
    const focus = pose(t).position.x + 14;
    overhead.target.position.set(focus, 0, 0);
    capDirection(overheadAxis, (40 * Math.PI) / 180, sample.light[0], sample.light[1], direction);
    overhead.position.copy(overhead.target.position).addScaledVector(direction, 40);
    overhead.target.updateMatrixWorld();
  }

  const data = createDataLayer({ line, placements, floor: { start, length }, duration, width, height });

  function beforeRender(
    renderer: WebGLRenderer,
    camera: PerspectiveCamera,
    sample: Subsample,
    layer: Layer,
  ): void {
    if (layer === "fisica") reflection.render(renderer, scene, camera, [floor, ...stripes], sample.glossy);
    else data.beforeRender(renderer, camera, sample);
  }

  // Anclas sobre la torreta de cada máquina: ahí el sitio pone nombre, estado y lecturas. El
  // cuerpo es el centro del volumen de la máquina ([pnp, carro, pnp, carro, aoi, horno]).
  const bodies = [0, 2, 4, 5].map((index) => {
    const envelope = line.envelopes[index];
    if (!envelope) throw new Error(`Falta el volumen ${index} de la línea`);
    const [x, y, z] = envelope.base;
    return new Vector3(x, y + envelope.size[1] / 2, z);
  });
  const anchors: Anchor[] = placements.flatMap((placement) =>
    line.towers.map(([x, y, z], tower) => ({
      id: `${LINE_IDS[placement.line]}/m${placement.module}/${MACHINE_IDS[tower]}`,
      kind: "maquina" as const,
      position: new Vector3(x, y + TOWER_SEGMENT.base + 4 * TOWER_SEGMENT.height + 0.06, z).applyMatrix4(
        placement.matrix,
      ),
      body: (bodies[tower] ?? new Vector3()).clone().applyMatrix4(placement.matrix),
    })),
  );
  const alertId = `${LINE_IDS[ALERT.line]}/m1/${MACHINE_IDS[ALERT.tower]}`;

  return {
    layers: { fisica: { scene, grade }, datos: data },
    anchors,
    events: [{ anchor: alertId, state: "alerta", from: ALERT.from, to: ALERT.to }],
    update(t, sample) {
      update(t, sample);
      data.update(t);
    },
    pose,
    beforeRender,
  };
}

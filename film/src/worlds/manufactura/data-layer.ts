import {
  BoxGeometry,
  type BufferGeometry,
  type Camera,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  FogExp2,
  HemisphereLight,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  type Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type WebGLRenderer,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { edgeMaterial, glowing, volumeMaterial } from "../../core/data-style";
import { brand } from "../../core/palette";
import { PlanarReflection, withPlanarReflection } from "../../core/planar-reflection";
import { smoothstep, wrap } from "../../core/rng";
import type { Subsample } from "../../core/sampling";
import { compose, instance, Kit } from "../kit";
import type { Grade, LayerView } from "../types";
import type { LinePlacement } from "./dynamics";
import { BELT_Y, LANES, PERIOD, TOWER_SEGMENT, WALL_Z } from "./layout";
import type { LineModule } from "./line";
import { ALERT, alertLevel, boardX, towerState } from "./script";

/**
 * La misma planta vista por SIP. Las máquinas son volúmenes con su estado; el flujo físico y
 * el de información se dibujan con el trazo del logo (grosor constante, giros redondeados):
 * la banda lleva tarjetas y la charola de cable lleva lecturas hacia el sistema. Sin rejillas
 * ni texto: las etiquetas las pone el sitio encima, en el idioma del visitante.
 */

const TURN_RADIUS = 0.22;
/** El bus de datos corre justo sobre las máquinas (más bajo que la charola física). */
const BUS_Y = 2.05;
const TRAY_PACKET = { pitch: 0.8, speed: 2.4 } as const;
const DROP_PERIOD = 1.5;

const scratch = {
  matrix: new Matrix4(),
  local: new Matrix4(),
  position: new Vector3(),
  quaternion: new Quaternion(),
  scale: new Vector3(),
};

function edgesOf(boxes: ReadonlyArray<{ size: readonly number[]; base: readonly number[] }>): BufferGeometry {
  const parts = boxes.map(({ size, base }) => {
    const box = new BoxGeometry(size[0], size[1], size[2]);
    box.translate(base[0] ?? 0, (base[1] ?? 0) + (size[1] ?? 0) / 2, base[2] ?? 0);
    const edges = new EdgesGeometry(box);
    box.dispose();
    return edges;
  });
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error("No se pudieron fusionar las aristas");
  return merged;
}

export interface DataLayerInput {
  readonly line: LineModule;
  readonly placements: readonly LinePlacement[];
  readonly floor: { readonly start: number; readonly length: number };
  readonly duration: number;
  /** Resolución de salida, para el reflejo del piso. */
  readonly width: number;
  readonly height: number;
}

export interface DataLayer extends LayerView {
  update(t: number): void;
  /** Reflejo del piso, con la cámara ya colocada. */
  beforeRender(gl: WebGLRenderer, camera: Camera, sample: Subsample): void;
}

export function createDataLayer({
  line,
  placements,
  floor,
  duration,
  width,
  height,
}: DataLayerInput): DataLayer {
  const scene = new Scene();
  const night = brand("noche");
  scene.background = night;
  scene.fog = new FogExp2(night, 0.03);
  scene.add(new HemisphereLight(brand("hielo"), night, 1.1));
  const key = new DirectionalLight(brand("hielo"), 0.7);
  key.position.set(-4, 10, -6);
  scene.add(key);

  const senal = brand("senal");
  // Volúmenes translúcidos: dejan ver la banda y las tarjetas que corren por dentro de la línea.
  const fill = volumeMaterial({
    lit: brand("pacifico-600"),
    mid: brand("marino"),
    shade: night.clone().lerp(brand("marino"), 0.45),
    opacity: 0.5,
  });
  const edge = edgeMaterial(brand("hielo"), night, 0.55);
  const stroke = glowing(senal, 1.6);
  const trayStroke = glowing(senal, 1.1);
  const packet = glowing(brand("hielo"), 3.2);
  const amber = brand("estado-alerta");

  // Máquinas: bloques y aristas, uno por módulo.
  const blocks = new Kit();
  for (const { size, base } of line.envelopes) blocks.box(fill, size, base);
  scene.add(
    instance(
      blocks.build(),
      placements.map((p) => p.matrix),
    ),
  );
  const machineEdges = edgesOf(line.envelopes);
  for (const placement of placements) {
    const lines = new LineSegments(machineEdges, edge);
    lines.applyMatrix4(placement.matrix);
    lines.frustumCulled = false;
    scene.add(lines);
  }

  // Flujo: la banda (tarjetas) y la charola con las bajadas de cada máquina (lecturas).
  const flow = new Kit();
  flow.box(stroke, [PERIOD, 0.035, 0.035], [PERIOD / 2, BELT_Y, 0]);
  flow.box(trayStroke, [PERIOD, 0.026, 0.026], [PERIOD / 2, BUS_Y - 0.013, 0]);
  for (const [x, top] of line.drops) {
    flow.box(trayStroke, [0.026, BUS_Y - TURN_RADIUS - top, 0.026], [x, top, 0]);
    const turn = new TorusGeometry(TURN_RADIUS, 0.013, 8, 16, Math.PI / 2);
    flow.add(trayStroke, turn, compose([x + TURN_RADIUS, BUS_Y - TURN_RADIUS, 0], [0, 0, Math.PI / 2]));
  }
  for (const [x, y, z] of line.sensors) {
    flow.add(packet, new TorusGeometry(0.035, 0.005, 6, 20), compose([x, y + 0.02, z - 0.02]));
  }
  scene.add(
    instance(
      flow.build(),
      placements.map((p) => p.matrix),
    ),
  );

  // Piso: plano oscuro y pulido que refleja los flujos, con los carriles apenas insinuados.
  const groundMaterial = new MeshStandardMaterial({
    name: "piso-datos",
    color: night.clone().lerp(brand("marino"), 0.35),
    roughness: 0.32,
  });
  const reflection = new PlanarReflection(Math.ceil(width / 2), Math.ceil(height / 2));
  withPlanarReflection(groundMaterial, reflection, 0.55);
  const ground = new Mesh(new PlaneGeometry(floor.length, 2 * WALL_Z), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(floor.start + floor.length / 2, 0, 0);
  scene.add(ground);
  const laneMaterial = new MeshBasicMaterial({ color: brand("acero") });
  const lanes = LANES.map((z) => {
    const lane = new Mesh(new PlaneGeometry(floor.length, 0.03), laneMaterial);
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(floor.start + floor.length / 2, 0.002, z);
    scene.add(lane);
    return lane;
  });

  // Elementos vivos.
  const boardsPerModule = Math.round(PERIOD / 1.2);
  const trayPackets = Math.round(PERIOD / TRAY_PACKET.pitch);
  const make = (geometry: BufferGeometry, material: Material, count: number) => {
    const mesh = new InstancedMesh(geometry, material, count);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  };
  const boards = make(new BoxGeometry(0.2, 0.03, 0.14), packet, placements.length * boardsPerModule);
  const onTray = make(new BoxGeometry(0.2, 0.034, 0.034), packet, placements.length * trayPackets);
  const rising = make(new BoxGeometry(0.034, 0.16, 0.034), packet, placements.length * line.drops.length);
  // Estado de cada máquina: una luz redonda donde está su torreta.
  const towers = make(
    new SphereGeometry(TOWER_SEGMENT.radius * 1.9, 24, 16),
    new MeshBasicMaterial({ color: 0xffffff }),
    placements.length * line.towers.length,
  );
  const stateColor = {
    operando: brand("estado-operando").multiplyScalar(4),
    alerta: brand("estado-alerta").multiplyScalar(6),
    paro: brand("estado-paro").multiplyScalar(6),
  } as const;

  // Alerta: la máquina se enmarca en ámbar, su señal sube más rápido y el piso emite pulsos.
  const alertEdge = new LineBasicMaterial({ color: amber.clone().multiplyScalar(3), transparent: true });
  // Volúmenes: [pnpA, carro A, pnpB, carro B, AOI, horno]; la alerta es la del pnpB.
  const alertEnvelope = line.envelopes[2];
  if (!alertEnvelope) throw new Error("Falta el volumen del pick-and-place en alerta");
  const { size: alertSize, base: alertBase } = alertEnvelope;
  const alertFrame = new LineSegments(
    edgesOf([{ size: alertSize.map((v) => v + 0.06), base: alertBase }]),
    alertEdge,
  );
  alertFrame.frustumCulled = false;
  scene.add(alertFrame);
  const alertFill = new Mesh(
    new BoxGeometry(...alertSize).translate(0, alertSize[1] / 2, 0),
    new MeshBasicMaterial({ color: amber, transparent: true, depthWrite: false }),
  );
  scene.add(alertFill);
  const pulses = [0, 1, 2].map(() => {
    const ring = new Mesh(
      new RingGeometry(0.96, 1, 96),
      new MeshBasicMaterial({
        color: amber.clone().multiplyScalar(2.5),
        transparent: true,
        side: DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);
    return ring;
  });
  const alertPackets = make(new BoxGeometry(0.22, 0.04, 0.04), glowing(amber, 4), 6);

  const place = (
    mesh: InstancedMesh,
    index: number,
    parent: Matrix4,
    x: number,
    y: number,
    z: number,
    s = 1,
  ) => {
    scratch.local.compose(
      scratch.position.set(x, y, z),
      scratch.quaternion.identity(),
      scratch.scale.set(s, s, s),
    );
    mesh.setMatrixAt(index, scratch.matrix.multiplyMatrices(parent, scratch.local));
  };

  function update(t: number): void {
    let alert: { matrix: Matrix4; level: number } | undefined;
    placements.forEach((placement, p) => {
      const tau = t - placement.module * duration;
      for (let j = 0; j < boardsPerModule; j++) {
        place(boards, p * boardsPerModule + j, placement.matrix, boardX(j, t), BELT_Y + 0.03, 0);
      }
      for (let j = 0; j < trayPackets; j++) {
        const x = wrap(j * TRAY_PACKET.pitch + TRAY_PACKET.speed * t, PERIOD);
        place(onTray, p * trayPackets + j, placement.matrix, x, BUS_Y - 0.013, 0);
      }
      line.drops.forEach(([x, top], d) => {
        const phase = wrap(tau / DROP_PERIOD + d * 0.27 + placement.line * 0.13, 1);
        const y = top + phase * (BUS_Y - TURN_RADIUS - top);
        const size = smoothstep(0, 0.12, phase) * (1 - smoothstep(0.85, 1, phase));
        place(rising, p * line.drops.length + d, placement.matrix, x, y, 0, size);
      });
      line.towers.forEach(([x, y, z], tower) => {
        const index = p * line.towers.length + tower;
        place(towers, index, placement.matrix, x, y + TOWER_SEGMENT.base + 0.12, z);
        towers.setColorAt(
          index,
          stateColor[towerState(placement.line, placement.module, tower, t, duration)],
        );
        const level = alertLevel(placement.line, placement.module, tower, t, duration);
        if (level > 0 && (!alert || level > alert.level)) alert = { matrix: placement.matrix, level };
      });
    });

    const level = alert?.level ?? 0;
    alertFrame.visible = alertFill.visible = level > 0;
    alertEdge.opacity = level;
    (alertFill.material as MeshBasicMaterial).opacity = 0.3 * level;
    const envelopeBase = new Vector3(...alertBase);
    if (alert) {
      alertFrame.matrix.copy(alert.matrix);
      alertFrame.matrixAutoUpdate = false;
      alertFill.matrix.multiplyMatrices(alert.matrix, compose(alertBase));
      alertFill.matrixAutoUpdate = false;
      envelopeBase.applyMatrix4(alert.matrix);
    }
    pulses.forEach((ring, index) => {
      const phase = wrap(t / 1.6 + index / pulses.length, 1);
      // Pulsos contenidos alrededor de la máquina: no invaden el pasillo donde va el titular.
      const radius = 0.9 + phase * 1.6;
      ring.visible = level > 0;
      ring.position.set(envelopeBase.x, 0.01, envelopeBase.z);
      ring.scale.setScalar(radius);
      (ring.material as MeshBasicMaterial).opacity = 0.85 * level * (1 - phase) ** 2;
    });
    // Tren de lecturas en ámbar: de la máquina a la charola y hacia el sistema.
    const [dropX, dropTop] = line.drops[ALERT.tower] ?? [0, 0];
    for (let i = 0; i < 6; i++) {
      const phase = wrap(t / 1.2 + i / 6, 1);
      const rise = BUS_Y - TURN_RADIUS - dropTop;
      const run = 7;
      const distance = phase * (rise + run);
      const local =
        distance < rise
          ? new Vector3(dropX, dropTop + distance, 0)
          : new Vector3(dropX + TURN_RADIUS + (distance - rise), BUS_Y - 0.013, 0);
      if (alert) local.applyMatrix4(alert.matrix);
      scratch.local.compose(
        local,
        scratch.quaternion.identity(),
        scratch.scale.setScalar(level * (1 - smoothstep(0.85, 1, phase))),
      );
      alertPackets.setMatrixAt(i, scratch.local);
    }

    for (const mesh of [boards, onTray, rising, towers, alertPackets]) mesh.instanceMatrix.needsUpdate = true;
    if (towers.instanceColor) towers.instanceColor.needsUpdate = true;
  }

  const grade: Grade = {
    response: "marca",
    exposure: 0,
    whiteBalance: [1, 1, 1],
    bloom: 0.07,
    lift: "noche",
    liftAmount: 0,
    gamma: 1,
    saturation: 1,
    vignette: 0.3,
    grain: 0.01,
  };

  function beforeRender(gl: WebGLRenderer, camera: Camera, sample: Subsample): void {
    reflection.render(gl, scene, camera, [ground, ...lanes], sample.glossy);
  }

  return { scene, grade, update, beforeRender };
}

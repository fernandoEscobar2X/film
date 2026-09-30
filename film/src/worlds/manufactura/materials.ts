import {
  Color,
  type DataTexture,
  DoubleSide,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Texture,
} from "three";
import { brand } from "../../core/palette";
import { canvasTexture, noiseTexture } from "../../core/textures";
import { noShadow } from "../kit";

/** Color emisivo en HDR: el bloom y AgX necesitan valores por encima de 1. */
export function glow(color: Color | string, intensity: number): Color {
  return new Color(color).multiplyScalar(intensity);
}

function scaled(texture: DataTexture, repeat: number): DataTexture {
  const copy = texture.clone();
  copy.repeat.set(repeat, repeat);
  copy.needsUpdate = true;
  return copy;
}

/** Pantalla de máquina: interfaz abstracta en azules de la marca, sin texto. */
function screenTexture(seed: number): Texture {
  return canvasTexture(256, 176, (context) => {
    context.fillStyle = `#${brand("noche").getHexString()}`;
    context.fillRect(0, 0, 256, 176);
    context.fillStyle = `#${brand("marino").getHexString()}`;
    context.fillRect(10, 10, 236, 24);
    context.fillRect(10, 44, 150, 122);
    context.fillRect(170, 44, 76, 56);
    context.fillRect(170, 110, 76, 56);
    context.strokeStyle = `#${brand("senal").getHexString()}`;
    context.lineWidth = 3;
    context.beginPath();
    for (let x = 0; x <= 130; x += 10) {
      const y = 130 - 40 * Math.abs(Math.sin((x + seed * 17) / 23)) - (x % 30 === 0 ? 8 : 0);
      if (x === 0) context.moveTo(20 + x, y);
      else context.lineTo(20 + x, y);
    }
    context.stroke();
    context.fillStyle = `#${brand("pacifico-400").getHexString()}`;
    for (let i = 0; i < 5; i++)
      context.fillRect(180 + i * 13, 90 - ((i * 7 + seed * 5) % 30), 8, 10 + ((i * 7 + seed * 5) % 30));
    context.fillStyle = `#${brand("estado-operando").getHexString()}`;
    context.fillRect(180, 124, 22, 22);
  });
}

export function createMaterials() {
  // Variación de rugosidad compartida: ninguna superficie real es uniforme.
  const roughNoise = noiseTexture({ seed: 11, min: 0.35, max: 0.7 });
  const floorRough = noiseTexture({ seed: 23, min: 0.1, max: 0.34, periods: [2, 4, 8, 16, 32, 64] });
  const floorTone = noiseTexture({ seed: 31, min: 0.9, max: 1, periods: [2, 4, 8, 16, 32] });

  const paint = new MeshStandardMaterial({
    name: "pintura",
    color: new Color("#dadee3"),
    roughness: 0.55,
    roughnessMap: scaled(roughNoise, 2),
  });
  const paintAccent = new MeshStandardMaterial({
    name: "pintura-acento",
    color: brand("pacifico-600"),
    roughness: 0.4,
    roughnessMap: scaled(roughNoise, 2),
  });
  const charcoal = new MeshStandardMaterial({ name: "carbón", color: new Color("#1f2731"), roughness: 0.6 });
  const feeder = new MeshStandardMaterial({
    name: "alimentador",
    color: new Color("#58626d"),
    roughness: 0.5,
  });
  // Interior de las máquinas: su propia iluminación led lo deja ver a través del vidrio.
  const interior = new MeshStandardMaterial({
    name: "interior",
    color: new Color("#10161e"),
    roughness: 0.8,
    emissive: new Color("#8fa8c4"),
    emissiveIntensity: 0.18,
  });
  const steel = new MeshStandardMaterial({
    name: "acero",
    color: new Color("#aeb8c3"),
    metalness: 1,
    roughness: 0.32,
    roughnessMap: scaled(roughNoise, 4),
  });
  const galvanized = new MeshStandardMaterial({
    name: "galvanizado",
    color: new Color("#8d97a2"),
    metalness: 0.9,
    roughness: 0.5,
    roughnessMap: scaled(roughNoise, 3),
  });
  const structure = new MeshStandardMaterial({
    name: "estructura",
    color: new Color("#27313d"),
    roughness: 0.55,
  });
  const column = new MeshStandardMaterial({ name: "columna", color: brand("acero"), roughness: 0.5 });
  const rubber = new MeshStandardMaterial({ name: "banda", color: new Color("#14181e"), roughness: 0.85 });
  const glass = noShadow(
    new MeshPhysicalMaterial({
      name: "vidrio",
      color: new Color("#1a2a3c"),
      roughness: 0.04,
      metalness: 0,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: DoubleSide,
      envMapIntensity: 1.6,
    }),
  );
  const pcb = new MeshStandardMaterial({ name: "tarjeta", color: new Color("#0c3263"), roughness: 0.3 });
  const chip = new MeshStandardMaterial({ name: "chip", color: new Color("#0b0d10"), roughness: 0.4 });
  const reelDark = new MeshStandardMaterial({
    name: "carrete",
    color: new Color("#16191e"),
    roughness: 0.45,
  });
  const reelBlue = new MeshStandardMaterial({
    name: "carrete-azul",
    color: brand("pacifico-500"),
    roughness: 0.4,
  });
  const reelLight = new MeshStandardMaterial({
    name: "carrete-claro",
    color: new Color("#c5ced8"),
    roughness: 0.4,
  });
  const floor = new MeshStandardMaterial({
    name: "epóxico",
    color: new Color("#3f464f"),
    roughness: 1,
    roughnessMap: floorRough,
    map: floorTone,
  });
  const lane = new MeshStandardMaterial({ name: "carril", color: new Color("#c9a441"), roughness: 0.6 });
  const concrete = new MeshStandardMaterial({
    name: "concreto",
    color: new Color("#353b43"),
    roughness: 0.92,
    map: scaled(floorTone, 1),
  });
  const deck = new MeshStandardMaterial({ name: "techo", color: new Color("#1a212a"), roughness: 0.9 });
  const tote = new MeshStandardMaterial({ name: "caja", color: brand("pacifico-500"), roughness: 0.55 });
  const cardboard = new MeshStandardMaterial({
    name: "cartón",
    color: new Color("#7d6d58"),
    roughness: 0.85,
  });
  const benchTop = new MeshStandardMaterial({ name: "mesa", color: new Color("#8995a3"), roughness: 0.5 });
  const esdMat = new MeshStandardMaterial({ name: "tapete", color: new Color("#1d3552"), roughness: 0.7 });
  const rackUpright = new MeshStandardMaterial({
    name: "rack",
    color: new Color("#2b5688"),
    roughness: 0.45,
  });

  // Emisores: sin sombra, con niebla (se apagan con la distancia como en una nave real).
  const fixture = noShadow(new MeshBasicMaterial({ name: "luminaria", color: glow("#eef4ff", 22) }));
  const ledStrip = noShadow(new MeshBasicMaterial({ name: "led", color: glow("#dfe9ff", 9) }));
  const taskLight = noShadow(new MeshBasicMaterial({ name: "lámpara", color: glow("#f4f0e6", 10) }));
  const ovenGlow = noShadow(new MeshBasicMaterial({ name: "horno", color: glow("#ff7a2e", 5) }));
  const windowNight = noShadow(
    new MeshBasicMaterial({ name: "ventana", color: glow(brand("pacifico-600"), 0.35) }),
  );
  const signalLit = noShadow(new MeshBasicMaterial({ name: "torreta-encendida", color: new Color(1, 1, 1) }));
  const screens = [0, 1, 2].map((seed) =>
    noShadow(
      new MeshBasicMaterial({
        name: `pantalla-${seed}`,
        map: screenTexture(seed),
        color: glow("#ffffff", 1.1),
      }),
    ),
  );

  const towerSegments = [
    new MeshStandardMaterial({ name: "torreta-roja", color: new Color("#5a1a1c"), roughness: 0.25 }),
    new MeshStandardMaterial({ name: "torreta-ámbar", color: new Color("#5c4312"), roughness: 0.25 }),
    new MeshStandardMaterial({ name: "torreta-verde", color: new Color("#134a2e"), roughness: 0.25 }),
    new MeshStandardMaterial({ name: "torreta-blanca", color: new Color("#6d7680"), roughness: 0.25 }),
  ] as const;

  return {
    paint,
    paintAccent,
    charcoal,
    feeder,
    interior,
    steel,
    galvanized,
    structure,
    column,
    rubber,
    glass,
    pcb,
    chip,
    reelDark,
    reelBlue,
    reelLight,
    floor,
    lane,
    concrete,
    deck,
    tote,
    cardboard,
    benchTop,
    esdMat,
    rackUpright,
    fixture,
    ledStrip,
    taskLight,
    ovenGlow,
    windowNight,
    signalLit,
    screens,
    towerSegments,
  };
}

export type Materials = ReturnType<typeof createMaterials>;

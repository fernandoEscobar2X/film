import type { PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import type { Framing, Light } from "../clips";
import type { BrandColor } from "../core/palette";
import type { Subsample } from "../core/sampling";

export interface CameraPose {
  readonly position: Vector3;
  readonly target: Vector3;
  /** Campo de visión vertical en grados. */
  readonly fov: number;
  /** Distancia al plano de foco, en metros. */
  readonly focusDistance: number;
  /** Radio de la apertura en metros (0.006 ≈ un 35 mm a f/2.8). */
  readonly aperture: number;
}

/** Revelado de la toma (ver `finishMaterial`). */
export interface Grade {
  /**
   * "filmica" aplica AgX (luz real, altas luces que se comprimen como en cine); "marca" deja
   * los colores tal cual para que la capa de datos use los valores exactos de la paleta.
   */
  readonly response: "filmica" | "marca";
  /** Exposición en pasos (EV). */
  readonly exposure: number;
  readonly whiteBalance: readonly [number, number, number];
  readonly bloom: number;
  /** Los negros tienden a este color de marca… */
  readonly lift: BrandColor;
  /** …en esta proporción (0 = negro puro, 1 = el color completo). */
  readonly liftAmount: number;
  readonly gamma: number;
  readonly saturation: number;
  readonly vignette: number;
  /**
   * Zona del titular del hero (coordenadas 0–1 desde abajo a la izquierda): óvalo con centro y
   * radios donde la exposición baja `exposure` pasos, con caída suave hacia afuera.
   */
  readonly titleWindow?: {
    readonly center: readonly [number, number];
    readonly radius: readonly [number, number];
    readonly exposure: number;
  };
  readonly grain: number;
}

export interface WorldOptions {
  readonly light: Light;
  readonly framing: Framing;
  /** Duración del loop: el mundo debe verse idéntico en 0 y en `duration`. */
  readonly duration: number;
  /** Resolución de salida (para pasadas auxiliares como el reflejo). */
  readonly width: number;
  readonly height: number;
}

/**
 * Cada toma se renderiza en dos capas con la misma cámara y el mismo instante:
 * la operación física y su capa de datos (lo que ve SIP). La lente del hero las mezcla.
 */
export const layers = ["fisica", "datos"] as const;
export type Layer = (typeof layers)[number];

export interface LayerView {
  readonly scene: Scene;
  readonly grade: Grade;
}

/** Punto de la escena donde el sitio puede poner una etiqueta de la lente (máquina, torreta). */
export interface Anchor {
  /** Estable dentro del loop, p. ej. `a/m1/pnp-2` (línea / módulo / máquina). */
  readonly id: string;
  readonly kind: "maquina";
  readonly position: Vector3;
}

/** Evento del guion que el sitio debe reflejar en sus etiquetas, en segundos del loop. */
export interface ScriptEvent {
  readonly anchor: string;
  readonly state: "alerta" | "paro";
  readonly from: number;
  readonly to: number;
}

export interface FilmWorld {
  readonly layers: Readonly<Record<Layer, LayerView>>;
  /**
   * Anclas para las etiquetas de la lente. Al cerrar el loop, la cámara avanzó un módulo: el
   * ancla del módulo k en el último cuadro continúa como la del módulo k − 1 en el cuadro 0.
   */
  readonly anchors?: readonly Anchor[];
  readonly events?: readonly ScriptEvent[];
  /**
   * Deja el mundo en su estado del instante `t`. Debe ser función pura del tiempo (sin estado
   * acumulado) para que cualquier cuadro se pueda renderizar en cualquier orden.
   * `sample` permite repartir luces de área entre los subcuadros.
   */
  update(t: number, sample: Subsample): void;
  pose(t: number): CameraPose;
  /** Pasadas previas con la cámara ya colocada (p. ej. el reflejo del piso). */
  beforeRender?(gl: WebGLRenderer, camera: PerspectiveCamera, sample: Subsample, layer: Layer): void;
}

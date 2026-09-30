import {
  FloatType,
  HalfFloatType,
  LinearFilter,
  NoToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  type RawShaderMaterial,
  type Texture,
  Vector3,
  Vector4,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import type { FilmWorld, Layer } from "../worlds/types";
import { brandDisplay } from "./palette";
import { subsample } from "./sampling";
import { accumulateMaterial, bloomDownMaterial, bloomUpMaterial, finishMaterial } from "./shaders";

export interface RenderOptions {
  readonly layer: Layer;
  readonly samples: number;
  readonly fps: number;
  readonly shutter: number;
  /** Semilla del grano: cambia por cuadro para que el grano viva como en película. */
  readonly frame: number;
}

const BLOOM_LEVELS = 6;

function hdrTarget(width: number, height: number, type: typeof HalfFloatType | typeof FloatType) {
  return new WebGLRenderTarget(width, height, {
    type,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
  });
}

/**
 * Render offline por acumulación. Cada cuadro promedia N subcuadros, cada uno con:
 * desplazamiento subpíxel (antialias), un punto distinto de la apertura (profundidad de campo),
 * un instante distinto dentro del obturador (motion blur) y luces de área muestreadas por el
 * mundo (sombras suaves). Es lo que hace una cámara real, resuelto por fuerza bruta.
 */
export class FilmRenderer {
  /** Expuesto para que el mundo prepare recursos de GPU (mapas de entorno). */
  readonly gl: WebGLRenderer;
  private readonly camera = new PerspectiveCamera();
  private readonly scene: WebGLRenderTarget;
  private accumulation: [WebGLRenderTarget, WebGLRenderTarget];
  private readonly bloomLevels: WebGLRenderTarget[] = [];
  private readonly quad = new FullScreenQuad();
  private readonly accumulate = accumulateMaterial();
  private readonly bloomDown = bloomDownMaterial();
  private readonly bloomUp = bloomUpMaterial();
  private readonly finish = finishMaterial();

  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly up = new Vector3();
  private readonly focus = new Vector3();

  constructor(
    canvas: HTMLCanvasElement,
    private readonly width: number,
    private readonly height: number,
  ) {
    this.gl = new WebGLRenderer({
      canvas,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    this.gl.setPixelRatio(1);
    this.gl.setSize(width, height, false);
    this.gl.toneMapping = NoToneMapping;
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = PCFShadowMap;
    // Las sombras dependen del subcuadro (luz de área), no de la pasada: una vez por subcuadro.
    this.gl.shadowMap.autoUpdate = false;
    this.gl.autoClear = false;

    this.scene = new WebGLRenderTarget(width, height, {
      type: HalfFloatType,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: true,
    });
    this.accumulation = [hdrTarget(width, height, FloatType), hdrTarget(width, height, FloatType)];
    for (let level = 1; level <= BLOOM_LEVELS; level++) {
      const w = Math.max(1, Math.floor(width / 2 ** level));
      const h = Math.max(1, Math.floor(height / 2 ** level));
      this.bloomLevels.push(hdrTarget(w, h, HalfFloatType));
    }
    this.finish.uniforms.resolution?.value.set(width, height);
  }

  render(world: FilmWorld, t: number, options: RenderOptions): void {
    const { samples, layer } = options;
    const view = world.layers[layer];
    for (let i = 0; i < samples; i++) {
      const sample = subsample(i, samples);
      const instant = t + ((sample.time - 0.5) * options.shutter) / options.fps;
      world.update(instant, sample);
      this.placeCamera(world, instant, sample.pixel, sample.lens);
      this.gl.shadowMap.needsUpdate = true;
      world.beforeRender?.(this.gl, this.camera, sample, layer);

      this.gl.setRenderTarget(this.scene);
      this.gl.clear();
      this.gl.render(view.scene, this.camera);

      const [previous, next] = this.accumulation;
      this.drawPass(this.accumulate, next, {
        previous: previous.texture,
        current: this.scene.texture,
        weight: 1 / (i + 1),
      });
      this.accumulation = [next, previous];
    }

    const hdr = this.accumulation[0].texture;
    const glow = this.renderBloom(hdr);
    const grade = view.grade;
    this.drawPass(this.finish, null, {
      hdr,
      bloom: glow,
      bloomLevels: BLOOM_LEVELS,
      bloomStrength: grade.bloom,
      filmic: grade.response === "filmica",
      exposure: grade.exposure,
      whiteBalance: new Vector3(...grade.whiteBalance),
      lift: new Vector3(...brandDisplay(grade.lift)).multiplyScalar(grade.liftAmount),
      gamma: grade.gamma,
      saturation: grade.saturation,
      vignette: grade.vignette,
      titleWindow: new Vector4(
        ...(grade.titleWindow?.center ?? [0, 0]),
        ...(grade.titleWindow?.radius ?? [1, 1]),
      ),
      titleExposure: grade.titleWindow?.exposure ?? 0,
      grain: grade.grain,
      seed: options.frame,
    });
  }

  private placeCamera(
    world: FilmWorld,
    t: number,
    pixel: readonly [number, number],
    lens: readonly [number, number],
  ): void {
    const pose = world.pose(t);
    const { camera } = this;
    this.forward.subVectors(pose.target, pose.position).normalize();
    this.right.crossVectors(this.forward, camera.up.set(0, 1, 0)).normalize();
    this.up.crossVectors(this.right, this.forward);
    // Lente delgado: la cámara se mueve por la apertura y sigue mirando al mismo punto de foco,
    // así lo que está en el plano de foco queda nítido y lo demás se desenfoca.
    this.focus.copy(pose.position).addScaledVector(this.forward, pose.focusDistance);
    camera.position
      .copy(pose.position)
      .addScaledVector(this.right, lens[0] * pose.aperture)
      .addScaledVector(this.up, lens[1] * pose.aperture);
    camera.lookAt(this.focus);
    camera.fov = pose.fov;
    camera.aspect = this.width / this.height;
    camera.near = 0.05;
    camera.far = 400;
    camera.setViewOffset(this.width, this.height, pixel[0], pixel[1], this.width, this.height);
    camera.updateProjectionMatrix();
  }

  private renderBloom(source: Texture): Texture {
    let input = source;
    let inputWidth = this.width;
    let inputHeight = this.height;
    this.bloomLevels.forEach((target, index) => {
      this.drawPass(this.bloomDown, target, {
        source: input,
        texel: [1 / inputWidth, 1 / inputHeight],
        firstPass: index === 0,
      });
      input = target.texture;
      inputWidth = target.width;
      inputHeight = target.height;
    });
    for (let index = this.bloomLevels.length - 2; index >= 0; index--) {
      const smaller = this.bloomLevels[index + 1];
      const target = this.bloomLevels[index];
      if (!smaller || !target) continue;
      // Suma aditiva sobre el nivel ya bajado (sin limpiar).
      this.drawPass(
        this.bloomUp,
        target,
        { source: smaller.texture, texel: [1 / smaller.width, 1 / smaller.height] },
        false,
      );
    }
    const first = this.bloomLevels[0];
    if (!first) throw new Error("Bloom sin niveles");
    return first.texture;
  }

  private drawPass(
    material: RawShaderMaterial,
    target: WebGLRenderTarget | null,
    uniforms: Record<string, unknown>,
    clear = true,
  ): void {
    for (const [name, value] of Object.entries(uniforms)) {
      const uniform = material.uniforms[name];
      if (!uniform) throw new Error(`Uniform desconocido: ${name}`);
      if (Array.isArray(value)) uniform.value.set(...value);
      else uniform.value = value;
    }
    this.gl.setRenderTarget(target);
    if (clear) this.gl.clear();
    this.quad.material = material;
    this.quad.render(this.gl);
  }
}

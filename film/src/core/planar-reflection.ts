import {
  type Camera,
  HalfFloatType,
  LinearFilter,
  Matrix4,
  type MeshStandardMaterial,
  type Object3D,
  PerspectiveCamera,
  type Scene,
  Vector2,
  Vector3,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";

/**
 * Reflejo planar del piso (plano y = 0), como el de un epóxico pulido. Se renderiza la escena
 * desde la cámara espejo en cada subcuadro; el piso lo muestrea con un desplazamiento distinto
 * por subcuadro, escalado por su rugosidad, y la acumulación lo convierte en un reflejo difuso
 * físicamente plausible (sin blur de pantalla).
 */
export class PlanarReflection {
  readonly target: WebGLRenderTarget;
  readonly textureMatrix = new Matrix4();
  readonly jitter = new Vector2();
  private readonly mirror = new PerspectiveCamera();
  private readonly rotation = new Matrix4();
  private readonly position = new Vector3();
  private readonly lookAt = new Vector3();
  private readonly normal = new Vector3(0, 1, 0);

  constructor(width: number, height: number) {
    this.target = new WebGLRenderTarget(width, height, {
      type: HalfFloatType,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: true,
    });
  }

  /** Renderiza el reflejo para la cámara actual. `hidden` no se ve en el espejo (el propio piso). */
  render(
    gl: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    hidden: readonly Object3D[],
    jitter: readonly [number, number],
  ) {
    camera.updateMatrixWorld();
    this.rotation.extractRotation(camera.matrixWorld);
    this.position.setFromMatrixPosition(camera.matrixWorld);
    // Posición y mirada de la cámara reflejadas en el plano y = 0.
    this.lookAt.set(0, 0, -1).applyMatrix4(this.rotation).add(this.position);
    this.mirror.position.set(this.position.x, -this.position.y, this.position.z);
    this.mirror.up.set(0, 1, 0).applyMatrix4(this.rotation).reflect(this.normal);
    this.mirror.lookAt(this.lookAt.x, -this.lookAt.y, this.lookAt.z);
    this.mirror.updateMatrixWorld();
    this.mirror.projectionMatrix.copy(camera.projectionMatrix);
    this.mirror.projectionMatrixInverse.copy(camera.projectionMatrixInverse);

    this.textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.textureMatrix.multiply(this.mirror.projectionMatrix).multiply(this.mirror.matrixWorldInverse);
    this.jitter.set(jitter[0], jitter[1]);

    const visibility = hidden.map((object) => object.visible);
    for (const object of hidden) object.visible = false;
    gl.setRenderTarget(this.target);
    gl.clear();
    gl.render(scene, this.mirror);
    hidden.forEach((object, index) => {
      object.visible = visibility[index] ?? true;
    });
  }
}

/**
 * Suma el reflejo planar a la luz especular indirecta de un material estándar. Se encadena
 * con parches previos (luminarias) en lugar de reemplazarlos.
 */
export function withPlanarReflection(
  material: MeshStandardMaterial,
  reflection: PlanarReflection,
  strength: number,
): MeshStandardMaterial {
  const previous = material.onBeforeCompile.bind(material);
  const previousKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
    Object.assign(shader.uniforms, {
      reflectionMap: { value: reflection.target.texture },
      reflectionMatrix: { value: reflection.textureMatrix },
      reflectionJitter: { value: reflection.jitter },
      reflectionStrength: { value: strength },
    });
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform mat4 reflectionMatrix;\nvarying vec4 vReflectionCoord;",
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
vec4 reflectionWorld = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  reflectionWorld = instanceMatrix * reflectionWorld;
#endif
vReflectionCoord = reflectionMatrix * ( modelMatrix * reflectionWorld );`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform sampler2D reflectionMap;
uniform vec2 reflectionJitter;
uniform float reflectionStrength;
varying vec4 vReflectionCoord;`,
      )
      .replace(
        "#include <lights_fragment_end>",
        `#include <lights_fragment_end>
{
  float rough = material.roughness;
  // Cada píxel rota la muestra del subcuadro (Cranley-Patterson): ruido que la acumulación
  // promedia, en vez de copias fantasma. El estiramiento vertical imita el brillo alargado de
  // un piso pulido visto en ángulo rasante.
  float turn = 6.2831853 * fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
  vec2 spin = vec2( cos( turn ), sin( turn ) );
  vec2 offset = vec2( reflectionJitter.x * spin.x - reflectionJitter.y * spin.y, reflectionJitter.x * spin.y + reflectionJitter.y * spin.x );
  vec2 reflectionUv = vReflectionCoord.xy / vReflectionCoord.w + offset * vec2( 0.3, 1.0 ) * rough * 0.2;
  vec3 mirrored = texture2D( reflectionMap, reflectionUv ).rgb;
  float facing = saturate( dot( geometryNormal, geometryViewDir ) );
  float fresnel = 0.04 + 0.96 * pow( 1.0 - facing, 5.0 );
  reflectedLight.indirectSpecular += mirrored * fresnel * reflectionStrength * ( 1.0 - rough );
}`,
      );
  };
  material.customProgramCacheKey = () => `${previousKey()}-reflection`;
  return material;
}

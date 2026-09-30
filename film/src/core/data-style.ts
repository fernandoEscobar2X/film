import { type Color, DoubleSide, LineBasicMaterial, MeshBasicMaterial, Vector3 } from "three";
import { noShadow } from "../worlds/kit";

/**
 * Lenguaje visual de la capa de datos, común a todos los mundos: la operación como la ve SIP.
 *
 * - Volúmenes: cada máquina es un bloque con tonos planos de la marca según la orientación de la
 *   cara (techo, frente, costados), como un diagrama de instrumentación en 3D. Son translúcidos
 *   para que se vea el proceso que corre por dentro.
 * - Aristas finas en hielo.
 * - Trazos y paquetes emisivos para los flujos (ver `glowing`).
 *
 * Los volúmenes se mezclan con alfa normal sin escribir profundidad. Todos comparten familia de
 * color y opacidad, así que el orden entre ellos casi no cambia el resultado; lo opaco (aristas,
 * flujos) se dibuja antes y queda atenuado detrás de cada cara, como detrás de un vidrio.
 */

export interface VolumeTones {
  /** Caras que miran a la luz clave (techos). */
  readonly lit: Color;
  /** Caras perpendiculares (frentes). */
  readonly mid: Color;
  /** Caras en sombra y el interior del volumen. */
  readonly shade: Color;
  /** Opacidad de cada cara (0–1). */
  readonly opacity: number;
}

/** Luz clave de los volúmenes: desde arriba y desde el pasillo. */
const KEY = new Vector3(0.25, 1, -0.6).normalize();

export function volumeMaterial(tones: VolumeTones): MeshBasicMaterial {
  const material = noShadow(
    new MeshBasicMaterial({
      name: "volumen-datos",
      side: DoubleSide,
      transparent: true,
      opacity: tones.opacity,
      depthWrite: false,
    }),
  );
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      volumeLit: { value: tones.lit },
      volumeMid: { value: tones.mid },
      volumeShade: { value: tones.shade },
      volumeKey: { value: KEY },
    });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vVolumeNormal;")
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
vec3 volumeNormal = normal;
#ifdef USE_INSTANCING
  volumeNormal = mat3( instanceMatrix ) * volumeNormal;
#endif
vVolumeNormal = mat3( modelMatrix ) * volumeNormal;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vVolumeNormal;
uniform vec3 volumeLit;
uniform vec3 volumeMid;
uniform vec3 volumeShade;
uniform vec3 volumeKey;`,
      )
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `// Las caras interiores se ven desde adentro: su orientación útil es la contraria.
vec3 volumeFacing = normalize( vVolumeNormal ) * ( gl_FrontFacing ? 1.0 : - 1.0 );
float volumeLight = dot( volumeFacing, volumeKey );
vec3 volumeTone = volumeLight > 0.2
  ? mix( volumeMid, volumeLit, smoothstep( 0.2, 0.85, volumeLight ) )
  : mix( volumeShade, volumeMid, smoothstep( - 0.6, 0.2, volumeLight ) );
vec4 diffuseColor = vec4( volumeTone, opacity );`,
      );
  };
  material.customProgramCacheKey = () => "volumen-datos";
  return material;
}

/**
 * Aristas de los volúmenes: opacas y ya mezcladas con el fondo, para que se dibujen antes que los
 * volúmenes y queden atenuadas detrás de cada cara, igual que el resto del proceso.
 */
export function edgeMaterial(color: Color, background: Color, strength: number): LineBasicMaterial {
  return new LineBasicMaterial({ name: "arista-datos", color: background.clone().lerp(color, strength) });
}

/** Emisor en HDR para trazos y paquetes: el bloom los hace brillar sin cambiar su tono. */
export function glowing(color: Color, intensity: number): MeshBasicMaterial {
  return noShadow(new MeshBasicMaterial({ color: color.clone().multiplyScalar(intensity) }));
}

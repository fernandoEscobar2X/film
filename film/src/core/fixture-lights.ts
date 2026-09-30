import type { Color, MeshStandardMaterial } from "three";

/**
 * Retícula periódica de luminarias como luces reales dentro del shader de three.
 *
 * Una nave tiene cientos de luminarias; como luces de three serían imposibles de sombrear. Aquí
 * cada fragmento suma solo las más cercanas (con ventana suave para que no "salten") usando el
 * mismo BRDF físico de three (`RE_Direct`): charcos de luz, brillos en el piso epóxico y en la
 * pintura. La visibilidad hacia el techo se toma de la sombra de la luz cenital de área (la
 * primera direccional), que por subcuadro muestrea un cono distinto: resultado, oclusión suave.
 */

export interface FixtureGrid {
  /** Coordenada z de cada fila de luminarias (hasta 6). */
  readonly rows: readonly number[];
  /** Intensidad relativa por fila (0 = apagada). */
  readonly gains: readonly number[];
  /** Separación y desfase en x de la retícula. */
  readonly pitch: number;
  readonly offset: number;
  /** Altura del emisor. */
  readonly height: number;
  /** Color × intensidad (candelas aproximadas). */
  readonly color: Color;
  /** Luminarias a cada lado que suma cada fragmento. */
  readonly reach: number;
  /**
   * Brillo especular de las luminarias (1 = físico). En un piso con reflejo planar va en 0: el
   * reflejo ya muestra las luminarias, y los brillos puntuales se verían como manchas en fila.
   */
  readonly specular?: number;
}

const MAX_ROWS = 6;

export function withFixtureLights(material: MeshStandardMaterial, grid: FixtureGrid): MeshStandardMaterial {
  if (grid.rows.length > MAX_ROWS || grid.rows.length !== grid.gains.length) {
    throw new Error("Retícula de luminarias inválida");
  }
  const pad = (values: readonly number[]) => [...values, ...Array(MAX_ROWS - values.length).fill(0)];
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      fixtureRows: { value: pad(grid.rows) },
      fixtureGains: { value: pad(grid.gains) },
      fixturePitch: { value: grid.pitch },
      fixtureOffset: { value: grid.offset },
      fixtureHeight: { value: grid.height },
      fixtureColor: { value: grid.color },
      fixtureSpecular: { value: grid.specular ?? 1 },
    });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vFixtureWorld;")
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
vec4 fixtureWorld = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  fixtureWorld = instanceMatrix * fixtureWorld;
#endif
vFixtureWorld = ( modelMatrix * fixtureWorld ).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
#define FIXTURE_ROWS ${MAX_ROWS}
#define FIXTURE_REACH ${grid.reach}
varying vec3 vFixtureWorld;
uniform float fixtureRows[ FIXTURE_ROWS ];
uniform float fixtureGains[ FIXTURE_ROWS ];
uniform float fixturePitch;
uniform float fixtureOffset;
uniform float fixtureHeight;
uniform vec3 fixtureColor;
uniform float fixtureSpecular;`,
      )
      .replace(
        "#include <lights_fragment_end>",
        `{
  float ceiling = 1.0;
  #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
    DirectionalLightShadow ceilingShadow = directionalLightShadows[ 0 ];
    ceiling = receiveShadow ? getShadow( directionalShadowMap[ 0 ], ceilingShadow.shadowMapSize,
      ceilingShadow.shadowIntensity, ceilingShadow.shadowBias, ceilingShadow.shadowRadius,
      vDirectionalShadowCoord[ 0 ] ) : 1.0;
  #endif
  vec3 specularBefore = reflectedLight.directSpecular;
  float nearest = floor( ( vFixtureWorld.x - fixtureOffset ) / fixturePitch + 0.5 );
  float span = ( float( FIXTURE_REACH ) + 0.5 ) * fixturePitch;
  for ( int r = 0; r < FIXTURE_ROWS; r ++ ) {
    float gain = fixtureGains[ r ];
    if ( gain <= 0.0 ) continue;
    for ( int i = - FIXTURE_REACH; i <= FIXTURE_REACH; i ++ ) {
      vec3 source = vec3( fixtureOffset + ( nearest + float( i ) ) * fixturePitch, fixtureHeight, fixtureRows[ r ] );
      vec3 toLight = source - vFixtureWorld;
      float distanceSquared = dot( toLight, toLight );
      vec3 direction = toLight * inversesqrt( distanceSquared );
      // Emite hacia abajo con un haz amplio; la ventana en x evita que una luminaria aparezca de golpe.
      float beam = smoothstep( 0.3, 0.9, direction.y );
      float window = 1.0 - pow( saturate( abs( toLight.x ) / span ), 4.0 );
      IncidentLight fixture;
      fixture.color = fixtureColor * ( gain * beam * window * window * ceiling / ( distanceSquared + 0.25 ) );
      fixture.direction = normalize( ( viewMatrix * vec4( direction, 0.0 ) ).xyz );
      fixture.visible = true;
      RE_Direct( fixture, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
    }
  }
  reflectedLight.directSpecular = mix( specularBefore, reflectedLight.directSpecular, fixtureSpecular );
}
#include <lights_fragment_end>`,
      );
  };
  material.customProgramCacheKey = () => `fixtures-${grid.reach}`;
  return material;
}

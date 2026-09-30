import { AdditiveBlending, GLSL3, NoBlending, RawShaderMaterial, Vector2, Vector3 } from "three";

/** Pasadas de pantalla completa. GLSL 3 crudo: sin inyecciones de three, resultado predecible. */

const fullscreenVertex = /* glsl */ `
precision highp float;
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

function pass(fragmentShader: string, uniforms: RawShaderMaterial["uniforms"]): RawShaderMaterial {
  return new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader: fullscreenVertex,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
    blending: NoBlending,
  });
}

/** Promedio progresivo: acumulado = mezcla(anterior, nuevo, 1 / (i + 1)). */
export function accumulateMaterial(): RawShaderMaterial {
  return pass(
    /* glsl */ `
precision highp float;
uniform sampler2D previous;
uniform sampler2D current;
uniform float weight;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec3 c = texture(current, vUv).rgb;
  // Un NaN o infinito en un subcuadro no debe contaminar el promedio. Se revisan los bits del
  // exponente porque algunos compiladores (HLSL vía ANGLE) eliminan isnan() al optimizar.
  uvec3 bits = floatBitsToUint(c) & 0x7f800000u;
  if (any(equal(bits, uvec3(0x7f800000u)))) c = vec3(0.0);
  c = clamp(c, vec3(0.0), vec3(4096.0));
  vec3 p = texture(previous, vUv).rgb;
  outColor = vec4(mix(p, c, weight), 1.0);
}
`,
    { previous: { value: null }, current: { value: null }, weight: { value: 1 } },
  );
}

/** Bloom por cadena de mips (filtro de 13 muestras al bajar y tienda al subir). */
export function bloomDownMaterial(): RawShaderMaterial {
  return pass(
    /* glsl */ `
precision highp float;
uniform sampler2D source;
uniform vec2 texel;
uniform bool firstPass;
in vec2 vUv;
out vec4 outColor;
vec3 tap(vec2 o) { return texture(source, vUv + texel * o).rgb; }
float karis(vec3 c) { return 1.0 / (1.0 + dot(c, vec3(0.2126, 0.7152, 0.0722))); }
void main() {
  vec3 a = tap(vec2(-2.0, 2.0)), b = tap(vec2(0.0, 2.0)), c = tap(vec2(2.0, 2.0));
  vec3 d = tap(vec2(-2.0, 0.0)), e = tap(vec2(0.0, 0.0)), f = tap(vec2(2.0, 0.0));
  vec3 g = tap(vec2(-2.0, -2.0)), h = tap(vec2(0.0, -2.0)), i = tap(vec2(2.0, -2.0));
  vec3 j = tap(vec2(-1.0, 1.0)), k = tap(vec2(1.0, 1.0)), l = tap(vec2(-1.0, -1.0)), m = tap(vec2(1.0, -1.0));
  vec3 result;
  if (firstPass) {
    // Promedio de Karis: evita que un píxel muy brillante produzca destellos que parpadean.
    vec3 g0 = (a + b + d + e) * 0.25, g1 = (b + c + e + f) * 0.25;
    vec3 g2 = (d + e + g + h) * 0.25, g3 = (e + f + h + i) * 0.25, g4 = (j + k + l + m) * 0.25;
    float w0 = karis(g0) * 0.125, w1 = karis(g1) * 0.125, w2 = karis(g2) * 0.125;
    float w3 = karis(g3) * 0.125, w4 = karis(g4) * 0.5;
    result = (g0 * w0 + g1 * w1 + g2 * w2 + g3 * w3 + g4 * w4) / (w0 + w1 + w2 + w3 + w4);
  } else {
    result = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  }
  outColor = vec4(result, 1.0);
}
`,
    { source: { value: null }, texel: { value: new Vector2() }, firstPass: { value: true } },
  );
}

export function bloomUpMaterial(): RawShaderMaterial {
  const material = pass(
    /* glsl */ `
precision highp float;
uniform sampler2D source;
uniform vec2 texel;
in vec2 vUv;
out vec4 outColor;
vec3 tap(vec2 o) { return texture(source, vUv + texel * o).rgb; }
void main() {
  vec3 sum = tap(vec2(-1.0, 1.0)) + 2.0 * tap(vec2(0.0, 1.0)) + tap(vec2(1.0, 1.0))
    + 2.0 * tap(vec2(-1.0, 0.0)) + 4.0 * tap(vec2(0.0, 0.0)) + 2.0 * tap(vec2(1.0, 0.0))
    + tap(vec2(-1.0, -1.0)) + 2.0 * tap(vec2(0.0, -1.0)) + tap(vec2(1.0, -1.0));
  outColor = vec4(sum / 16.0, 1.0);
}
`,
    { source: { value: null }, texel: { value: new Vector2() } },
  );
  material.blending = AdditiveBlending;
  return material;
}

/**
 * Revelado final: bloom → exposición → AgX (mismo operador que three) → gradación en espacio
 * de pantalla (los negros tienden al azul noche de la marca) → viñeta → grano y dither.
 */
export function finishMaterial(): RawShaderMaterial {
  return pass(
    /* glsl */ `
precision highp float;
uniform sampler2D hdr;
uniform sampler2D bloom;
uniform float bloomLevels;
uniform float bloomStrength;
uniform bool filmic;
uniform float exposure;
uniform vec3 whiteBalance;
uniform vec3 lift;
uniform float gamma;
uniform float saturation;
uniform float vignette;
uniform float grain;
uniform uint seed;
uniform vec2 resolution;
in vec2 vUv;
out vec4 outColor;

const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
  vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
  vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956));

vec3 agxContrast(vec3 x) {
  vec3 x2 = x * x;
  vec3 x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
}

vec3 agx(vec3 color) {
  const mat3 inset = mat3(
    vec3(0.856627153315983, 0.137318972929847, 0.11189821299995),
    vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903),
    vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
  const mat3 outset = mat3(
    vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826),
    vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294),
    vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));
  const float minEv = -12.47393;
  const float maxEv = 4.026069;
  color = inset * (LINEAR_SRGB_TO_LINEAR_REC2020 * color);
  color = clamp((log2(max(color, 1e-10)) - minEv) / (maxEv - minEv), 0.0, 1.0);
  color = outset * agxContrast(color);
  color = pow(max(vec3(0.0), color), vec3(2.2));
  return clamp(LINEAR_REC2020_TO_LINEAR_SRGB * color, 0.0, 1.0);
}

vec3 srgbEncode(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

// Hash entero (PCG): ruido estable, sin artefactos de sin().
uint pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}
float noise(uvec2 p, uint salt) {
  return float(pcg(p.x + pcg(p.y + pcg(seed ^ salt)))) / 4294967295.0;
}

void main() {
  vec3 color = texture(hdr, vUv).rgb;
  vec3 glow = texture(bloom, vUv).rgb / bloomLevels;
  color = mix(color, glow, bloomStrength);
  color *= exp2(exposure) * whiteBalance;

  color = srgbEncode(filmic ? agx(color) : clamp(color, 0.0, 1.0));

  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luma), color, saturation);
  color = pow(max(color, 0.0), vec3(1.0 / gamma));
  // Los negros no son negros: las sombras profundas tienden al noche de la marca; los medios
  // tonos y las luces quedan neutros.
  float shadows = pow(1.0 - clamp(luma, 0.0, 1.0), 4.0);
  color += lift * shadows;

  vec2 q = vUv - 0.5;
  q.x *= resolution.x / resolution.y;
  float v = smoothstep(0.3, 1.1, length(q));
  color = mix(color, lift * 0.6, v * vignette);

  uvec2 pixel = uvec2(gl_FragCoord.xy);
  float n = noise(pixel, 1u) + noise(pixel, 2u) - 1.0;
  color += n * grain * (1.0 - 0.6 * luma);
  // Dither triangular de 1/255 contra el banding de los azules oscuros.
  color += (noise(pixel, 3u) + noise(pixel, 4u) - 1.0) / 255.0;

  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`,
    {
      hdr: { value: null },
      bloom: { value: null },
      bloomLevels: { value: 1 },
      bloomStrength: { value: 0.04 },
      filmic: { value: true },
      exposure: { value: 0 },
      whiteBalance: { value: new Vector3(1, 1, 1) },
      lift: { value: new Vector3() },
      gamma: { value: 1 },
      saturation: { value: 1 },
      vignette: { value: 0 },
      grain: { value: 0 },
      seed: { value: 0 },
      resolution: { value: new Vector2(1, 1) },
    },
  );
}

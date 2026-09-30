#!/usr/bin/env node
/**
 * Pipeline de los videos del hero. Uso: `npm run film -- <comando> <toma> [opciones]`.
 *
 *   render  <toma> [--layer=fisica|datos] [--frames=0-359] [--samples=N] [--scale=S] [--force]
 *   loop    <toma>                 Verifica que el cuadro siguiente al último sea el cuadro 0 (PSNR).
 *   sheet   <toma> [--layer=...]   Hoja de contacto (un cuadro por segundo).
 *   preview <toma>                 El corte de la I a 6° barre el cuadro y revela la capa de datos.
 *   encode  <toma>                 Capas apiladas en AV1 (WebM) y H.264 (MP4) + póster AVIF/WebP.
 *
 * Los cuadros quedan en `media-src/film/<toma>/<capa>/NNNN.png` (fuera de git). Cada cuadro es
 * independiente: un render se puede cortar y reanudar en cualquier punto. Con `--samples` o
 * `--scale` distintos a los de la toma, el render es de prueba y va a `pruebas/` para no mezclarse.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseClip } from "../film/src/clips.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const LAYERS = /** @type {const} */ (["fisica", "datos"]);
const HERO_DIR = join(root, "public/media/hero");
/** Mesa lavapipe: sin GPU es varias veces más rápido que SwiftShader (JIT LLVM con AVX2). */
const LAVAPIPE_ICD = "/usr/share/vulkan/icd.d/lvp_icd.json";

/** @typedef {import("../film/src/clips.ts").Clip} Clip */
/** @typedef {(typeof LAYERS)[number]} Layer */
/** @typedef {Map<string, string | true>} Options */

// ─── Utilidades ──────────────────────────────────────────────────────────────

/** @param {number} index */
const frameName = (index) => `${String(index).padStart(4, "0")}.png`;

/** @param {number} seconds */
function duration(seconds) {
  if (!Number.isFinite(seconds)) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}

/** @param {string} path */
const shown = (path) => relative(process.cwd(), path) || ".";

/** @param {string} file */
const megabytes = (file) => `${(statSync(file).size / 1e6).toFixed(2)} MB`;

/**
 * `--frames=0-359`, `--frames=0,90,180` o `--frames=0-359:30` (cada 30).
 * @param {string} spec
 * @param {number} last Último cuadro válido.
 */
export function parseFrames(spec, last) {
  const frames = new Set();
  for (const part of spec.split(",")) {
    const match = /^(\d+)(?:-(\d+))?(?::(\d+))?$/.exec(part.trim());
    if (!match) throw new Error(`Rango de cuadros inválido: "${part}"`);
    const from = Number(match[1]);
    const to = match[2] === undefined ? from : Number(match[2]);
    const step = Number(match[3] ?? 1);
    if (to < from || step < 1) throw new Error(`Rango de cuadros inválido: "${part}"`);
    for (let i = from; i <= to; i += step) {
      if (i > last) throw new Error(`El cuadro ${i} no existe: la toma va del 0 al ${last}`);
      frames.add(i);
    }
  }
  return [...frames].sort((a, b) => a - b);
}

/**
 * @param {string[]} argv
 * @returns {{ command: string | undefined, clipId: string | undefined, options: Options }}
 */
function parseArgs(argv) {
  /** @type {string[]} */
  const positional = [];
  /** @type {Options} */
  const options = new Map();
  for (const arg of argv) {
    const match = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (match?.[1]) options.set(match[1], match[2] ?? true);
    else positional.push(arg);
  }
  return { command: positional[0], clipId: positional[1], options };
}

/**
 * @param {Options} options
 * @param {string} name
 */
function option(options, name) {
  const value = options.get(name);
  return typeof value === "string" ? value : undefined;
}

/**
 * Ejecuta un comando y devuelve su salida de error (ffmpeg escribe ahí sus mediciones).
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<string>}
 */
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(`${command} terminó con código ${code}:\n${stderr.slice(-2000)}`));
    });
  });
}

/** @param {string} path */
function writeAtomic(path, /** @type {Buffer | string} */ data) {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, data);
  renameSync(temporary, path);
}

// ─── Rutas ───────────────────────────────────────────────────────────────────

/** @param {Clip} clip */
const clipDir = (clip) => join(root, "media-src/film", clip.id);

/**
 * @param {Clip} clip
 * @param {Layer} layer
 * @param {string} [variant] Subcarpeta de pruebas.
 */
const framesDir = (clip, layer, variant) =>
  variant ? join(clipDir(clip), "pruebas", variant, layer) : join(clipDir(clip), layer);

/** @param {Clip} clip */
const totalFrames = (clip) => Math.round(clip.duration * clip.fps);

/**
 * Cuadros que faltan en la carpeta, como rangos legibles ("72–359").
 * @param {string} dir
 * @param {number} total
 */
function missingRanges(dir, total) {
  /** @type {string[]} */
  const ranges = [];
  let start = -1;
  for (let i = 0; i <= total; i++) {
    const missing = i < total && !existsSync(join(dir, frameName(i)));
    if (missing && start < 0) start = i;
    if (!missing && start >= 0) {
      ranges.push(start === i - 1 ? `${start}` : `${start}–${i - 1}`);
      start = -1;
    }
  }
  return ranges;
}

/**
 * @param {Clip} clip
 * @param {readonly Layer[]} layers
 */
function assertComplete(clip, layers) {
  for (const layer of layers) {
    const missing = missingRanges(framesDir(clip, layer), totalFrames(clip));
    if (missing.length > 0) {
      throw new Error(`Faltan cuadros de ${clip.id}/${layer}: ${missing.join(", ")}. Renderízalos primero.`);
    }
  }
}

// ─── Estudio (Vite + Chromium) ───────────────────────────────────────────────

/**
 * Chrome del sistema si existe (usa la GPU real; en Windows, ANGLE sobre D3D11). Si no, el
 * Chromium de Playwright. Sin GPU en Linux, ANGLE sobre Vulkan con lavapipe.
 */
async function launchBrowser() {
  const { chromium } = await import("playwright-core");
  const args = ["--ignore-gpu-blocklist", "--disable-gpu-watchdog", "--enable-unsafe-swiftshader"];
  /** @type {Record<string, string>} */
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      /** @returns {entry is [string, string]} */ (entry) => entry[1] !== undefined,
    ),
  );
  if (process.platform === "linux" && !existsSync("/dev/dri") && existsSync(LAVAPIPE_ICD)) {
    env.VK_ICD_FILENAMES = LAVAPIPE_ICD;
    args.push("--use-angle=vulkan");
  }
  /** @type {Array<{ channel?: string, executablePath?: string }>} */
  const candidates = [];
  if (process.env.FILM_CHROME) candidates.push({ executablePath: process.env.FILM_CHROME });
  candidates.push({ channel: "chrome" }, { channel: "msedge" }, {});
  const bundled = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (bundled && existsSync(join(bundled, "chromium")))
    candidates.push({ executablePath: join(bundled, "chromium") });

  const errors = [];
  for (const candidate of candidates) {
    try {
      return await chromium.launch({ ...candidate, headless: true, args, env });
    } catch (error) {
      errors.push(error instanceof Error ? error.message.split("\n")[0] : String(error));
    }
  }
  throw new Error(
    `No encontré un navegador. Instala Chrome o define FILM_CHROME con la ruta al ejecutable.\n${errors.join("\n")}`,
  );
}

/**
 * Levanta el estudio y devuelve una función para pedir cuadros como PNG.
 * @param {Clip} clip
 * @param {{ samples?: number, scale?: number }} [quality]
 */
async function openStudio(clip, quality = {}) {
  const { createServer } = await import("vite");
  const server = await createServer({ configFile: join(root, "film/vite.config.ts"), logLevel: "error" });
  await server.listen();
  const base = server.resolvedUrls?.local[0];
  if (!base) throw new Error("Vite no devolvió una URL local");
  const url = new URL(base);
  url.searchParams.set("clip", clip.id);
  if (quality.samples !== undefined) url.searchParams.set("samples", String(quality.samples));
  if (quality.scale !== undefined && quality.scale !== 1)
    url.searchParams.set("scale", String(quality.scale));

  const browser = await launchBrowser();

  async function openPage() {
    const page = await browser.newPage();
    page.on("pageerror", (error) => console.error(`  [página] ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning")
        console.error(`  [página] ${message.text()}`);
    });
    await page.goto(url.href);
    await page.waitForFunction(() => window.film ?? window.filmError, undefined, { timeout: 0 });
    const failure = await page.evaluate(() => window.filmError);
    if (failure) throw new Error(`El estudio no pudo montar ${clip.id}: ${failure}`);
    return page;
  }

  let page = await openPage();
  const gpu = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "desconocido";
  });

  return {
    gpu,
    /**
     * @param {number} index
     * @param {Layer} layer
     * @returns {Promise<Buffer>}
     */
    async frame(index, layer) {
      for (let attempt = 1; ; attempt++) {
        try {
          const dataUrl = await page.evaluate(
            ([i, l]) => {
              const film = window.film;
              if (!film) throw new Error("El estudio no está listo");
              return film.frame(Number(i), /** @type {Layer} */ (l));
            },
            [index, layer],
          );
          return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
        } catch (error) {
          // Si la página o el proceso de GPU se cae en un render largo, se reabre y se reintenta.
          if (attempt >= 3) throw error;
          console.error(
            `  cuadro ${index} falló (${error instanceof Error ? error.message : error}); reintento`,
          );
          await page.close().catch(() => undefined);
          page = await openPage();
        }
      }
    },
    async close() {
      await browser.close();
      await server.close();
    },
  };
}

// ─── Comandos ────────────────────────────────────────────────────────────────

/**
 * @param {Clip} clip
 * @param {Options} options
 */
async function render(clip, options) {
  const layer = option(options, "layer");
  if (layer !== undefined && !LAYERS.includes(/** @type {Layer} */ (layer))) {
    throw new Error(`Capa desconocida: "${layer}" (fisica o datos)`);
  }
  const layers = layer ? [/** @type {Layer} */ (layer)] : LAYERS;
  const samples = Number(option(options, "samples") ?? clip.samples);
  const scale = Number(option(options, "scale") ?? 1);
  const variant = samples !== clip.samples || scale !== 1 ? `s${samples}-x${scale}` : undefined;
  const total = totalFrames(clip);
  const frames = parseFrames(option(options, "frames") ?? `0-${total - 1}`, total - 1);
  const force = options.has("force");

  const work = layers.map((l) => {
    const dir = framesDir(clip, l, variant);
    mkdirSync(dir, { recursive: true });
    return { layer: l, dir, pending: frames.filter((i) => force || !existsSync(join(dir, frameName(i)))) };
  });
  if (work.every((w) => w.pending.length === 0)) {
    console.log(`${clip.id}: esos cuadros ya están renderizados (usa --force para repetirlos)`);
    return;
  }

  const studio = await openStudio(clip, { samples, scale });
  console.log(`${clip.id} · ${samples} subcuadros · escala ${scale} · ${studio.gpu}`);
  try {
    for (const { layer: l, dir, pending } of work) {
      if (pending.length === 0) continue;
      console.log(`${l}: ${pending.length} cuadros → ${shown(dir)}`);
      /** @type {number[]} */
      const times = [];
      for (const [done, index] of pending.entries()) {
        const started = performance.now();
        writeAtomic(join(dir, frameName(index)), await studio.frame(index, l));
        times.push((performance.now() - started) / 1000);
        const recent = times.slice(-8);
        const perFrame = recent.reduce((a, b) => a + b, 0) / recent.length;
        const left = pending.length - done - 1;
        console.log(
          `  ${l} ${frameName(index).slice(0, 4)}  ${times.at(-1)?.toFixed(1)} s  ` +
            `(${done + 1}/${pending.length}, faltan ${duration(left * perFrame)})`,
        );
      }
    }
  } finally {
    await studio.close();
  }
}

/**
 * PSNR entre dos imágenes (dB), medido por ffmpeg.
 * @param {string} a
 * @param {string} b
 */
async function psnr(a, b) {
  const log = await run("ffmpeg", ["-hide_banner", "-i", a, "-i", b, "-lavfi", "psnr", "-f", "null", "-"]);
  const match = /average:(inf|[\d.]+)/.exec(log);
  if (!match?.[1]) throw new Error("ffmpeg no reportó el PSNR");
  return match[1] === "inf" ? Number.POSITIVE_INFINITY : Number(match[1]);
}

/**
 * El cuadro N (el siguiente al último) debe verse igual que el 0: así el loop no tiene costura.
 * @param {Clip} clip
 */
async function loop(clip) {
  const total = totalFrames(clip);
  const dir = join(clipDir(clip), "loop");
  mkdirSync(dir, { recursive: true });
  const studio = await openStudio(clip);
  let ok = true;
  try {
    for (const layer of LAYERS) {
      let first = join(framesDir(clip, layer), frameName(0));
      if (!existsSync(first)) {
        first = join(dir, `${layer}-${frameName(0)}`);
        if (!existsSync(first)) writeAtomic(first, await studio.frame(0, layer));
      }
      const closing = join(dir, `${layer}-${frameName(total)}`);
      writeAtomic(closing, await studio.frame(total, layer));
      const db = await psnr(first, closing);
      const pass = db >= 45;
      ok &&= pass;
      console.log(
        `${layer}: cuadro 0 vs cuadro ${total}: PSNR ${db.toFixed(1)} dB ${pass ? "✓" : "✗ (costura visible)"}`,
      );
    }
  } finally {
    await studio.close();
  }
  if (!ok) process.exitCode = 1;
}

/**
 * @param {Clip} clip
 * @param {Options} options
 */
async function sheet(clip, options) {
  const layers = option(options, "layer") ? [/** @type {Layer} */ (option(options, "layer"))] : LAYERS;
  const every = Number(option(options, "every") ?? clip.fps);
  const variant = option(options, "variant");
  for (const layer of layers) {
    const dir = framesDir(clip, layer, variant);
    const files = existsSync(dir)
      ? readdirSync(dir)
          .filter((name) => /^\d{4}\.png$/.test(name) && Number(name.slice(0, 4)) % every === 0)
          .sort()
      : [];
    if (files.length === 0) {
      console.log(`${layer}: no hay cuadros en ${shown(dir)}`);
      continue;
    }
    const list = join(dir, "..", `hoja-${layer}.txt`);
    writeFileSync(list, files.map((name) => `file '${join(dir, name)}'`).join("\n"));
    const columns = clip.framing === "h" ? 4 : 6;
    const rows = Math.ceil(files.length / columns);
    const out = join(dir, "..", `hoja-${layer}.jpg`);
    await run("ffmpeg", [
      ...["-hide_banner", "-y", "-f", "concat", "-safe", "0", "-i", list],
      ...[
        "-vf",
        `scale=${clip.framing === "h" ? 640 : 360}:-2,tile=${columns}x${rows}:padding=6:color=0x011631`,
      ],
      ...["-frames:v", "1", "-q:v", "3", out],
    ]);
    rmSync(list);
    console.log(`${layer}: ${files.length} cuadros → ${shown(out)}`);
  }
}

/**
 * Máscara del corte: una franja con los lados inclinados 6° como la I del logo (arriba hacia la
 * derecha) que barre el cuadro de ida y vuelta en un loop. Expresión para `geq` de ffmpeg.
 * @param {Clip} clip
 * @param {"franja" | "borde"} kind
 */
function cutMask(clip, kind) {
  const slant = Math.tan((6 * Math.PI) / 180).toFixed(5);
  const band = clip.framing === "h" ? 0.2 : 0.36;
  // Centro de la franja: sale por la izquierda, cruza y sale por la derecha; vuelve en el otro medio loop.
  const center = `(W/2-(W/2+W*${band})*cos(2*PI*T/${clip.duration}))`;
  const distance = `abs(X-${center}-(H/2-Y)*${slant})`;
  const half = `(W*${band}/2)`;
  return kind === "franja"
    ? `255*clip(0.5+(${half}-${distance})/1.2,0,1)`
    : `255*clip(1.2-abs(${distance}-${half})/1.1,0,1)`;
}

/**
 * Vista previa de la lente: la capa de datos aparece dentro del corte de la I.
 * @param {Clip} clip
 * @param {Options} options
 */
async function preview(clip, options) {
  const variant = option(options, "variant");
  if (!variant) assertComplete(clip, LAYERS);
  const fisica = join(framesDir(clip, "fisica", variant), "%04d.png");
  const datos = join(framesDir(clip, "datos", variant), "%04d.png");
  const out = join(clipDir(clip), variant ? `preview-${variant}.mp4` : "preview.mp4");
  const size = `${clip.width}x${clip.height}`;
  const source = (/** @type {string} */ color) =>
    `color=c=${color}:s=${size}:r=${clip.fps}:d=${clip.duration}`;
  const graph = [
    `[0:v]scale=${size}:flags=lanczos,format=gbrp[fisica]`,
    `[1:v]scale=${size}:flags=lanczos,format=gbrp[datos]`,
    `${source("black")},format=gray,geq=lum='${cutMask(clip, "franja")}'[franja]`,
    `${source("black")},format=gray,geq=lum='${cutMask(clip, "borde")}'[borde]`,
    `${source("0x0189F5")},format=gbrp[senal]`,
    "[datos][franja]alphamerge[dentro]",
    "[senal][borde]alphamerge[linea]",
    "[fisica][dentro]overlay=format=gbrp[cortado]",
    "[cortado][linea]overlay=format=gbrp,format=yuv420p[salida]",
  ].join(";");
  await run("ffmpeg", [
    ...["-hide_banner", "-y", "-framerate", String(clip.fps), "-i", fisica],
    ...["-framerate", String(clip.fps), "-i", datos],
    ...["-filter_complex", graph, "-map", "[salida]", "-frames:v", String(totalFrames(clip))],
    ...["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-tune", "film", "-movflags", "+faststart", out],
  ]);
  console.log(`vista previa → ${shown(out)} (${megabytes(out)})`);
}

/**
 * Capas apiladas (física arriba, datos abajo) en un solo video: el sitio las decodifica juntas,
 * alineadas al píxel y al cuadro, y la lente WebGL las mezcla. Sin WebGL se muestra la mitad física.
 * @param {Clip} clip
 */
async function encode(clip) {
  assertComplete(clip, LAYERS);
  mkdirSync(HERO_DIR, { recursive: true });
  const fisica = join(framesDir(clip, "fisica"), "%04d.png");
  const datos = join(framesDir(clip, "datos"), "%04d.png");
  const inputs = ["-framerate", String(clip.fps), "-i", fisica, "-framerate", String(clip.fps), "-i", datos];
  const stack = ["-filter_complex", "[0:v][1:v]vstack=inputs=2[apiladas]", "-map", "[apiladas]"];
  // Un cuadro clave por segundo: el loop y el salto de industria buscan rápido.
  const gop = ["-g", String(clip.fps), "-an"];

  const av1 = join(HERO_DIR, `${clip.id}.webm`);
  await run("ffmpeg", [
    ...["-hide_banner", "-y", ...inputs, ...stack, ...gop],
    // 10 bits: los degradados azul noche no hacen bandas.
    ...["-c:v", "libsvtav1", "-preset", "4", "-crf", "34", "-pix_fmt", "yuv420p10le"],
    ...["-svtav1-params", "tune=0:enable-overlays=1:scd=0", av1],
  ]);
  const h264 = join(HERO_DIR, `${clip.id}.mp4`);
  await run("ffmpeg", [
    ...["-hide_banner", "-y", ...inputs, ...stack, ...gop],
    ...["-c:v", "libx264", "-preset", "veryslow", "-crf", "23", "-tune", "film", "-pix_fmt", "yuv420p"],
    ...["-x264-params", "aq-mode=3:aq-strength=0.9", "-profile:v", "high", "-movflags", "+faststart", h264],
  ]);

  // Póster: el cuadro 0 de la capa física. Es el LCP del hero y lo que se ve sin WebGL.
  const first = join(framesDir(clip, "fisica"), frameName(0));
  const avif = join(HERO_DIR, `${clip.id}.avif`);
  await run("ffmpeg", [
    ...["-hide_banner", "-y", "-i", first, "-c:v", "libaom-av1", "-still-picture", "1"],
    ...["-crf", "26", "-b:v", "0", "-pix_fmt", "yuv420p10le", "-cpu-used", "4", avif],
  ]);
  const webp = join(HERO_DIR, `${clip.id}.webp`);
  await run("ffmpeg", ["-hide_banner", "-y", "-i", first, "-c:v", "libwebp", "-quality", "82", webp]);

  for (const file of [av1, h264, avif, webp]) console.log(`${shown(file)}  ${megabytes(file)}`);
}

// ─── Entrada ─────────────────────────────────────────────────────────────────

const commands = { render, loop, sheet, preview, encode };

async function main() {
  const { command, clipId, options } = parseArgs(process.argv.slice(2));
  if (!command || !clipId || !(command in commands)) {
    console.log(
      "Uso: npm run film -- <render|loop|sheet|preview|encode> <industria>-<noche|dia>-<h|v> [opciones]",
    );
    process.exitCode = command ? 1 : 0;
    return;
  }
  const clip = parseClip(clipId);
  await commands[/** @type {keyof typeof commands} */ (command)](clip, options);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

import { PerspectiveCamera } from "three";
import { parseClip } from "./clips";
import { FilmRenderer } from "./core/film-renderer";
import { createWorld } from "./worlds";

/**
 * Estudio de video: monta la toma pedida en `?clip=` y expone `window.film.frame(i)` y
 * `window.film.anchors(i)`. Para pruebas rápidas: `?samples=` baja los subcuadros y `?scale=`
 * la resolución.
 */

/** Más lejos, la niebla borra la máquina: no tiene sentido etiquetarla. */
const ANCHOR_RANGE = 36;

function start(): void {
  const params = new URLSearchParams(location.search);
  const clip = parseClip(params.get("clip") ?? "manufactura-noche-h");
  const samples = Number(params.get("samples") ?? clip.samples);
  const scale = Number(params.get("scale") ?? 1);
  const width = Math.round(clip.width * scale);
  const height = Math.round(clip.height * scale);
  const canvas = document.querySelector<HTMLCanvasElement>("#film");
  if (!canvas) throw new Error("Falta el canvas #film");

  const renderer = new FilmRenderer(canvas, width, height);
  const world = createWorld(clip.industry, renderer.gl, {
    light: clip.light,
    framing: clip.framing,
    duration: clip.duration,
    width,
    height,
  });

  const frames = Math.round(clip.duration * clip.fps);
  const lens = new PerspectiveCamera();
  window.film = {
    clip,
    frames,
    events: world.events ?? [],
    anchors(index) {
      // La misma cámara que el render, sin los desplazamientos de subcuadro.
      const pose = world.pose(index / clip.fps);
      lens.position.copy(pose.position);
      lens.up.set(0, 1, 0);
      lens.lookAt(pose.target);
      Object.assign(lens, { fov: pose.fov, aspect: clip.width / clip.height, near: 0.05, far: 400 });
      lens.updateProjectionMatrix();
      lens.updateMatrixWorld();
      return (world.anchors ?? []).map(({ id, kind, position }) => {
        const distance = position.distanceTo(pose.position);
        const ndc = position.clone().project(lens);
        const visible = ndc.z < 1 && Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && distance <= ANCHOR_RANGE;
        return { id, kind, x: (ndc.x + 1) / 2, y: (1 - ndc.y) / 2, distance, visible };
      });
    },
    async frame(index, layer) {
      // El grano también cierra el loop: el cuadro `frames` usa la semilla del cuadro 0.
      const seed = ((index % frames) + frames) % frames;
      renderer.render(world, index / clip.fps, {
        layer,
        samples,
        fps: clip.fps,
        shutter: clip.shutter,
        frame: seed,
      });
      return canvas.toDataURL("image/png");
    },
  };
}

try {
  start();
} catch (error) {
  window.filmError = error instanceof Error ? error.message : String(error);
  throw error;
}

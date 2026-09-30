import { parseClip } from "./clips";
import { FilmRenderer } from "./core/film-renderer";
import { createWorld } from "./worlds";

/**
 * Estudio de video: monta la toma pedida en `?clip=` y expone `window.film.frame(i)`.
 * Para pruebas rápidas: `?samples=` baja los subcuadros y `?scale=` la resolución.
 */
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
  window.film = {
    clip,
    frames,
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

import type { WebGLRenderer } from "three";
import type { Industry } from "../clips";
import { createManufactura } from "./manufactura";
import type { FilmWorld, WorldOptions } from "./types";

type WorldFactory = (gl: WebGLRenderer, options: WorldOptions) => FilmWorld;

const factories: Partial<Record<Industry, WorldFactory>> = {
  manufactura: createManufactura,
};

export function createWorld(industry: Industry, gl: WebGLRenderer, options: WorldOptions): FilmWorld {
  const factory = factories[industry];
  if (!factory) throw new Error(`La industria "${industry}" aún no tiene mundo`);
  return factory(gl, options);
}

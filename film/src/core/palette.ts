import { Color, SRGBColorSpace } from "three";
import tokensCss from "../../../src/styles/tokens.css?raw";

/**
 * Paleta de marca leída de `src/styles/tokens.css`, la misma fuente que usa el sitio.
 * Si un color cambia en los tokens, el siguiente render ya lo usa.
 */

const brandColors = [
  "noche",
  "marino",
  "pacifico-400",
  "pacifico-500",
  "pacifico-600",
  "senal",
  "senal-600",
  "hielo",
  "blanco",
  "bruma",
  "acero",
  "estado-operando",
  "estado-alerta",
  "estado-paro",
] as const;

export type BrandColor = (typeof brandColors)[number];

const declared = new Map(
  [...tokensCss.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{3,8})\s*;/gi)].map(
    ([, name, hex]) => [name, hex] as const,
  ),
);

const hexes = Object.fromEntries(
  brandColors.map((name) => {
    const hex = declared.get(name);
    if (!hex) throw new Error(`tokens.css no declara --color-${name}`);
    return [name, hex];
  }),
) as Record<BrandColor, string>;

/** Color de marca en espacio lineal (three convierte desde sRGB). */
export function brand(name: BrandColor): Color {
  return new Color(hexes[name]);
}

/** Color de marca codificado en sRGB 0–1, para operaciones de gradación en espacio de pantalla. */
export function brandDisplay(name: BrandColor): [number, number, number] {
  const { r, g, b } = brand(name).getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
  return [r, g, b];
}

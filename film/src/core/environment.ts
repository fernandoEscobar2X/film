import {
  BackSide,
  BoxGeometry,
  type Color,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  Scene,
  type Texture,
  type WebGLRenderer,
} from "three";

export interface InteriorEnvironment {
  /** Color de muros, piso y techo del entorno. */
  readonly shell: Color;
  /** Luminarias del techo (color × intensidad lineal). */
  readonly fixtures: Color;
  /** Banda de ventanas altas. */
  readonly windows: Color;
}

/**
 * Mapa de entorno de una nave industrial, solo para reflejos (pintura, vidrio, piso epóxico):
 * filas de luminarias en el techo y una banda de ventanas altas.
 */
export function interiorEnvironment(gl: WebGLRenderer, spec: InteriorEnvironment): Texture {
  const scene = new Scene();
  const shell = new Mesh(
    new BoxGeometry(80, 14, 40),
    new MeshBasicMaterial({ color: spec.shell, side: BackSide }),
  );
  shell.position.y = 5;
  scene.add(shell);

  const fixture = new MeshBasicMaterial({ color: spec.fixtures });
  for (let row = -2; row <= 2; row++) {
    for (let column = -8; column <= 8; column++) {
      const light = new Mesh(new BoxGeometry(0.8, 0.1, 0.8), fixture);
      light.position.set(column * 4.5, 10.5, row * 6);
      scene.add(light);
    }
  }
  const windows = new MeshBasicMaterial({ color: spec.windows });
  for (const z of [-19.8, 19.8]) {
    const band = new Mesh(new BoxGeometry(78, 1.8, 0.2), windows);
    band.position.set(0, 9, z);
    scene.add(band);
  }

  const pmrem = new PMREMGenerator(gl);
  const target = pmrem.fromScene(scene, 0.02);
  pmrem.dispose();
  return target.texture;
}

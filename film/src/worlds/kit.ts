import {
  BoxGeometry,
  type BufferGeometry,
  CylinderGeometry,
  Euler,
  Group,
  InstancedMesh,
  type Material,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export type Vec3 = readonly [number, number, number];

const Y_AXIS = new Vector3(0, 1, 0);

/** Material que no debe proyectar sombra (vidrio, emisores). */
export function noShadow<T extends Material>(material: T): T {
  material.userData.castShadow = false;
  return material;
}

/**
 * Juego de construcción: acumula piezas por material y al final las fusiona en una sola
 * geometría por material. Una pieza repetida mil veces cuesta una llamada de dibujo.
 */
export class Kit {
  private readonly parts = new Map<Material, BufferGeometry[]>();

  add(material: Material, geometry: BufferGeometry, matrix?: Matrix4): this {
    if (matrix) geometry.applyMatrix4(matrix);
    const list = this.parts.get(material);
    if (list) list.push(geometry);
    else this.parts.set(material, [geometry]);
    return this;
  }

  /** Caja apoyada: `base` es el centro de su cara inferior. */
  box(material: Material, size: Vec3, base: Vec3, rotation: Vec3 = [0, 0, 0]): this {
    const geometry = new BoxGeometry(size[0], size[1], size[2]);
    geometry.translate(0, size[1] / 2, 0);
    return this.add(material, geometry, compose(base, rotation));
  }

  /** Cilindro vertical apoyado en `base`. */
  cylinder(
    material: Material,
    radius: number,
    height: number,
    base: Vec3,
    { segments = 20, radiusTop = radius, rotation = [0, 0, 0] as Vec3 } = {},
  ): this {
    const geometry = new CylinderGeometry(radiusTop, radius, height, segments);
    geometry.translate(0, height / 2, 0);
    return this.add(material, geometry, compose(base, rotation));
  }

  /** Barra cilíndrica entre dos puntos. */
  rod(material: Material, radius: number, from: Vec3, to: Vec3, segments = 10): this {
    const start = new Vector3(...from);
    const direction = new Vector3(...to).sub(start);
    const length = direction.length();
    const geometry = new CylinderGeometry(radius, radius, length, segments);
    geometry.translate(0, length / 2, 0);
    const rotation = new Quaternion().setFromUnitVectors(Y_AXIS, direction.normalize());
    return this.add(material, geometry, new Matrix4().compose(start, rotation, new Vector3(1, 1, 1)));
  }

  /** Geometrías fusionadas, una por material. */
  build(): Array<{ material: Material; geometry: BufferGeometry }> {
    return [...this.parts].map(([material, parts]) => {
      // Algunas geometrías de three (RoundedBox) no son indexadas: si se mezclan, todas pasan a no indexadas.
      const mixed = parts.some((part) => part.index === null) && parts.some((part) => part.index !== null);
      const geometries = mixed ? parts.map((part) => (part.index ? part.toNonIndexed() : part)) : parts;
      const geometry = mergeGeometries(geometries, false);
      if (!geometry) throw new Error(`No se pudieron fusionar piezas de ${material.name || material.type}`);
      for (const part of new Set([...parts, ...geometries])) part.dispose();
      return { material, geometry };
    });
  }
}

export function compose(position: Vec3, rotation: Vec3 = [0, 0, 0], scale: Vec3 = [1, 1, 1]): Matrix4 {
  return new Matrix4().compose(
    new Vector3(...position),
    new Quaternion().setFromEuler(new Euler(...rotation)),
    new Vector3(...scale),
  );
}

/** Repite un módulo fusionado en cada transformación (instancing), con sombras según material. */
export function instance(parts: ReturnType<Kit["build"]>, transforms: readonly Matrix4[]): Group {
  const group = new Group();
  for (const { material, geometry } of parts) {
    const mesh = new InstancedMesh(geometry, material, transforms.length);
    transforms.forEach((matrix, index) => {
      mesh.setMatrixAt(index, matrix);
    });
    mesh.castShadow = material.userData.castShadow !== false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  return group;
}

/**
 * Medidas de la planta (metros). El mundo es periódico en x con periodo `PERIOD`: la cámara
 * avanza exactamente un periodo por loop, así el último cuadro empata con el primero.
 */

export const PERIOD = 9.6;
/** Módulos replicados: de detrás de la cámara hasta perderse en la niebla. */
export const MODULES = { first: -3, last: 12 } as const;

export const BELT_Y = 0.95;
/**
 * Líneas: A es la principal (a la derecha de la cámara), C corre detrás de ella y B queda al
 * otro lado del pasillo, girada 180° y en penumbra (ahí se apoya el titular del hero).
 */
export const LINE_A_Z = 2.7;
export const LINE_B_Z = -5.0;
export const LINE_C_Z = 7.4;

export const BOARD_PITCH = 1.2;
export const BOARD_SPEED = 0.4;

export const PNP = { width: 1.3, depth: 1.6 } as const;
export const AOI = { width: 1.0, depth: 1.4 } as const;
export const OVEN = { width: 3.4, depth: 1.3 } as const;

/** Inicio en x de cada máquina dentro del módulo (los huecos llevan banda y sensores). */
export const STATIONS = { pnpA: 0.6, pnpB: 2.4, aoi: 4.2, oven: 5.7 } as const;
export const GAPS = [0.3, 2.15, 3.95, 5.45, 9.35] as const;

export const TRAY_Y = 3.1;
/** Carriles de seguridad pintados en el piso. */
export const LANES = [1.25, -3.55, 4.1, 6.05] as const;
export const TRUSS_Y = 7.6;
export const ROOF_Y = 9.2;
export const FIXTURE_Y = 6.0;
export const FIXTURE_ROWS = [-5.0, -1.2, 2.7, 5.1, 7.4] as const;
/** Intensidad por fila: el lado de la línea B queda más oscuro para que el titular respire. */
export const FIXTURE_GAINS = [0.3, 0.12, 1, 0.7, 0.8] as const;
export const FIXTURE_PITCH = 2.4;
export const FIXTURE_OFFSET = 1.2;
export const WALL_Z = 10.4;

/** Estados de una torreta, en el orden de sus segmentos de abajo hacia arriba. */
export const TOWER_SEGMENT = { base: 0.06, height: 0.052, radius: 0.03 } as const;

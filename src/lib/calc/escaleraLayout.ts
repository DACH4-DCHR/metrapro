import type { TipoEscalera } from "./escalera";

// Geometría en planta (x = ancho, z = sentido de avance) de un tramo recto de
// escalera, independiente de la altura — la comparten la vista en planta y la
// vista isométrica 3D, para que ambas siempre muestren el mismo giro.
export interface FlightFootprint {
  origin: { x: number; z: number }; // punto en t=0, wFrac=0
  dir: { x: number; z: number }; // dirección de avance (unitaria, ±1 en x ó z)
  perp: { x: number; z: number }; // dirección del ancho (perpendicular a dir)
  length: number; // desarrollo horizontal, cm
  width: number; // ancho de la escalera en este tramo, cm
}

export interface EscaleraLayout {
  tramo1: FlightFootprint;
  landingCorners: { x: number; z: number }[] | null;
  tramo2: FlightFootprint | null;
}

// Calcula la posición/orientación de tramo1, el descanso y tramo2 según el tipo de
// escalera. Devuelve tramo2/landingCorners en null si el tipo es de un solo tramo o
// si faltan datos (desarrollo2 o el largo del descanso).
export function calcularEscaleraLayout(
  tipo: TipoEscalera,
  ancho: number, // cm
  desarrollo1: number, // cm
  desarrollo2: number, // cm, 0 si no aplica/no está disponible
  landingLargo: number // cm, 0 si no aplica/no está disponible
): EscaleraLayout {
  const tramo1: FlightFootprint = {
    origin: { x: 0, z: 0 },
    dir: { x: 0, z: 1 },
    perp: { x: 1, z: 0 },
    length: desarrollo1,
    width: ancho,
  };

  if (tipo === "un_tramo" || desarrollo2 <= 0 || landingLargo <= 0) {
    return { tramo1, landingCorners: null, tramo2: null };
  }

  if (tipo === "dos_tramos") {
    // Continúa recto en la misma dirección, con un descanso intermedio.
    const landingCorners = [
      { x: 0, z: desarrollo1 },
      { x: ancho, z: desarrollo1 },
      { x: ancho, z: desarrollo1 + landingLargo },
      { x: 0, z: desarrollo1 + landingLargo },
    ];
    const tramo2: FlightFootprint = {
      origin: { x: 0, z: desarrollo1 + landingLargo },
      dir: { x: 0, z: 1 },
      perp: { x: 1, z: 0 },
      length: desarrollo2,
      width: ancho,
    };
    return { tramo1, landingCorners, tramo2 };
  }

  if (tipo === "L") {
    // Giro de 90°: el descanso es la esquina, tramo2 avanza en el eje x.
    const landingCorners = [
      { x: 0, z: desarrollo1 },
      { x: ancho, z: desarrollo1 },
      { x: ancho, z: desarrollo1 + landingLargo },
      { x: 0, z: desarrollo1 + landingLargo },
    ];
    const tramo2: FlightFootprint = {
      origin: { x: ancho, z: desarrollo1 },
      dir: { x: 1, z: 0 },
      perp: { x: 0, z: 1 },
      length: desarrollo2,
      width: landingLargo,
    };
    return { tramo1, landingCorners, tramo2 };
  }

  // "U": giro de 180°, tramo2 vuelve en paralelo a tramo1 separado por un pasillo.
  const gap = ancho * 0.2;
  const landingCorners = [
    { x: 0, z: desarrollo1 },
    { x: 2 * ancho + gap, z: desarrollo1 },
    { x: 2 * ancho + gap, z: desarrollo1 + landingLargo },
    { x: 0, z: desarrollo1 + landingLargo },
  ];
  const tramo2: FlightFootprint = {
    origin: { x: ancho + gap, z: desarrollo1 + landingLargo },
    dir: { x: 0, z: -1 },
    perp: { x: 1, z: 0 },
    length: desarrollo2,
    width: ancho,
  };
  return { tramo1, landingCorners, tramo2 };
}

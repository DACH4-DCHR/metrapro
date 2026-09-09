import { getRebar } from "../materials";

// Gancho estándar a 90° (extensión recta ≥ 12·db más allá de la tangente del doblez):
// se usa para el anclaje de barras longitudinales rectas en extremos discontinuos
// (apoyo simple, borde de losa, etc.). NTE E.060 / ACI 318 Cap. 25.3.
export function longitudGanchoBarra90(diametroId: string): number {
  const dbM = getRebar(diametroId).diameterMm / 1000;
  return 12 * dbM;
}

// Gancho sísmico a 135° de estribos y cercos de confinamiento: extensión recta ≥ 6·db
// por gancho, no menor a 7.5 cm, en cada uno de los 2 extremos del estribo cerrado.
// NTE E.060 Art. 21.2.5 / ACI 318 25.3.2. Reemplaza el valor fijo de 0.20 m usado antes.
export function longitudGanchoEstribo135(diametroId: string): number {
  const dbM = getRebar(diametroId).diameterMm / 1000;
  return 2 * Math.max(6 * dbM, 0.075);
}

// Concreto ciclópeo: concreto simple colocado junto con piedra desplazadora,
// según NTE E.060 Art. 22.10. Usado en cimientos corridos, sobrecimientos,
// muros de contención de gravedad y falsas zapatas.

export interface ConcretoCiclopeoInput {
  longitudTotal: number; // m
  ancho: number; // cm
  altura: number; // cm
  porcentajePiedra: number; // % del volumen total (máx. 30% según E.060 Art. 22.10.1b)
}

export interface ConcretoCiclopeoResult {
  volumenTotal: number; // m3
  volumenPiedra: number; // m3
  volumenConcretoSimple: number; // m3 (matriz, sin piedra)
}

export function calcularConcretoCiclopeo(input: ConcretoCiclopeoInput): ConcretoCiclopeoResult {
  const volumenTotal = input.longitudTotal * (input.ancho / 100) * (input.altura / 100);
  const volumenPiedra = volumenTotal * (input.porcentajePiedra / 100);
  const volumenConcretoSimple = volumenTotal - volumenPiedra;

  return { volumenTotal, volumenPiedra, volumenConcretoSimple };
}

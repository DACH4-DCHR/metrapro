// Análisis de Precios Unitarios (APU): desglosa el precio de una partida en
// materiales + mano de obra + equipos/herramientas, en vez de un solo número
// escrito a mano. De acá sale el reparto REAL mano de obra/materiales de una
// partida puntual (hoy el Dashboard solo tiene un % referencial por
// categoría, ver dashboardCharts.ts).
//
// Los jornales y rendimientos de las plantillas por defecto (más abajo) son
// valores REFERENCIALES de la práctica peruana — igual criterio que la
// dosificación de concreto en materiales.ts: ajústalos al convenio colectivo
// vigente (CAPECO/FTCCP) y a tu rendimiento real antes de usarlos en un
// entregable final. Toda partida acepta un APU editado a mano que reemplaza
// esta plantilla (ver ApuOverrides).
export type CategoriaManoObra = "Operario" | "Oficial" | "Peón";

export interface ApuMaterialItem {
  insumo: string;
  unidad: string;
  cantidad: number; // por unidad de la partida (ej. por m², por m³)
  precio: number; // S/. por unidad del insumo
}

export interface ApuManoObraItem {
  categoria: CategoriaManoObra;
  cuadrilla: number; // cantidad de esa categoría en la cuadrilla
  rendimiento: number; // unidades de partida por día, de toda la cuadrilla
  jornal: number; // S/. por día, de esa categoría
}

export interface ApuEquipoItem {
  insumo: string;
  // Directo (cantidad × precio) o herramientas menores como % de mano de obra.
  cantidad?: number;
  precio?: number;
  pctManoObra?: number; // ej. 0.03 = 3% de mano de obra
}

export interface ApuDef {
  materiales: ApuMaterialItem[];
  manoObra: ApuManoObraItem[];
  equipos: ApuEquipoItem[];
}

export interface ApuTotales {
  materiales: number;
  manoObra: number;
  equipos: number;
  total: number;
}

export function calcularApu(apu: ApuDef): ApuTotales {
  const materiales = apu.materiales.reduce((acc, m) => acc + m.cantidad * m.precio, 0);
  const manoObra = apu.manoObra.reduce(
    (acc, m) => acc + (m.cuadrilla * m.jornal) / Math.max(m.rendimiento, 0.0001),
    0
  );
  const equipos = apu.equipos.reduce(
    (acc, e) => acc + (e.pctManoObra != null ? e.pctManoObra * manoObra : (e.cantidad ?? 0) * (e.precio ?? 0)),
    0
  );
  return { materiales, manoObra, equipos, total: materiales + manoObra + equipos };
}

// Jornales referenciales (S/. por día) — régimen de construcción civil,
// valores de práctica general. AJUSTA al convenio colectivo vigente.
// Exportado para que el editor use el mismo default al agregar una nueva
// categoría de mano de obra a un APU.
export const JORNAL: Record<CategoriaManoObra, number> = {
  Operario: 84,
  Oficial: 74,
  Peón: 66,
};

function herramientas3pct(): ApuEquipoItem {
  return { insumo: "Herramientas manuales", pctManoObra: 0.03 };
}

// --- Plantillas por tipo de partida --------------------------------------
// Cobertura: estructura (concreto, concreto ciclópeo, acero, encofrado,
// excavación, relleno, eliminación, refine) y acabados (tarrajeo, muro de
// albañilería/tabique, contrapiso, pisos cerámico/porcelanato/cemento
// pulido/vinílico, pintura). Una partida sin plantilla (ej. movilización —
// es una suma alzada, no tiene sentido un APU por unidad) simplemente no
// trae APU por defecto — sigue funcionando como hoy (precio unitario manual
// + % referencial por categoría).

function apuConcreto(): ApuDef {
  return {
    materiales: [
      { insumo: "Cemento Portland Tipo I", unidad: "bolsas", cantidad: 9.2, precio: 26 },
      { insumo: "Arena gruesa", unidad: "m³", cantidad: 0.48, precio: 90 },
      { insumo: "Piedra chancada 1/2\"", unidad: "m³", cantidad: 0.72, precio: 95 },
      { insumo: "Agua", unidad: "m³", cantidad: 0.186, precio: 5 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 20, jornal: JORNAL.Operario },
      { categoria: "Oficial", cuadrilla: 1, rendimiento: 20, jornal: JORNAL.Oficial },
      { categoria: "Peón", cuadrilla: 6, rendimiento: 20, jornal: JORNAL.Peón },
    ],
    equipos: [
      { insumo: "Vibradora de concreto 4HP", cantidad: 0.05, precio: 180 },
      { insumo: "Mezcladora de concreto 11p3", cantidad: 0.05, precio: 220 },
      herramientas3pct(),
    ],
  };
}

function apuAceroHabilitadoYColocado(): ApuDef {
  return {
    materiales: [
      { insumo: "Acero corrugado fy=4200", unidad: "kg", cantidad: 1.05, precio: 4.8 },
      { insumo: "Alambre negro N°16", unidad: "kg", cantidad: 0.05, precio: 5.5 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 250, jornal: JORNAL.Operario },
      { categoria: "Oficial", cuadrilla: 1, rendimiento: 250, jornal: JORNAL.Oficial },
    ],
    equipos: [herramientas3pct()],
  };
}

function apuEncofrado(): ApuDef {
  return {
    materiales: [
      { insumo: "Madera tornillo", unidad: "p2", cantidad: 6.5, precio: 5.2 },
      { insumo: "Clavos para madera", unidad: "kg", cantidad: 0.25, precio: 5 },
      { insumo: "Desmoldante", unidad: "gal", cantidad: 0.05, precio: 28 },
      { insumo: "Alambre negro N°8", unidad: "kg", cantidad: 0.2, precio: 5.5 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 12, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 1, rendimiento: 12, jornal: JORNAL.Peón },
    ],
    equipos: [herramientas3pct()],
  };
}

function apuExcavacion(): ApuDef {
  return {
    materiales: [],
    manoObra: [{ categoria: "Peón", cuadrilla: 1, rendimiento: 4, jornal: JORNAL.Peón }],
    equipos: [herramientas3pct()],
  };
}

function apuTarrajeo(): ApuDef {
  return {
    materiales: [
      { insumo: "Cemento Portland Tipo I", unidad: "bolsas", cantidad: 0.22, precio: 26 },
      { insumo: "Arena fina", unidad: "m³", cantidad: 0.018, precio: 95 },
      { insumo: "Agua", unidad: "m³", cantidad: 0.006, precio: 5 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 12, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 0.5, rendimiento: 12, jornal: JORNAL.Peón },
    ],
    equipos: [herramientas3pct()],
  };
}

// Cielorraso con yeso: enlucido directo sobre el fondo de losa, sin el
// mortero cemento-arena del tarrajeo — pasta de yeso aplicada en una sola
// capa delgada.
function apuCielorrasoYeso(): ApuDef {
  return {
    materiales: [
      { insumo: "Yeso en bolsas", unidad: "bolsas", cantidad: 0.5, precio: 18 },
      { insumo: "Agua", unidad: "m³", cantidad: 0.004, precio: 5 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 18, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 0.5, rendimiento: 18, jornal: JORNAL.Peón },
    ],
    equipos: [herramientas3pct()],
  };
}

// Concreto ciclópeo (f'c=140 + % P.G.): NO reusar apuConcreto() — al llevar
// piedra grande reemplazando parte del volumen, consume bastante menos
// cemento por m³ que un concreto estructural normal.
function apuConcretoCiclopeo(): ApuDef {
  return {
    materiales: [
      { insumo: "Cemento Portland Tipo I", unidad: "bolsas", cantidad: 6.4, precio: 26 },
      { insumo: "Arena gruesa", unidad: "m³", cantidad: 0.34, precio: 90 },
      { insumo: "Piedra chancada 1/2\"", unidad: "m³", cantidad: 0.5, precio: 95 },
      { insumo: "Piedra grande (P.G.)", unidad: "m³", cantidad: 0.3, precio: 40 },
      { insumo: "Agua", unidad: "m³", cantidad: 0.13, precio: 5 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 18, jornal: JORNAL.Operario },
      { categoria: "Oficial", cuadrilla: 1, rendimiento: 18, jornal: JORNAL.Oficial },
      { categoria: "Peón", cuadrilla: 5, rendimiento: 18, jornal: JORNAL.Peón },
    ],
    equipos: [{ insumo: "Mezcladora de concreto 11p3", cantidad: 0.06, precio: 220 }, herramientas3pct()],
  };
}

function apuRelleno(): ApuDef {
  return {
    materiales: [],
    manoObra: [
      { categoria: "Operario", cuadrilla: 0.25, rendimiento: 15, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 2, rendimiento: 15, jornal: JORNAL.Peón },
    ],
    equipos: [
      { insumo: "Compactadora vibratoria tipo plancha 4HP", cantidad: 0.07, precio: 150 },
      herramientas3pct(),
    ],
  };
}

function apuEliminacion(): ApuDef {
  return {
    materiales: [],
    manoObra: [{ categoria: "Peón", cuadrilla: 4, rendimiento: 40, jornal: JORNAL.Peón }],
    equipos: [
      { insumo: "Volquete 15 m³ (flete a botadero)", cantidad: 0.05, precio: 180 },
      herramientas3pct(),
    ],
  };
}

function apuRefine(): ApuDef {
  return {
    materiales: [],
    manoObra: [{ categoria: "Peón", cuadrilla: 1, rendimiento: 25, jornal: JORNAL.Peón }],
    equipos: [herramientas3pct()],
  };
}

// Mismo template para muro portante (soga) y tabique no portante — la
// diferencia estructural (columnetas/solera de confinamiento) ya es otra
// partida de concreto/encofrado, detectada aparte.
function apuMuroAlbanileria(): ApuDef {
  return {
    materiales: [
      { insumo: "Ladrillo King Kong 18 huecos", unidad: "und", cantidad: 39, precio: 0.75 },
      { insumo: "Cemento Portland Tipo I", unidad: "bolsas", cantidad: 0.23, precio: 26 },
      { insumo: "Arena gruesa", unidad: "m³", cantidad: 0.032, precio: 90 },
      { insumo: "Agua", unidad: "m³", cantidad: 0.006, precio: 5 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 9, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 0.75, rendimiento: 9, jornal: JORNAL.Peón },
    ],
    equipos: [herramientas3pct()],
  };
}

function apuPintura(): ApuDef {
  return {
    materiales: [
      { insumo: "Pintura látex", unidad: "gal", cantidad: 0.04, precio: 70 },
      { insumo: "Sellador/Imprimante", unidad: "gal", cantidad: 0.02, precio: 55 },
      { insumo: "Lija", unidad: "und", cantidad: 0.1, precio: 2 },
    ],
    manoObra: [{ categoria: "Operario", cuadrilla: 1, rendimiento: 25, jornal: JORNAL.Operario }],
    equipos: [herramientas3pct()],
  };
}

// Solado: capa pobre de concreto 1:12 (cemento:hormigón), e=4" (10cm), sobre
// el fondo nivelado de la excavación de zapatas/vigas de cimentación — no es
// estructural, solo nivela y evita que el concreto de la cimentación se
// contamine con el terreno. Dosificación referencial de mezcla pobre.
function apuSolado(): ApuDef {
  return {
    materiales: [
      { insumo: "Cemento Portland Tipo I", unidad: "bolsas", cantidad: 0.45, precio: 26 },
      { insumo: "Hormigón (piedra + arena)", unidad: "m³", cantidad: 0.105, precio: 85 },
      { insumo: "Agua", unidad: "m³", cantidad: 0.018, precio: 5 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 40, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 2, rendimiento: 40, jornal: JORNAL.Peón },
    ],
    equipos: [herramientas3pct()],
  };
}

function apuContrapiso(): ApuDef {
  return {
    materiales: [
      { insumo: "Cemento Portland Tipo I", unidad: "bolsas", cantidad: 0.4, precio: 26 },
      { insumo: "Arena gruesa", unidad: "m³", cantidad: 0.035, precio: 90 },
      { insumo: "Agua", unidad: "m³", cantidad: 0.012, precio: 5 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 15, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 1, rendimiento: 15, jornal: JORNAL.Peón },
    ],
    equipos: [herramientas3pct()],
  };
}

function apuPisoCeramico(): ApuDef {
  return {
    materiales: [
      { insumo: "Cerámico 30x30cm", unidad: "m²", cantidad: 1.05, precio: 35 },
      { insumo: "Pegamento para cerámico", unidad: "kg", cantidad: 5, precio: 2.2 },
      { insumo: "Fragua (porcelana para junta)", unidad: "kg", cantidad: 0.5, precio: 4 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 12, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 0.5, rendimiento: 12, jornal: JORNAL.Peón },
    ],
    equipos: [herramientas3pct()],
  };
}

// Contrazócalo cerámico h=0.10m: se mide y precia por metro lineal, no por
// m² (franja angosta al pie del muro) — la cantidad de cerámico es la misma
// pieza del piso, recortada en tiras de 10cm de alto.
function apuContrazocalo(): ApuDef {
  return {
    materiales: [
      { insumo: "Cerámico 30x30cm (recortado en tiras)", unidad: "m", cantidad: 0.35, precio: 12 },
      { insumo: "Pegamento para cerámico", unidad: "kg", cantidad: 1, precio: 2.2 },
      { insumo: "Fragua (porcelana para junta)", unidad: "kg", cantidad: 0.1, precio: 4 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 20, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 0.5, rendimiento: 20, jornal: JORNAL.Peón },
    ],
    equipos: [herramientas3pct()],
  };
}

function apuPisoPorcelanato(): ApuDef {
  return {
    materiales: [
      { insumo: "Porcelanato 60x60cm", unidad: "m²", cantidad: 1.08, precio: 65 },
      { insumo: "Pegamento para porcelanato", unidad: "kg", cantidad: 5, precio: 2.8 },
      { insumo: "Fragua (porcelana para junta)", unidad: "kg", cantidad: 0.3, precio: 4.5 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 10, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 0.5, rendimiento: 10, jornal: JORNAL.Peón },
    ],
    equipos: [herramientas3pct()],
  };
}

function apuPisoCementoPulido(): ApuDef {
  return {
    materiales: [
      { insumo: "Cemento Portland Tipo I", unidad: "bolsas", cantidad: 0.45, precio: 26 },
      { insumo: "Arena gruesa", unidad: "m³", cantidad: 0.04, precio: 90 },
      { insumo: "Endurecedor de piso", unidad: "kg", cantidad: 1, precio: 4 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 20, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 1, rendimiento: 20, jornal: JORNAL.Peón },
    ],
    equipos: [herramientas3pct()],
  };
}

function apuPisoVinilico(): ApuDef {
  return {
    materiales: [
      { insumo: "Piso vinílico (losetas/rollo)", unidad: "m²", cantidad: 1.08, precio: 45 },
      { insumo: "Pegamento para vinílico", unidad: "kg", cantidad: 0.3, precio: 12 },
    ],
    manoObra: [{ categoria: "Operario", cuadrilla: 1, rendimiento: 25, jornal: JORNAL.Operario }],
    equipos: [herramientas3pct()],
  };
}

// Obras provisionales y trabajos preliminares — partidas previas al inicio
// de obra, casi todas intensivas en mano de obra con materiales menores.
function apuCartelObra(): ApuDef {
  return {
    materiales: [
      { insumo: "Gigantografía en banner", unidad: "m²", cantidad: 6, precio: 25 },
      { insumo: "Madera tornillo (estructura de soporte)", unidad: "p2", cantidad: 40, precio: 5.2 },
      { insumo: "Clavos para madera", unidad: "kg", cantidad: 1, precio: 5 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 1, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 1, rendimiento: 1, jornal: JORNAL.Peón },
    ],
    equipos: [herramientas3pct()],
  };
}

function apuCercoObra(): ApuDef {
  return {
    materiales: [
      { insumo: "Triplay/calamina para cerco", unidad: "m²", cantidad: 2.2, precio: 18 },
      { insumo: "Madera tornillo (parantes y travesaños)", unidad: "p2", cantidad: 8, precio: 5.2 },
      { insumo: "Clavos para madera", unidad: "kg", cantidad: 0.15, precio: 5 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 15, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 1, rendimiento: 15, jornal: JORNAL.Peón },
    ],
    equipos: [herramientas3pct()],
  };
}

function apuTrazoReplanteo(): ApuDef {
  return {
    materiales: [
      { insumo: "Yeso en bolsas (trazo)", unidad: "bolsas", cantidad: 0.02, precio: 18 },
      { insumo: "Cal en bolsas (trazo)", unidad: "bolsas", cantidad: 0.01, precio: 12 },
      { insumo: "Madera tornillo (estacas)", unidad: "p2", cantidad: 0.15, precio: 5.2 },
    ],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 450, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 2, rendimiento: 450, jornal: JORNAL.Peón },
    ],
    equipos: [herramientas3pct()],
  };
}

// Carpintería y vidrios: precio de la unidad instalada (incluye su mano de
// obra de instalación, no solo el insumo).
function apuPuertaMadera(): ApuDef {
  return {
    materiales: [{ insumo: "Puerta contraplacada de madera (con marco)", unidad: "und", cantidad: 1, precio: 280 }],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 4, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 0.5, rendimiento: 4, jornal: JORNAL.Peón },
    ],
    equipos: [herramientas3pct()],
  };
}

function apuVentanaMadera(): ApuDef {
  return {
    materiales: [{ insumo: "Ventana de madera (con marco, sin vidrio)", unidad: "und", cantidad: 1, precio: 180 }],
    manoObra: [
      { categoria: "Operario", cuadrilla: 1, rendimiento: 5, jornal: JORNAL.Operario },
      { categoria: "Peón", cuadrilla: 0.5, rendimiento: 5, jornal: JORNAL.Peón },
    ],
    equipos: [herramientas3pct()],
  };
}

function apuVidrioSimple(): ApuDef {
  return {
    materiales: [{ insumo: "Vidrio simple incoloro 4mm", unidad: "m²", cantidad: 1.05, precio: 45 }],
    manoObra: [{ categoria: "Operario", cuadrilla: 1, rendimiento: 15, jornal: JORNAL.Operario }],
    equipos: [herramientas3pct()],
  };
}

function apuCerraduraPerilla(): ApuDef {
  return {
    materiales: [{ insumo: "Cerradura de perilla", unidad: "und", cantidad: 1, precio: 35 }],
    manoObra: [{ categoria: "Operario", cuadrilla: 1, rendimiento: 10, jornal: JORNAL.Operario }],
    equipos: [herramientas3pct()],
  };
}

function apuLimpiezaObra(): ApuDef {
  return {
    materiales: [],
    manoObra: [{ categoria: "Peón", cuadrilla: 1, rendimiento: 100, jornal: JORNAL.Peón }],
    equipos: [herramientas3pct()],
  };
}

// Detecta el tipo de partida por su texto (mismo criterio por regex que
// categorizarPartida en dashboardCharts.ts y volumenEfectivoConcreto en
// materiales.ts) y devuelve su plantilla — así un APU por defecto cubre
// TODAS las partidas de ese tipo (ej. concreto en columnas, en vigas, en
// zapatas...) sin repetir una plantilla por cada texto exacto de partida.
//
// Si se agrega un tipo de partida nuevo a algún módulo (ej. una partida de
// acabado que hoy no existe), hay que sumar aquí su propio chequeo — el
// matching es por texto/unidad, no se detecta solo.
export function defaultApuFor(partida: string, unidad: string): ApuDef | null {
  // Más específico primero: concreto ciclópeo NO debe caer en la plantilla
  // de concreto estructural normal (consume mucho menos cemento).
  if (unidad === "m³" && /concreto\s+cicl[oó]peo/i.test(partida)) return apuConcretoCiclopeo();
  if (unidad === "m³" && /concreto/i.test(partida) && /f'?c\s*=\s*\d+/i.test(partida)) return apuConcreto();
  if (unidad === "kg" && /acero/i.test(partida)) return apuAceroHabilitadoYColocado();
  if (unidad === "m²" && /encofrado/i.test(partida)) return apuEncofrado();
  if (unidad === "m³" && /excavaci[oó]n/i.test(partida)) return apuExcavacion();
  if (unidad === "m³" && /relleno.*compactado/i.test(partida)) return apuRelleno();
  if (unidad === "m³" && /eliminaci[oó]n de material excedente/i.test(partida)) return apuEliminacion();
  if (unidad === "m²" && /refine.*nivelaci[oó]n/i.test(partida)) return apuRefine();
  if (unidad === "m²" && /solado/i.test(partida)) return apuSolado();
  if (unidad === "m²" && /contrapiso/i.test(partida)) return apuContrapiso();
  if (unidad === "m²" && /tarrajeo/i.test(partida) && /mezcla\s+C:A/i.test(partida)) return apuTarrajeo();
  if (unidad === "m²" && /cielorraso/i.test(partida) && /yeso/i.test(partida)) return apuCielorrasoYeso();
  if (unidad === "m²" && (/muro de soga/i.test(partida) || /tabique de alba/i.test(partida))) return apuMuroAlbanileria();
  if (unidad === "m²" && /pintura/i.test(partida)) return apuPintura();
  if (unidad === "m" && /contrazócalo|contrazocalo/i.test(partida)) return apuContrazocalo();
  if (unidad === "m²" && /cer[aá]mico/i.test(partida)) return apuPisoCeramico();
  if (unidad === "m²" && /porcelanato/i.test(partida)) return apuPisoPorcelanato();
  if (unidad === "m²" && /cemento pulido/i.test(partida)) return apuPisoCementoPulido();
  if (unidad === "m²" && /vin[ií]lico/i.test(partida)) return apuPisoVinilico();
  if (unidad === "und" && /cartel de identificaci[oó]n/i.test(partida)) return apuCartelObra();
  if (unidad === "m" && /cerco de obra/i.test(partida)) return apuCercoObra();
  if (unidad === "m²" && /trazos?,?\s*niveles\s*y\s*replanteo/i.test(partida)) return apuTrazoReplanteo();
  if (unidad === "m²" && /limpieza/i.test(partida)) return apuLimpiezaObra();
  if (unidad === "und" && /puerta/i.test(partida) && /madera/i.test(partida)) return apuPuertaMadera();
  if (unidad === "und" && /ventana/i.test(partida) && /madera/i.test(partida)) return apuVentanaMadera();
  if (unidad === "m²" && /vidrio/i.test(partida)) return apuVidrioSimple();
  if (unidad === "und" && /cerradura/i.test(partida)) return apuCerraduraPerilla();
  return null;
}

// null = el usuario desactivó explícitamente el APU de esta partida (vuelve
// a precio manual, aunque exista una plantilla por defecto para su tipo).
export type ApuOverrides = Record<string, ApuDef | null>;

// APU efectivo de una partida: el que el usuario personalizó o desactivó, si
// hay una entrada; si no, la plantilla por defecto; si tampoco hay
// plantilla, null (la partida sigue con precio manual, como hoy).
export function resolveApu(key: string, partida: string, unidad: string, overrides: ApuOverrides): ApuDef | null {
  if (key in overrides) return overrides[key];
  return defaultApuFor(partida, unidad);
}

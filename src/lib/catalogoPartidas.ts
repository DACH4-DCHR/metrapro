// Catálogo de referencia de partidas, por capítulo — mismo orden, títulos y
// numeración que una estructura de presupuesto típica de edificación en Perú
// (equivalente a lo que trae cualquier plantilla S10). Es solo una guía de
// navegación: cada partida que YA tiene un módulo calculado en MetraPro lleva
// la ruta de ese módulo; las que no, se cargan a mano en Presupuesto
// ("Agregar partida") mientras no exista un módulo propio.
export interface PartidaCatalogo {
  codigo: string;
  descripcion: string;
  unidad: string;
  // Ruta del módulo de MetraPro que ya calcula esta partida, si existe.
  modulo?: { label: string; path: string };
}

export interface CapituloCatalogo {
  codigo: string;
  titulo: string;
  partidas: PartidaCatalogo[];
}

export const CATALOGO_PARTIDAS: CapituloCatalogo[] = [
  {
    codigo: "01",
    titulo: "Obras Provisionales y Trabajos Preliminares",
    partidas: [
      {
        codigo: "01.01",
        descripcion: "Cartel de identificación de la obra",
        unidad: "und",
        modulo: { label: "Obras Provisionales", path: "/obras-provisionales" },
      },
      {
        codigo: "01.02",
        descripcion: "Cerco de obra",
        unidad: "m",
        modulo: { label: "Obras Provisionales", path: "/obras-provisionales" },
      },
      {
        codigo: "01.03",
        descripcion: "Trazos, niveles y replanteo",
        unidad: "m²",
        modulo: { label: "Obras Provisionales", path: "/obras-provisionales" },
      },
      { codigo: "01.04", descripcion: "Trazo, niveles y replanteo preliminar", unidad: "m²" },
    ],
  },
  {
    codigo: "02",
    titulo: "Movimiento de Tierras",
    partidas: [
      { codigo: "02.01", descripcion: "Nivelación de terreno", unidad: "m²" },
      { codigo: "02.02", descripcion: "Excavación masiva", unidad: "m³" },
      { codigo: "02.03", descripcion: "Excavación para zapatas", unidad: "m³", modulo: { label: "Zapatas", path: "/zapatas" } },
      {
        codigo: "02.04",
        descripcion: "Excavación para cimientos corridos",
        unidad: "m³",
        modulo: { label: "Cimiento Corrido", path: "/cimiento-corrido" },
      },
      {
        codigo: "02.05",
        descripcion: "Relleno con material propio compactado",
        unidad: "m³",
        modulo: { label: "Movimiento de Tierras", path: "/movimiento-tierras" },
      },
      { codigo: "02.06", descripcion: "Nivelación interior y apisonado", unidad: "m²" },
      {
        codigo: "02.07",
        descripcion: "Eliminación de material excedente",
        unidad: "m³",
        modulo: { label: "Movimiento de Tierras", path: "/movimiento-tierras" },
      },
    ],
  },
  {
    codigo: "03",
    titulo: "Obras de Concreto Simple",
    partidas: [
      {
        codigo: "03.01",
        descripcion: "Cimientos corridos",
        unidad: "m³",
        modulo: { label: "Cimiento Corrido", path: "/cimiento-corrido" },
      },
      {
        codigo: "03.02",
        descripcion: "Solado",
        unidad: "m²",
        modulo: { label: "Zapatas / Vigas de Cimentación", path: "/zapatas" },
      },
      { codigo: "03.03", descripcion: "Sobrecimientos", unidad: "m³", modulo: { label: "Sobrecimiento", path: "/sobrecimiento" } },
      {
        codigo: "03.04",
        descripcion: "Falso piso",
        unidad: "m²",
        modulo: { label: "Pisos y Pavimentos (Contrapiso)", path: "/pisos-pavimentos" },
      },
    ],
  },
  {
    codigo: "04",
    titulo: "Obras de Concreto Armado",
    partidas: [
      {
        codigo: "04.01.01",
        descripcion: "Zapatas — concreto f'c=210 kg/cm²",
        unidad: "m³",
        modulo: { label: "Zapatas", path: "/zapatas" },
      },
      {
        codigo: "04.01.02",
        descripcion: "Zapatas — encofrado y desencofrado",
        unidad: "m²",
        modulo: { label: "Zapatas", path: "/zapatas" },
      },
      {
        codigo: "04.01.03",
        descripcion: "Zapatas — acero de refuerzo fy=4200",
        unidad: "kg",
        modulo: { label: "Zapatas", path: "/zapatas" },
      },
      {
        codigo: "04.02.01",
        descripcion: "Vigas de cimentación — concreto f'c=210",
        unidad: "m³",
        modulo: { label: "Vigas de Cimentación", path: "/vigas-cimentacion" },
      },
      {
        codigo: "04.02.02",
        descripcion: "Vigas de cimentación — encofrado",
        unidad: "m²",
        modulo: { label: "Vigas de Cimentación", path: "/vigas-cimentacion" },
      },
      {
        codigo: "04.02.03",
        descripcion: "Vigas de cimentación — acero",
        unidad: "kg",
        modulo: { label: "Vigas de Cimentación", path: "/vigas-cimentacion" },
      },
      {
        codigo: "04.03.01",
        descripcion: "Columnas — concreto f'c=210 kg/cm²",
        unidad: "m³",
        modulo: { label: "Columnas", path: "/columnas" },
      },
      {
        codigo: "04.03.02",
        descripcion: "Columnas — encofrado y desencofrado",
        unidad: "m²",
        modulo: { label: "Columnas", path: "/columnas" },
      },
      {
        codigo: "04.03.03",
        descripcion: "Columnas — acero de refuerzo fy=4200",
        unidad: "kg",
        modulo: { label: "Columnas", path: "/columnas" },
      },
      { codigo: "04.04.01", descripcion: "Vigas — concreto f'c=210 kg/cm²", unidad: "m³", modulo: { label: "Vigas", path: "/vigas" } },
      {
        codigo: "04.04.02",
        descripcion: "Vigas — encofrado y desencofrado",
        unidad: "m²",
        modulo: { label: "Vigas", path: "/vigas" },
      },
      {
        codigo: "04.04.03",
        descripcion: "Vigas — acero de refuerzo fy=4200",
        unidad: "kg",
        modulo: { label: "Vigas", path: "/vigas" },
      },
      {
        codigo: "04.05.01",
        descripcion: "Losa aligerada — concreto f'c=210",
        unidad: "m³",
        modulo: { label: "Losa Aligerada", path: "/losa-aligerada" },
      },
      {
        codigo: "04.05.02",
        descripcion: "Losa aligerada — encofrado y desencofrado",
        unidad: "m²",
        modulo: { label: "Losa Aligerada", path: "/losa-aligerada" },
      },
      {
        codigo: "04.05.03",
        descripcion: "Losa aligerada — acero de refuerzo",
        unidad: "kg",
        modulo: { label: "Losa Aligerada", path: "/losa-aligerada" },
      },
      {
        codigo: "04.05.04",
        descripcion: "Losa aligerada — ladrillo de techo 15x30x30",
        unidad: "und",
        modulo: { label: "Losa Aligerada", path: "/losa-aligerada" },
      },
      {
        codigo: "04.06.01",
        descripcion: "Escalera — concreto f'c=210",
        unidad: "m³",
        modulo: { label: "Escaleras", path: "/escaleras" },
      },
      {
        codigo: "04.06.02",
        descripcion: "Escalera — encofrado y desencofrado",
        unidad: "m²",
        modulo: { label: "Escaleras", path: "/escaleras" },
      },
      {
        codigo: "04.06.03",
        descripcion: "Escalera — acero de refuerzo",
        unidad: "kg",
        modulo: { label: "Escaleras", path: "/escaleras" },
      },
    ],
  },
  {
    codigo: "05",
    titulo: "Arquitectura — Muros y Tabiques",
    partidas: [
      {
        codigo: "05.01",
        descripcion: "Muro de ladrillo King Kong de arcilla, aparejo de soga",
        unidad: "m²",
        modulo: { label: "Muros de Arquitectura", path: "/muros-arquitectura" },
      },
      {
        codigo: "05.02",
        descripcion: "Muro de ladrillo pandereta, aparejo de soga",
        unidad: "m²",
        modulo: { label: "Muros de Arquitectura", path: "/muros-arquitectura" },
      },
    ],
  },
  {
    codigo: "06",
    titulo: "Arquitectura — Revoques y Enlucidos",
    partidas: [
      {
        codigo: "06.01",
        descripcion: "Tarrajeo en interiores",
        unidad: "m²",
        modulo: { label: "Tarrajeo de Interiores", path: "/acabados" },
      },
      {
        codigo: "06.02",
        descripcion: "Tarrajeo en exteriores",
        unidad: "m²",
        modulo: { label: "Tarrajeo de Exteriores", path: "/tarrajeo-exteriores" },
      },
      {
        codigo: "06.03",
        descripcion: "Tarrajeo en columnas",
        unidad: "m²",
        modulo: { label: "Tarrajeo de Interiores", path: "/acabados" },
      },
      {
        codigo: "06.04",
        descripcion: "Tarrajeo en vigas",
        unidad: "m²",
        modulo: { label: "Tarrajeo de Interiores", path: "/acabados" },
      },
      {
        codigo: "06.05",
        descripcion: "Vestidura de derrames",
        unidad: "m",
        modulo: { label: "Tarrajeo de Interiores", path: "/acabados" },
      },
    ],
  },
  {
    codigo: "07",
    titulo: "Arquitectura — Cielorrasos",
    partidas: [
      {
        codigo: "07.01",
        descripcion: "Cielorraso con yeso",
        unidad: "m²",
        modulo: { label: "Cielorraso", path: "/cielorraso" },
      },
    ],
  },
  {
    codigo: "08",
    titulo: "Arquitectura — Pisos y Pavimentos",
    partidas: [
      {
        codigo: "08.01",
        descripcion: "Contrapiso e=48 mm",
        unidad: "m²",
        modulo: { label: "Pisos y Pavimentos", path: "/pisos-pavimentos" },
      },
      {
        codigo: "08.02",
        descripcion: "Piso cerámico 0.45x0.45 m",
        unidad: "m²",
        modulo: { label: "Pisos y Pavimentos", path: "/pisos-pavimentos" },
      },
      {
        codigo: "08.03",
        descripcion: "Piso de concreto pulido",
        unidad: "m²",
        modulo: { label: "Pisos y Pavimentos", path: "/pisos-pavimentos" },
      },
    ],
  },
  {
    codigo: "09",
    titulo: "Arquitectura — Zócalos y Contrazócalos",
    partidas: [
      {
        codigo: "09.01",
        descripcion: "Zócalo cerámico h=1.20 m",
        unidad: "m²",
        modulo: { label: "Pisos y Pavimentos", path: "/pisos-pavimentos" },
      },
      {
        codigo: "09.02",
        descripcion: "Contrazócalo cerámico h=0.10 m",
        unidad: "m",
        modulo: { label: "Pisos y Pavimentos", path: "/pisos-pavimentos" },
      },
    ],
  },
  {
    codigo: "10",
    titulo: "Arquitectura — Carpintería y Vidrios",
    partidas: [
      {
        codigo: "10.01",
        descripcion: "Puerta contraplacada de madera",
        unidad: "und",
        modulo: { label: "Carpintería y Vidrios", path: "/carpinteria" },
      },
      {
        codigo: "10.02",
        descripcion: "Ventana de madera",
        unidad: "und",
        modulo: { label: "Carpintería y Vidrios", path: "/carpinteria" },
      },
      {
        codigo: "10.03",
        descripcion: "Vidrio simple incoloro",
        unidad: "m²",
        modulo: { label: "Carpintería y Vidrios", path: "/carpinteria" },
      },
      {
        codigo: "10.04",
        descripcion: "Cerradura de perilla para puerta",
        unidad: "und",
        modulo: { label: "Carpintería y Vidrios", path: "/carpinteria" },
      },
    ],
  },
  {
    codigo: "11",
    titulo: "Arquitectura — Pintura",
    partidas: [
      {
        codigo: "11.01",
        descripcion: "Pintura látex en cielorrasos, vigas, columnas y paredes",
        unidad: "m²",
        modulo: { label: "Pintura", path: "/pintura" },
      },
      { codigo: "11.02", descripcion: "Pintura de puertas", unidad: "m²" },
    ],
  },
  {
    codigo: "12",
    titulo: "Instalaciones Sanitarias",
    partidas: [
      { codigo: "12.01", descripcion: "Suministro de aparatos sanitarios", unidad: "und" },
      { codigo: "12.02", descripcion: "Instalación de aparatos sanitarios", unidad: "und" },
      { codigo: "12.03", descripcion: "Salida de agua fría", unidad: "pto" },
      { codigo: "12.04", descripcion: "Red de distribución de agua fría PVC", unidad: "m" },
      { codigo: "12.05", descripcion: "Salida de desagüe PVC", unidad: "pto" },
      { codigo: "12.06", descripcion: "Red de derivación de desagüe PVC", unidad: "m" },
    ],
  },
  {
    codigo: "13",
    titulo: "Instalaciones Eléctricas",
    partidas: [
      { codigo: "13.01", descripcion: "Salida para alumbrado en techo", unidad: "pto" },
      { codigo: "13.02", descripcion: "Salida para tomacorriente bipolar doble", unidad: "pto" },
      { codigo: "13.03", descripcion: "Tubería PVC-SEL Ø 20 mm", unidad: "m" },
      { codigo: "13.04", descripcion: "Conductor THW 2.5 mm²", unidad: "m" },
      { codigo: "13.05", descripcion: "Tablero de distribución", unidad: "und" },
      { codigo: "13.06", descripcion: "Pozo de puesta a tierra", unidad: "und" },
      { codigo: "13.07", descripcion: "Artefacto de iluminación", unidad: "und" },
    ],
  },
  {
    codigo: "14",
    titulo: "Varios y Trabajos Finales",
    partidas: [
      {
        codigo: "14.01",
        descripcion: "Limpieza permanente de obra",
        unidad: "m²",
        modulo: { label: "Obras Provisionales", path: "/obras-provisionales" },
      },
      {
        codigo: "14.02",
        descripcion: "Limpieza final de obra",
        unidad: "m²",
        modulo: { label: "Obras Provisionales", path: "/obras-provisionales" },
      },
    ],
  },
];

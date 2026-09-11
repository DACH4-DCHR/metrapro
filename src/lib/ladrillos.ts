// Catálogo referencial de unidades de albañilería (ladrillos) de uso común en el
// mercado peruano para tabiquería / muros de arquitectura (no portantes). Las
// dimensiones son valores nominales típicos — pueden variar por fabricante y zona,
// por eso siempre se deja la opción "Personalizado" para ingresar la ficha técnica
// real del proveedor.

export interface LadrilloCatalogItem {
  id: string;
  label: string;
  largoCm: number; // dimensión horizontal visible en la cara del muro
  altoCm: number; // dimensión vertical visible en la cara del muro
  anchoCm: number; // espesor de la unidad (suele coincidir con el espesor del muro)
  usoTipico: string;
}

export const LADRILLO_PERSONALIZADO_ID = "personalizado";

export const LADRILLOS_PERU: LadrilloCatalogItem[] = [
  {
    id: "pandereta",
    label: "Pandereta",
    largoCm: 24,
    altoCm: 9,
    anchoCm: 11,
    usoTipico: "Tabiquería no portante — el más usado en Lima para muros de arquitectura",
  },
  {
    id: "hueco6",
    label: "Hueco 6",
    largoCm: 24,
    altoCm: 12,
    anchoCm: 6,
    usoTipico: "Tabiques delgados de 6 cm",
  },
  {
    id: "hueco8",
    label: "Hueco 8",
    largoCm: 24,
    altoCm: 12,
    anchoCm: 8,
    usoTipico: "Tabiques de 8 cm",
  },
  {
    id: "hueco10",
    label: "Hueco 10",
    largoCm: 24,
    altoCm: 12,
    anchoCm: 10,
    usoTipico: "Tabiques de 10 cm",
  },
  {
    id: "hueco12",
    label: "Hueco 12",
    largoCm: 24,
    altoCm: 12,
    anchoCm: 12,
    usoTipico: "Tabiques de 12 cm",
  },
  {
    id: "hueco15",
    label: "Hueco 15",
    largoCm: 24,
    altoCm: 12,
    anchoCm: 15,
    usoTipico: "Tabiques de 15 cm",
  },
  {
    id: "kingkong18h",
    label: "King Kong 18 huecos",
    largoCm: 24,
    altoCm: 9,
    anchoCm: 13,
    usoTipico: "Muros de cerco o tabiques gruesos no estructurales",
  },
  {
    id: "kingkongIndustrial",
    label: "King Kong Industrial",
    largoCm: 24,
    altoCm: 9,
    anchoCm: 14,
    usoTipico: "Alternativa maciza al King Kong 18 huecos",
  },
  {
    id: "bloqueta9",
    label: "Bloqueta de concreto 9",
    largoCm: 39,
    altoCm: 19,
    anchoCm: 9,
    usoTipico: "Tabiquería con bloque de concreto vibrado",
  },
  {
    id: "bloqueta14",
    label: "Bloqueta de concreto 14",
    largoCm: 39,
    altoCm: 19,
    anchoCm: 14,
    usoTipico: "Muros de cerco con bloque de concreto vibrado",
  },
];

export function getLadrillo(id: string): LadrilloCatalogItem | undefined {
  return LADRILLOS_PERU.find((l) => l.id === id);
}

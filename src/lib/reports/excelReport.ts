// Generador de reportes Excel en formato SpreadsheetML (XML nativo de Excel).
// Se evita la librería "xlsx" (SheetJS) por vulnerabilidades conocidas de seguridad
// en su parser; como aquí solo generamos archivos (no leemos xlsx de terceros),
// este formato XML simple es seguro, no requiere dependencias y Excel lo abre nativamente.
import type { CalculatedElement, MetradoLine } from "../types";
import {
  calcularPresupuesto,
  agruparPresupuestoPorModulo,
  valorizarLineas,
  buildPresupuestoFootRows,
  type PresupuestoTotales,
  type PresupuestoModuloGroup,
  type PresupuestoRow,
} from "../presupuesto";
import { agruparAceroPorModulo } from "../calc/aceroResumen";
import { MODULE_LABELS } from "../moduleLabels";
import { costosPorCategoria, cantidadesPorModulo } from "../dashboardCharts";

export interface ExcelSheet {
  name: string;
  headers: string[];
  rows: (string | number)[][];
  numericCols?: number[];
  // Índices (0-based) de filas que van en negrita — separadores de módulo y
  // subtotales, sin necesitar una hoja o tabla aparte para cada uno.
  boldRows?: number[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cellXml(value: string | number, isNumeric: boolean, styleId?: string): string {
  const styleAttr = styleId ? ` ss:StyleID="${styleId}"` : "";
  if (isNumeric && typeof value === "number" && Number.isFinite(value)) {
    return `<Cell${styleAttr}><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell${styleAttr}><Data ss:Type="String">${escapeXml(String(value))}</Data></Cell>`;
}

function sheetXml(sheet: ExcelSheet): string {
  const numeric = new Set(sheet.numericCols ?? []);
  const bold = new Set(sheet.boldRows ?? []);
  const headerCells = sheet.headers.map((h) => cellXml(h, false, "header")).join("");
  const dataRows = sheet.rows
    .map((row, rowIdx) => {
      const isBoldRow = bold.has(rowIdx);
      const cells = row
        .map((val, i) => {
          const isNumericValue = numeric.has(i) && typeof val === "number";
          const styleId = isNumericValue ? (isBoldRow ? "numberBold" : "number") : isBoldRow ? "bold" : undefined;
          return cellXml(val, isNumericValue, styleId);
        })
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");

  const safeName = sheet.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);

  return `<Worksheet ss:Name="${escapeXml(safeName)}"><Table>
    <Row>${headerCells}</Row>
    ${dataRows}
  </Table></Worksheet>`;
}

export function buildExcelWorkbook(sheets: ExcelSheet[]): string {
  const stylesXml = `<Styles>
    <Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0B1F3A" ss:Pattern="Solid"/></Style>
    <Style ss:ID="bold"><Font ss:Bold="1"/></Style>
    <Style ss:ID="number"><NumberFormat ss:Format="#,##0.00"/></Style>
    <Style ss:ID="numberBold"><Font ss:Bold="1"/><NumberFormat ss:Format="#,##0.00"/></Style>
  </Styles>`;

  const sheetsXml = sheets.map(sheetXml).join("\n");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 ${stylesXml}
 ${sheetsXml}
</Workbook>`;
}

export function downloadExcelWorkbook(filename: string, sheets: ExcelSheet[]) {
  const xml = buildExcelWorkbook(sheets);
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

// Hojas reutilizables: las arma el reporte completo (generateExcelReport) y
// también los botones de exportación individual de cada sección del Dashboard,
// para que ambos caminos generen siempre el mismo contenido.
export function buildMetradoLineasSheet(name: string, lines: MetradoLine[]): ExcelSheet {
  return {
    name,
    headers: ["Partida", "Unidad", "Cantidad"],
    rows: lines.map((l) => [l.partida, l.unidad, Number(l.cantidad.toFixed(3))]),
    numericCols: [2],
  };
}

// Hoja genérica para cualquier lista ya valorizada (precio unitario + parcial
// por línea) más filas de totales al pie — la reutilizan tanto el Presupuesto
// Referencial (con Gastos Generales/Utilidad/IGV) como el costo de materiales
// (con un total simple), pasando cada uno sus propias filas de pie.
export function buildValorizadoSheet(name: string, rows: PresupuestoRow[], footRows: (string | number)[][]): ExcelSheet {
  const dataRows: (string | number)[][] = rows.map((r) => [
    r.line.partida,
    r.line.unidad,
    Number(r.line.cantidad.toFixed(3)),
    Number(r.price.toFixed(2)),
    Number(r.subtotal.toFixed(2)),
  ]);
  return {
    name,
    headers: ["Partida", "Unidad", "Cantidad", "Precio Unit. (S/.)", "Parcial (S/.)"],
    rows: [...dataRows, ...footRows],
    numericCols: [2, 3, 4],
  };
}

// Presupuesto Referencial agrupado por elemento (zapatas, vigas, losas, ...),
// en el mismo orden que se ve en pantalla: un encabezado en negrita por módulo,
// sus partidas, un subtotal en negrita, y al final las filas de totales
// (Costo directo/GG/Utilidad/IGV/Total General) que ya calculó calcularPresupuesto.
export function buildPresupuestoPorModuloSheet(
  groups: PresupuestoModuloGroup[],
  presupuesto: PresupuestoTotales
): ExcelSheet {
  const rows: (string | number)[][] = [];
  const boldRows: number[] = [];
  for (const group of groups) {
    boldRows.push(rows.length);
    rows.push([group.label, "", "", "", ""]);
    for (const r of group.rows) {
      rows.push([
        r.line.partida,
        r.line.unidad,
        Number(r.line.cantidad.toFixed(3)),
        Number(r.price.toFixed(2)),
        Number(r.subtotal.toFixed(2)),
      ]);
    }
    boldRows.push(rows.length);
    rows.push(["", "", "", `Subtotal ${group.label} (S/.)`, Number(group.subtotal.toFixed(2))]);
  }
  const footRows = buildPresupuestoFootRows(presupuesto, (n) => Number(n.toFixed(2)));
  const footStart = rows.length;
  for (let i = 0; i < footRows.length; i++) boldRows.push(footStart + i);
  rows.push(...footRows);
  return {
    name: "Presupuesto Referencial",
    headers: ["Partida", "Unidad", "Cantidad", "Precio Unit. (S/.)", "Parcial (S/.)"],
    rows,
    numericCols: [2, 3, 4],
    boldRows,
  };
}

// Mismos datos que los gráficos de barras del Dashboard, en formato de tabla
// — el Excel de esta app se arma a mano en XML (sin la librería "xlsx", ver
// nota arriba), así que un gráfico visual real requeriría implementar el
// formato de gráficos de Office desde cero; la tabla da la misma información.
export function buildCostoPorCategoriaSheet(items: { categoria: string; monto: number }[]): ExcelSheet {
  return {
    name: "Costo por Categoría",
    headers: ["Categoría", "Monto (S/.)"],
    rows: items.map((c) => [c.categoria, Number(c.monto.toFixed(2))]),
    numericCols: [1],
  };
}

export function buildMetradosPorModuloSheet(
  items: { label: string; concreteM3: number; steelKg: number; formworkM2: number }[]
): ExcelSheet {
  return {
    name: "Metrados por Módulo",
    headers: ["Módulo", "Concreto (m³)", "Acero (kg)", "Encofrado (m²)"],
    rows: items.map((m) => [
      m.label,
      Number(m.concreteM3.toFixed(3)),
      Number(m.steelKg.toFixed(3)),
      Number(m.formworkM2.toFixed(3)),
    ]),
    numericCols: [1, 2, 3],
  };
}

interface ProjectInfoLike {
  nombreObra: string;
  cliente: string;
  ubicacion: string;
  responsable: string;
  fecha: string;
}

export function generateExcelReport(
  projectInfo: ProjectInfoLike,
  elements: CalculatedElement[],
  consolidated: MetradoLine[],
  prices: Record<string, number>,
  materialesLines: MetradoLine[],
  totalVarillas: number
) {
  const resumenSheet: ExcelSheet = {
    name: "Resumen",
    headers: ["Campo", "Valor"],
    rows: [
      ["Obra", projectInfo.nombreObra || "-"],
      ["Cliente", projectInfo.cliente || "-"],
      ["Ubicación", projectInfo.ubicacion || "-"],
      ["Responsable", projectInfo.responsable || "-"],
      ["Fecha", projectInfo.fecha || "-"],
      ["N° de elementos calculados", elements.length],
      ["Concreto total (m³)", elements.reduce((a, e) => a + e.concreteM3, 0)],
      ["Acero total (kg)", elements.reduce((a, e) => a + e.steelKg, 0)],
      ["Encofrado total (m²)", elements.reduce((a, e) => a + e.formworkM2, 0)],
    ],
    numericCols: [1],
  };

  const metradosSheet = buildMetradoLineasSheet("Metrados Consolidado", consolidated);

  const presupuesto = calcularPresupuesto(consolidated, prices);
  const costoPorCategoriaSheet = buildCostoPorCategoriaSheet(costosPorCategoria(presupuesto.rows));
  const metradosPorModuloSheet = buildMetradosPorModuloSheet(cantidadesPorModulo(elements));

  const aceroPorModulo = agruparAceroPorModulo(elements);
  const aceroRows: (string | number)[][] = [];
  for (const { module, resumen } of aceroPorModulo) {
    for (const r of resumen) {
      aceroRows.push([
        MODULE_LABELS[module],
        `Ø${r.diametroMm}mm`,
        Number(r.weightKgPerM.toFixed(3)),
        Number(r.pesoKg.toFixed(2)),
        r.numeroVarillas,
      ]);
    }
  }
  const aceroSheet: ExcelSheet = {
    name: "Acero por Diámetro",
    headers: ["Elemento", "Diámetro", "Peso (kg/m)", "Peso total (kg)", "Varillas (9 m)"],
    rows: aceroRows,
    numericCols: [2, 3, 4],
  };

  const presupuestoPorModulo = agruparPresupuestoPorModulo(elements, prices);
  const presupuestoSheet = buildPresupuestoPorModuloSheet(presupuestoPorModulo, presupuesto);

  const materialesValorizado = valorizarLineas(materialesLines, prices);
  const materialesFootRows: (string | number)[][] = [
    ["", "", "", "Costo total de materiales (S/.)", Number(materialesValorizado.total.toFixed(2))],
  ];
  if (totalVarillas > 0) {
    materialesFootRows.push(["Total de varillas de acero (todos los diámetros)", "und", totalVarillas, "", ""]);
  }
  const materialesSheet = buildValorizadoSheet("Metrado de Materiales", materialesValorizado.rows, materialesFootRows);

  const elementosSheet: ExcelSheet = {
    name: "Elementos",
    headers: ["Elemento", "Módulo", "Concreto (m³)", "Acero (kg)", "Encofrado (m²)"],
    rows: elements.map((el) => [
      el.name,
      MODULE_LABELS[el.module],
      Number(el.concreteM3.toFixed(3)),
      Number(el.steelKg.toFixed(3)),
      Number(el.formworkM2.toFixed(3)),
    ]),
    numericCols: [2, 3, 4],
  };

  const safeName = (projectInfo.nombreObra || "proyecto").replace(/[\\/:*?"<>|]/g, "_");
  downloadExcelWorkbook(`metrado_${safeName}`, [
    resumenSheet,
    costoPorCategoriaSheet,
    metradosPorModuloSheet,
    metradosSheet,
    aceroSheet,
    presupuestoSheet,
    materialesSheet,
    elementosSheet,
  ]);
}

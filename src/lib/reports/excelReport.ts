// Generador de reportes Excel en formato SpreadsheetML (XML nativo de Excel).
// Se evita la librería "xlsx" (SheetJS) por vulnerabilidades conocidas de seguridad
// en su parser; como aquí solo generamos archivos (no leemos xlsx de terceros),
// este formato XML simple es seguro, no requiere dependencias y Excel lo abre nativamente.
import type { CalculatedElement, MetradoLine } from "../types";
import { defaultUnitPrice, priceKey } from "../pricing";

export interface ExcelSheet {
  name: string;
  headers: string[];
  rows: (string | number)[][];
  numericCols?: number[];
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
  const headerCells = sheet.headers.map((h) => cellXml(h, false, "header")).join("");
  const dataRows = sheet.rows
    .map((row) => {
      const cells = row
        .map((val, i) => {
          const isNumericValue = numeric.has(i) && typeof val === "number";
          return cellXml(val, isNumericValue, isNumericValue ? "number" : undefined);
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

interface ProjectInfoLike {
  nombreObra: string;
  cliente: string;
  ubicacion: string;
  responsable: string;
  fecha: string;
}

const moduleLabel: Record<CalculatedElement["module"], string> = {
  losa: "Losa Aligerada",
  viga: "Viga",
  escalera: "Escalera",
  zapata: "Zapata",
  cimientoCorrido: "Cimiento Corrido",
  sobrecimiento: "Sobrecimiento",
  vigaCimentacion: "Viga de Cimentación",
  columna: "Columna",
  placa: "Placa",
  muroAlbanileria: "Muro de Albañilería",
  losaMaciza: "Losa Maciza",
  muroArquitectura: "Muro de Arquitectura",
};

export function generateExcelReport(
  projectInfo: ProjectInfoLike,
  elements: CalculatedElement[],
  consolidated: MetradoLine[],
  prices: Record<string, number>
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

  const metradosSheet: ExcelSheet = {
    name: "Metrados Consolidado",
    headers: ["Partida", "Unidad", "Cantidad"],
    rows: consolidated.map((l) => [l.partida, l.unidad, Number(l.cantidad.toFixed(3))]),
    numericCols: [2],
  };

  let totalPresupuesto = 0;
  const presupuestoRows = consolidated.map((l) => {
    const key = priceKey(l.partida, l.unidad);
    const price = prices[key] ?? defaultUnitPrice(l.unidad);
    const subtotal = price * l.cantidad;
    totalPresupuesto += subtotal;
    return [l.partida, l.unidad, Number(l.cantidad.toFixed(3)), Number(price.toFixed(2)), Number(subtotal.toFixed(2))];
  });
  presupuestoRows.push(["", "", "", "TOTAL", Number(totalPresupuesto.toFixed(2))]);

  const presupuestoSheet: ExcelSheet = {
    name: "Presupuesto Referencial",
    headers: ["Partida", "Unidad", "Cantidad", "Precio Unit. (S/.)", "Parcial (S/.)"],
    rows: presupuestoRows,
    numericCols: [2, 3, 4],
  };

  const elementosSheet: ExcelSheet = {
    name: "Elementos",
    headers: ["Elemento", "Módulo", "Concreto (m³)", "Acero (kg)", "Encofrado (m²)"],
    rows: elements.map((el) => [
      el.name,
      moduleLabel[el.module],
      Number(el.concreteM3.toFixed(3)),
      Number(el.steelKg.toFixed(3)),
      Number(el.formworkM2.toFixed(3)),
    ]),
    numericCols: [2, 3, 4],
  };

  const safeName = (projectInfo.nombreObra || "proyecto").replace(/[\\/:*?"<>|]/g, "_");
  downloadExcelWorkbook(`metrado_${safeName}`, [resumenSheet, metradosSheet, presupuestoSheet, elementosSheet]);
}

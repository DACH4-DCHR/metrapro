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
  crearLineaMovilizacion,
  presupuestoCustomALineas,
  MOVILIZACION_LABEL,
  PRESUPUESTO_CUSTOM_LABEL,
  type PresupuestoTotales,
  type PresupuestoSeccion,
  type PresupuestoCustomLine,
  type PresupuestoRow,
} from "../presupuesto";
import type { ApuOverrides } from "../apu";
import { agruparAceroPorModulo } from "../calc/aceroResumen";
import { MODULE_LABELS } from "../moduleLabels";
import { costosPorCategoria, cantidadesPorModulo, manoObraVsMateriales, type ManoObraMateriales } from "../dashboardCharts";

export interface ExcelSheet {
  name: string;
  headers: string[];
  rows: (string | number)[][];
  numericCols?: number[];
  // Índices (0-based) de filas que van en negrita, sin color de fondo —
  // usado por hojas simples que no necesitan la jerarquía de abajo.
  boldRows?: number[];
  // Jerarquía visual del Presupuesto por módulo (misma que en pantalla y en
  // ExportPreviewModal): banda de color por grupo ("MOVILIZACIÓN DE EQUIPO"),
  // fondo gris en subtotales, fondo gris más oscuro en el pie de totales
  // (Costo directo/GG/Utilidad/IGV/Total general). Un índice no debería
  // repetirse entre estas tres listas ni con boldRows.
  groupRows?: number[];
  subtotalRows?: number[];
  totalRows?: number[];
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

// Prioridad cuando una fila cae en más de una lista (no debería pasar, pero
// por las dudas): total > subtotal > group > bold simple > normal.
type RowCategory = "total" | "subtotal" | "group" | "bold" | "normal";

function categoryStyleId(category: RowCategory, numeric: boolean): string {
  switch (category) {
    case "total":
      return numeric ? "totalNumber" : "total";
    case "subtotal":
      return numeric ? "subtotalNumber" : "subtotal";
    case "group":
      return numeric ? "groupNumber" : "group";
    case "bold":
      return numeric ? "numberBold" : "bold";
    case "normal":
      return numeric ? "number" : "normal";
  }
}

function sheetXml(sheet: ExcelSheet): string {
  const numeric = new Set(sheet.numericCols ?? []);
  const bold = new Set(sheet.boldRows ?? []);
  const groupRows = new Set(sheet.groupRows ?? []);
  const subtotalRows = new Set(sheet.subtotalRows ?? []);
  const totalRows = new Set(sheet.totalRows ?? []);
  const headerCells = sheet.headers.map((h) => cellXml(h, false, "header")).join("");
  const dataRows = sheet.rows
    .map((row, rowIdx) => {
      const category: RowCategory = totalRows.has(rowIdx)
        ? "total"
        : subtotalRows.has(rowIdx)
          ? "subtotal"
          : groupRows.has(rowIdx)
            ? "group"
            : bold.has(rowIdx)
              ? "bold"
              : "normal";
      const cells = row
        .map((val, i) => {
          const isNumericValue = numeric.has(i) && typeof val === "number";
          return cellXml(val, isNumericValue, categoryStyleId(category, isNumericValue));
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
  // Mismos bordes finos en todas las celdas (incluida "normal", antes sin
  // estilo) para que el archivo se vea como una tabla real, no texto suelto.
  const border = `<Borders>
      <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D7DEE3"/>
      <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D7DEE3"/>
      <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D7DEE3"/>
      <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D7DEE3"/>
    </Borders>`;
  const numberFormat = `<NumberFormat ss:Format="#,##0.00"/>`;
  // Misma jerarquía de color que la vista previa/pantalla: ámbar para la
  // banda de grupo, gris claro para subtotales, gris más oscuro para el pie
  // de totales (Costo directo/GG/Utilidad/IGV/Total general).
  const stylesXml = `<Styles>
    <Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0B1F3A" ss:Pattern="Solid"/>${border}</Style>
    <Style ss:ID="normal">${border}</Style>
    <Style ss:ID="number">${numberFormat}${border}</Style>
    <Style ss:ID="bold"><Font ss:Bold="1"/>${border}</Style>
    <Style ss:ID="numberBold"><Font ss:Bold="1"/>${numberFormat}${border}</Style>
    <Style ss:ID="group"><Font ss:Bold="1" ss:Color="#0B1F3A"/><Interior ss:Color="#FDE8D0" ss:Pattern="Solid"/>${border}</Style>
    <Style ss:ID="groupNumber"><Font ss:Bold="1" ss:Color="#0B1F3A"/><Interior ss:Color="#FDE8D0" ss:Pattern="Solid"/>${numberFormat}${border}</Style>
    <Style ss:ID="subtotal"><Font ss:Bold="1" ss:Color="#0B1F3A"/><Interior ss:Color="#EEF2F5" ss:Pattern="Solid"/>${border}</Style>
    <Style ss:ID="subtotalNumber"><Font ss:Bold="1" ss:Color="#0B1F3A"/><Interior ss:Color="#EEF2F5" ss:Pattern="Solid"/>${numberFormat}${border}</Style>
    <Style ss:ID="total"><Font ss:Bold="1" ss:Color="#0B1F3A"/><Interior ss:Color="#DCE3E9" ss:Pattern="Solid"/>${border}</Style>
    <Style ss:ID="totalNumber"><Font ss:Bold="1" ss:Color="#0B1F3A"/><Interior ss:Color="#DCE3E9" ss:Pattern="Solid"/>${numberFormat}${border}</Style>
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
  // .xml, no .xls: el contenido es SpreadsheetML (el formato "XML Spreadsheet
  // 2003" de Microsoft), no el binario que un .xls real tiene. Guardado como
  // .xls, Excel detecta el desfase extensión/contenido y avisa "el formato y
  // la extensión no coinciden" — al forzar "Sí" lo abre en un modo degradado
  // que pierde estilos y hasta filas. Con extensión .xml, la directiva
  // <?mso-application progid="Excel.Sheet"?> del encabezado ya le dice a
  // Windows/Excel que lo abra como libro de Excel — sin aviso y sin perder
  // formato.
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xml") ? filename : `${filename}.xml`;
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
  groups: PresupuestoSeccion[],
  presupuesto: PresupuestoTotales,
  manoObraMateriales?: ManoObraMateriales
): ExcelSheet {
  const rows: (string | number)[][] = [];
  const groupRows: number[] = [];
  const subtotalRows: number[] = [];
  const totalRowsResumen: number[] = [];

  // Mismas 3 cifras que las tarjetas del Dashboard (Mano de obra/Materiales/
  // Presupuesto general) — antes solo vivían en pantalla, no en el Excel.
  if (manoObraMateriales && presupuesto.costoDirecto > 0) {
    groupRows.push(rows.length);
    rows.push(["RESUMEN", "", "", "", ""]);
    totalRowsResumen.push(rows.length);
    rows.push(["", "", "", `Mano de obra (${manoObraMateriales.pctManoObra.toFixed(1)}%)`, Number(manoObraMateriales.manoObra.toFixed(2))]);
    totalRowsResumen.push(rows.length);
    rows.push(["", "", "", `Materiales (${manoObraMateriales.pctMateriales.toFixed(1)}%)`, Number(manoObraMateriales.materiales.toFixed(2))]);
    totalRowsResumen.push(rows.length);
    rows.push(["", "", "", "Presupuesto general (S/.)", Number(presupuesto.costoDirecto.toFixed(2))]);
  }

  for (const group of groups) {
    groupRows.push(rows.length);
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
    subtotalRows.push(rows.length);
    rows.push(["", "", "", `Subtotal ${group.label} (S/.)`, Number(group.subtotal.toFixed(2))]);
  }
  const footRows = buildPresupuestoFootRows(presupuesto, (n) => Number(n.toFixed(2)));
  const totalRows: number[] = [...totalRowsResumen];
  const footStart = rows.length;
  for (let i = 0; i < footRows.length; i++) totalRows.push(footStart + i);
  rows.push(...footRows);
  return {
    name: "Presupuesto Referencial",
    headers: ["Partida", "Unidad", "Cantidad", "Precio Unit. (S/.)", "Parcial (S/.)"],
    rows,
    numericCols: [2, 3, 4],
    groupRows,
    subtotalRows,
    totalRows,
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
  totalVarillas: number,
  presupuestoCustom: PresupuestoCustomLine[] = [],
  apuOverrides: ApuOverrides = {}
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

  const lineaMovilizacion = crearLineaMovilizacion();
  const presupuestoCustomLineas = presupuestoCustomALineas(presupuestoCustom);
  const presupuesto = calcularPresupuesto(consolidated, prices, [lineaMovilizacion, ...presupuestoCustomLineas], apuOverrides);
  const costoPorCategoriaSheet = buildCostoPorCategoriaSheet(costosPorCategoria(presupuesto.rows));
  const metradosPorModuloSheet = buildMetradosPorModuloSheet(cantidadesPorModulo(elements));

  const aceroPorModulo = agruparAceroPorModulo(elements);
  const aceroRows: (string | number)[][] = [];
  for (const { module, resumen } of aceroPorModulo) {
    for (const r of resumen) {
      aceroRows.push([
        MODULE_LABELS[module],
        `Ø ${r.symbol}`,
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

  const presupuestoPorModulo = agruparPresupuestoPorModulo(elements, prices, apuOverrides);
  const movilizacionValorizado = valorizarLineas([lineaMovilizacion], prices, apuOverrides);
  const presupuestoCustomValorizado = valorizarLineas(presupuestoCustomLineas, prices, apuOverrides);
  const secciones: PresupuestoSeccion[] = [
    { label: MOVILIZACION_LABEL, rows: movilizacionValorizado.rows, subtotal: movilizacionValorizado.total },
    ...presupuestoPorModulo,
    { label: PRESUPUESTO_CUSTOM_LABEL, rows: presupuestoCustomValorizado.rows, subtotal: presupuestoCustomValorizado.total },
  ];
  const presupuestoSheet = buildPresupuestoPorModuloSheet(secciones, presupuesto, manoObraVsMateriales(presupuesto.rows));

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

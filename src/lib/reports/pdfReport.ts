import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  type PresupuestoRow,
  type PresupuestoSeccion,
  type PresupuestoCustomLine,
  type PresupuestoTotales,
} from "../presupuesto";
import { agruparAceroPorModulo } from "../calc/aceroResumen";
import { MODULE_LABELS } from "../moduleLabels";
import { costosPorCategoria, cantidadesPorModulo, manoObraVsMateriales } from "../dashboardCharts";

interface ProjectInfoLike {
  nombreObra: string;
  cliente: string;
  ubicacion: string;
  responsable: string;
  fecha: string;
  logoDataUrl?: string;
}

const numberFormatter = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });
const currencyFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 2,
});

const NAVY: [number, number, number] = [11, 31, 58];
const STEEL: [number, number, number] = [100, 116, 139];

function pdfFooter(doc: jsPDF, marginX: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(...STEEL);
  doc.text(`Generado el ${new Date().toLocaleDateString("es-PE")}`, pageWidth - marginX, pageHeight - 8, { align: "right" });
}

// Recorta un texto con "…" si no entra en maxWidth (mm), en vez de dejar que
// se salga de su columna o se monte sobre la barra de al lado.
function truncateToWidth(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxWidth) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

interface PdfBarItem {
  label: string;
  value: number;
  color: [number, number, number];
}

// Gráfico de barras horizontales dibujado con las primitivas vectoriales de
// jsPDF (rectángulos + texto) — mismo look que el gráfico HTML del Dashboard
// en pantalla, sin depender de html2canvas ni ninguna librería de charts.
// Devuelve el cursorY después del gráfico.
function drawBarChart(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  items: PdfBarItem[],
  valueFormatter: (v: number) => string
): number {
  const barHeight = 4.5;
  const rowGap = 2.5;
  const labelWidth = 34;
  const valueWidth = 24;
  const barAreaWidth = width - labelWidth - valueWidth;
  const max = Math.max(...items.map((i) => i.value), 0);
  let cursorY = y;

  for (const item of items) {
    const barWidth = max > 0 ? Math.max((item.value / max) * barAreaWidth, 1) : 0;
    const textBaseline = cursorY + barHeight - 1.1;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...STEEL);
    doc.text(truncateToWidth(doc, item.label, labelWidth - 2), x, textBaseline);

    doc.setFillColor(232, 236, 240);
    doc.rect(x + labelWidth, cursorY, barAreaWidth, barHeight, "F");
    doc.setFillColor(...item.color);
    doc.rect(x + labelWidth, cursorY, barWidth, barHeight, "F");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(valueFormatter(item.value), x + labelWidth + barAreaWidth + valueWidth, textBaseline, { align: "right" });

    cursorY += barHeight + rowGap;
  }
  return cursorY;
}

// Tarjetas Mano de Obra / Materiales / Presupuesto General del Dashboard —
// mismos 3 datos, en el mismo orden, para que el PDF no se quede corto
// respecto a lo que se ve en pantalla.
function drawStatCards(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  cards: { label: string; value: string; subLabel: string; color: [number, number, number] }[]
): number {
  const gap = 4;
  const cardHeight = 20;
  const cardWidth = (width - gap * (cards.length - 1)) / cards.length;

  cards.forEach((card, i) => {
    const cx = x + i * (cardWidth + gap);
    doc.setFillColor(...card.color);
    doc.rect(cx, y, 1.5, cardHeight, "F");
    doc.setFillColor(248, 250, 252);
    doc.rect(cx + 1.5, y, cardWidth - 1.5, cardHeight, "F");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...STEEL);
    doc.text(truncateToWidth(doc, card.label.toUpperCase(), cardWidth - 6), cx + 4, y + 6);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(truncateToWidth(doc, card.value, cardWidth - 6), cx + 4, y + 13);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...card.color);
    doc.text(truncateToWidth(doc, card.subLabel, cardWidth - 6), cx + 4, y + 18);
  });

  return y + cardHeight + 6;
}

// PDF de una sola tabla simple (partida/unidad/cantidad, sin precios) — lo usa
// el botón de exportación individual del Cuadro de Metrados Consolidado.
export function downloadMetradoLineasPdf(filename: string, tableTitle: string, lines: MetradoLine[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginX = 14;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(tableTitle, marginX, 16);

  autoTable(doc, {
    startY: 22,
    margin: { left: marginX, right: marginX },
    head: [["Partida", "Unidad", "Cantidad"]],
    body: lines.map((l) => [l.partida, l.unidad, numberFormatter.format(l.cantidad)]),
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 2: { halign: "right" } },
  });

  pdfFooter(doc, marginX);
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

// PDF de una tabla valorizada (partida/unidad/cantidad/precio/parcial + filas de
// totales al pie) — lo usan los botones individuales de Presupuesto Referencial
// y Metrado de Materiales.
export function downloadValorizadoPdf(
  filename: string,
  tableTitle: string,
  rows: PresupuestoRow[],
  footRows: (string | number)[][]
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginX = 14;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(tableTitle, marginX, 16);

  autoTable(doc, {
    startY: 22,
    margin: { left: marginX, right: marginX },
    head: [["Partida", "Unidad", "Cantidad", "P. Unit. (S/.)", "Parcial (S/.)"]],
    body: rows.map((r) => [
      r.line.partida,
      r.line.unidad,
      numberFormatter.format(r.line.cantidad),
      currencyFormatter.format(r.price),
      currencyFormatter.format(r.subtotal),
    ]),
    foot: footRows,
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [232, 236, 240], textColor: NAVY, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
  });

  pdfFooter(doc, marginX);
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

// PDF del Presupuesto Referencial agrupado por elemento (zapatas, vigas,
// losas, ...) — una subtabla por módulo con su propio subtotal, en vez de una
// sola lista plana, y al final las filas de totales (costo directo/GG/UT/IGV/
// total general) igual que el resto de exportaciones de este presupuesto.
export function downloadPresupuestoPorModuloPdf(
  filename: string,
  tableTitle: string,
  groups: PresupuestoSeccion[],
  presupuesto: PresupuestoTotales
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginX = 14;
  let cursorY = 16;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(tableTitle, marginX, cursorY);
  cursorY += 6;

  for (const group of groups) {
    if (cursorY > 260) {
      doc.addPage();
      cursorY = 16;
    }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...STEEL);
    doc.text(group.label, marginX, cursorY + 3);
    cursorY += 5;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [["Partida", "Unidad", "Cantidad", "P. Unit. (S/.)", "Parcial (S/.)"]],
      body: group.rows.map((r) => [
        r.line.partida,
        r.line.unidad,
        numberFormatter.format(r.line.cantidad),
        currencyFormatter.format(r.price),
        currencyFormatter.format(r.subtotal),
      ]),
      foot: [["", "", "", `Subtotal ${group.label} (S/.)`, currencyFormatter.format(group.subtotal)]],
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [232, 236, 240], textColor: NAVY, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  }

  const footRows = buildPresupuestoFootRows(presupuesto, (n) => currencyFormatter.format(n));
  if (cursorY > 250) {
    doc.addPage();
    cursorY = 16;
  }
  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    body: footRows,
    styles: { fontSize: 9, cellPadding: 2, fontStyle: "bold" },
    columnStyles: { 4: { halign: "right" } },
    bodyStyles: { fillColor: [232, 236, 240], textColor: NAVY },
  });

  pdfFooter(doc, marginX);
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

// Construye el documento completo sin guardarlo ni compartirlo — lo reusan
// generatePdfReport (descarga directa) y sharePdfReport (compartir por
// WhatsApp u otra app), para no duplicar las ~250 líneas de armado del PDF.
function buildReportDoc(
  projectInfo: ProjectInfoLike,
  elements: CalculatedElement[],
  consolidated: MetradoLine[],
  prices: Record<string, number>,
  materialesLines: MetradoLine[],
  totalVarillas: number,
  presupuestoCustom: PresupuestoCustomLine[] = []
): { doc: jsPDF; safeName: string } {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  let cursorY = 16;

  if (projectInfo.logoDataUrl) {
    try {
      doc.addImage(projectInfo.logoDataUrl, "PNG", marginX, cursorY - 4, 22, 22, undefined, "FAST");
    } catch {
      // Si el formato de imagen no es compatible, se omite el logo sin interrumpir el reporte.
    }
  }

  doc.setTextColor(...NAVY);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("METRADO DE ELEMENTOS ESTRUCTURALES", pageWidth / 2, cursorY, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...STEEL);
  doc.text("MetraPro — Losas Aligeradas, Vigas y Escaleras de Concreto Armado", pageWidth / 2, cursorY + 6, {
    align: "center",
  });

  cursorY += 18;
  doc.setDrawColor(...STEEL);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 8;

  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  const infoRows: [string, string][] = [
    ["Obra", projectInfo.nombreObra || "-"],
    ["Cliente", projectInfo.cliente || "-"],
    ["Ubicación", projectInfo.ubicacion || "-"],
    ["Responsable", projectInfo.responsable || "-"],
    ["Fecha", projectInfo.fecha || "-"],
  ];
  const colWidth = (pageWidth - marginX * 2) / 2;
  infoRows.forEach(([label, value], idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = marginX + col * colWidth;
    const y = cursorY + row * 7;
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, x + 26, y);
  });
  cursorY += Math.ceil(infoRows.length / 2) * 7 + 6;

  const lineaMovilizacion = crearLineaMovilizacion();
  const presupuestoCustomLineas = presupuestoCustomALineas(presupuestoCustom);
  const presupuesto = calcularPresupuesto(consolidated, prices, [lineaMovilizacion, ...presupuestoCustomLineas]);
  const costosCategoria = costosPorCategoria(presupuesto.rows);
  const cantidadesModulo = cantidadesPorModulo(elements);
  const chartWidth = pageWidth - marginX * 2;

  if (presupuesto.costoDirecto > 0) {
    const manoObraMateriales = manoObraVsMateriales(presupuesto.rows);
    cursorY = drawStatCards(doc, marginX, cursorY, chartWidth, [
      {
        label: "Mano de obra",
        value: currencyFormatter.format(manoObraMateriales.manoObra),
        subLabel: `${manoObraMateriales.pctManoObra.toFixed(1)}%`,
        color: [42, 120, 214],
      },
      {
        label: "Materiales",
        value: currencyFormatter.format(manoObraMateriales.materiales),
        subLabel: `${manoObraMateriales.pctMateriales.toFixed(1)}%`,
        color: [235, 104, 52],
      },
      {
        label: "Presupuesto general",
        value: currencyFormatter.format(presupuesto.costoDirecto),
        subLabel: "Mano de obra + materiales",
        color: [217, 140, 43],
      },
    ]);
  }

  if (costosCategoria.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text("Costo Directo por Categoría", marginX, cursorY);
    cursorY += 5;
    cursorY = drawBarChart(
      doc,
      marginX,
      cursorY,
      chartWidth,
      costosCategoria.map((c) => ({ label: c.categoria, value: c.monto, color: hexToRgb(c.color) })),
      (v) => currencyFormatter.format(v)
    );
    cursorY += 5;
  }

  const modulosConcreto = cantidadesModulo
    .filter((m) => m.concreteM3 > 0)
    .sort((a, b) => b.concreteM3 - a.concreteM3)
    .map((m) => ({ label: m.label, value: m.concreteM3, color: [42, 120, 214] as [number, number, number] }));
  const modulosAcero = cantidadesModulo
    .filter((m) => m.steelKg > 0)
    .sort((a, b) => b.steelKg - a.steelKg)
    .map((m) => ({ label: m.label, value: m.steelKg, color: [235, 104, 52] as [number, number, number] }));
  const modulosEncofrado = cantidadesModulo
    .filter((m) => m.formworkM2 > 0)
    .sort((a, b) => b.formworkM2 - a.formworkM2)
    .map((m) => ({ label: m.label, value: m.formworkM2, color: [27, 175, 122] as [number, number, number] }));

  if (modulosConcreto.length > 0 || modulosAcero.length > 0 || modulosEncofrado.length > 0) {
    if (cursorY > 230) {
      doc.addPage();
      cursorY = 16;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text("Metrados por Módulo", marginX, cursorY);
    cursorY += 6;

    const moduloCharts: [string, typeof modulosConcreto, (v: number) => string][] = [
      ["Concreto (m³)", modulosConcreto, (v) => `${numberFormatter.format(v)} m³`],
      ["Acero (kg)", modulosAcero, (v) => `${numberFormatter.format(v)} kg`],
      ["Encofrado (m²)", modulosEncofrado, (v) => `${numberFormatter.format(v)} m²`],
    ];
    for (const [subtitulo, items, fmt] of moduloCharts) {
      if (items.length === 0) continue;
      if (cursorY > 260) {
        doc.addPage();
        cursorY = 16;
      }
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...STEEL);
      doc.text(subtitulo, marginX, cursorY);
      cursorY += 4;
      cursorY = drawBarChart(doc, marginX, cursorY, chartWidth, items, fmt);
      cursorY += 4;
    }
  }

  if (cursorY > 250) {
    doc.addPage();
    cursorY = 16;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Cuadro de Metrados Consolidado", marginX, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [["Partida", "Unidad", "Cantidad"]],
    body: consolidated.map((l) => [l.partida, l.unidad, numberFormatter.format(l.cantidad)]),
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 2: { halign: "right" } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cursorY = (doc as any).lastAutoTable.finalY + 10;

  const aceroPorModulo = agruparAceroPorModulo(elements);
  if (aceroPorModulo.length > 0) {
    if (cursorY > 240) {
      doc.addPage();
      cursorY = 16;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text("Acero de Refuerzo por Diámetro y Elemento", marginX, cursorY);
    cursorY += 3;

    for (const { module, resumen } of aceroPorModulo) {
      if (cursorY > 260) {
        doc.addPage();
        cursorY = 16;
      }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...STEEL);
      doc.text(MODULE_LABELS[module], marginX, cursorY + 3);
      cursorY += 5;

      autoTable(doc, {
        startY: cursorY,
        margin: { left: marginX, right: marginX },
        head: [["Diámetro", "Peso (kg/m)", "Peso total (kg)", "Varillas (9 m)"]],
        body: resumen.map((r) => [
          `Ø${r.diametroMm}mm`,
          r.weightKgPerM.toFixed(3),
          numberFormatter.format(r.pesoKg),
          String(r.numeroVarillas),
        ]),
        headStyles: { fillColor: STEEL, textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 8.5, cellPadding: 1.8 },
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cursorY = (doc as any).lastAutoTable.finalY + 6;
    }
    cursorY += 4;
  }

  const presupuestoPorModulo = agruparPresupuestoPorModulo(elements, prices);
  const movilizacionValorizado = valorizarLineas([lineaMovilizacion], prices);
  const presupuestoCustomValorizado = valorizarLineas(presupuestoCustomLineas, prices);
  const seccionesPresupuesto: PresupuestoSeccion[] = [
    { label: MOVILIZACION_LABEL, rows: movilizacionValorizado.rows, subtotal: movilizacionValorizado.total },
    ...presupuestoPorModulo,
    { label: PRESUPUESTO_CUSTOM_LABEL, rows: presupuestoCustomValorizado.rows, subtotal: presupuestoCustomValorizado.total },
  ];
  const presupuestoFootRows = buildPresupuestoFootRows(presupuesto, (n) => currencyFormatter.format(n));

  // Umbral más conservador que el resto de secciones: esta tabla siempre trae
  // filas de pie (costo directo/GG/UT/IGV/total), y si arranca con poco
  // espacio libre, autoTable puede pintar el pie encima de la última fila del
  // cuerpo en vez de pasar de página — hay que dejarle más aire de entrada.
  if (cursorY > 200) {
    doc.addPage();
    cursorY = 16;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text("Presupuesto Referencial", marginX, cursorY);
  cursorY += 3;

  for (const group of seccionesPresupuesto) {
    if (cursorY > 260) {
      doc.addPage();
      cursorY = 16;
    }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...STEEL);
    doc.text(group.label, marginX, cursorY + 3);
    cursorY += 5;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [["Partida", "Unidad", "Cantidad", "P. Unit.", "Parcial"]],
      body: group.rows.map((r) => [
        r.line.partida,
        r.line.unidad,
        numberFormatter.format(r.line.cantidad),
        currencyFormatter.format(r.price),
        currencyFormatter.format(r.subtotal),
      ]),
      foot: [["", "", "", `Subtotal ${group.label} (S/.)`, currencyFormatter.format(group.subtotal)]],
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [232, 236, 240], textColor: NAVY, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  }

  if (cursorY > 250) {
    doc.addPage();
    cursorY = 16;
  }
  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    body: presupuestoFootRows,
    styles: { fontSize: 9, cellPadding: 2, fontStyle: "bold" },
    columnStyles: { 4: { halign: "right" } },
    bodyStyles: { fillColor: [232, 236, 240], textColor: NAVY },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cursorY = (doc as any).lastAutoTable.finalY + 10;

  if (materialesLines.length > 0) {
    if (cursorY > 240) {
      doc.addPage();
      cursorY = 16;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text("Metrado de Materiales", marginX, cursorY);
    cursorY += 3;

    const materialesValorizado = valorizarLineas(materialesLines, prices);
    const materialesFootRows: (string | number)[][] = [
      ["", "", "", "Costo total de materiales (S/.)", currencyFormatter.format(materialesValorizado.total)],
    ];
    if (totalVarillas > 0) {
      materialesFootRows.push(["Total de varillas de acero (todos los diámetros)", "und", String(totalVarillas), "", ""]);
    }

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [["Material", "Unidad", "Cantidad", "P. Unit. (S/.)", "Parcial (S/.)"]],
      body: materialesValorizado.rows.map((r) => [
        r.line.partida,
        r.line.unidad,
        numberFormatter.format(r.line.cantidad),
        currencyFormatter.format(r.price),
        currencyFormatter.format(r.subtotal),
      ]),
      foot: materialesFootRows,
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [232, 236, 240], textColor: NAVY, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cursorY = (doc as any).lastAutoTable.finalY + 10;
  }

  if (elements.length > 0) {
    if (cursorY > 240) {
      doc.addPage();
      cursorY = 16;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Detalle de Elementos Calculados", marginX, cursorY);
    cursorY += 3;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [["Elemento", "Módulo", "Concreto (m³)", "Acero (kg)", "Encofrado (m²)"]],
      body: elements.map((el) => [
        el.name,
        MODULE_LABELS[el.module],
        numberFormatter.format(el.concreteM3),
        numberFormatter.format(el.steelKg),
        numberFormatter.format(el.formworkM2),
      ]),
      headStyles: { fillColor: STEEL, textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cursorY = (doc as any).lastAutoTable.finalY + 20;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerY = pageHeight - 22;

    if (i === pageCount) {
      doc.setDrawColor(...STEEL);
      doc.line(marginX, footerY, marginX + 70, footerY);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...NAVY);
      doc.text("Firma del responsable", marginX, footerY + 5);
      doc.text(projectInfo.responsable || "", marginX, footerY + 10);
    }

    doc.setFontSize(8);
    doc.setTextColor(...STEEL);
    doc.text(
      `Generado el ${new Date().toLocaleDateString("es-PE")} — Página ${i} de ${pageCount}`,
      pageWidth - marginX,
      pageHeight - 8,
      { align: "right" }
    );
  }

  const safeName = (projectInfo.nombreObra || "proyecto").replace(/[\\/:*?"<>|]/g, "_");
  return { doc, safeName };
}

export function generatePdfReport(
  projectInfo: ProjectInfoLike,
  elements: CalculatedElement[],
  consolidated: MetradoLine[],
  prices: Record<string, number>,
  materialesLines: MetradoLine[],
  totalVarillas: number,
  presupuestoCustom: PresupuestoCustomLine[] = []
) {
  const { doc, safeName } = buildReportDoc(
    projectInfo,
    elements,
    consolidated,
    prices,
    materialesLines,
    totalVarillas,
    presupuestoCustom
  );
  doc.save(`metrado_${safeName}.pdf`);
}

// true si se pudo abrir el panel de compartir (WhatsApp, correo, etc. — lo
// que el sistema operativo ofrezca); false si el navegador no soporta
// compartir archivos y hay que avisarle al usuario que descargue el PDF y lo
// adjunte manualmente. No confundir con que el usuario haya cancelado el
// panel de compartir: eso también cuenta como "se pudo abrir" (true).
export async function sharePdfReport(
  projectInfo: ProjectInfoLike,
  elements: CalculatedElement[],
  consolidated: MetradoLine[],
  prices: Record<string, number>,
  materialesLines: MetradoLine[],
  totalVarillas: number,
  presupuestoCustom: PresupuestoCustomLine[] = []
): Promise<boolean> {
  const { doc, safeName } = buildReportDoc(
    projectInfo,
    elements,
    consolidated,
    prices,
    materialesLines,
    totalVarillas,
    presupuestoCustom
  );
  const blob = doc.output("blob");
  // Nombre de archivo solo ASCII (sin tildes/ñ/espacios): algunas versiones de
  // WhatsApp para Android fallan con "No se puede compartir, vuelve a
  // intentarlo" al elegir el contacto cuando el nombre del archivo compartido
  // trae caracteres no-ASCII en la URI de contenido que genera el navegador.
  const asciiName = safeName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  const file = new File([blob], `metrado_${asciiName}.pdf`, { type: "application/pdf" });

  if (!navigator.canShare || !navigator.canShare({ files: [file] })) {
    return false;
  }

  try {
    // Sin "title": combinar texto + archivo en la misma llamada es lo que
    // hace fallar a WhatsApp para Android justo al elegir el contacto — el
    // nombre del archivo ya identifica el reporte, no hace falta un título.
    await navigator.share({ files: [file] });
  } catch (e) {
    // El usuario canceló el panel de compartir (AbortError): no es un error real.
    if (!(e instanceof Error) || e.name !== "AbortError") throw e;
  }
  return true;
}

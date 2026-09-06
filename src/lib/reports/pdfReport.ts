import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CalculatedElement, MetradoLine } from "../types";
import { defaultUnitPrice, priceKey } from "../pricing";

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

export function generatePdfReport(
  projectInfo: ProjectInfoLike,
  elements: CalculatedElement[],
  consolidated: MetradoLine[],
  prices: Record<string, number>
) {
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

  let totalPresupuesto = 0;
  const presupuestoRows = consolidated.map((l) => {
    const key = priceKey(l.partida, l.unidad);
    const price = prices[key] ?? defaultUnitPrice(l.unidad);
    const subtotal = price * l.cantidad;
    totalPresupuesto += subtotal;
    return [l.partida, l.unidad, numberFormatter.format(l.cantidad), currencyFormatter.format(price), currencyFormatter.format(subtotal)];
  });

  if (cursorY > 250) {
    doc.addPage();
    cursorY = 16;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Presupuesto Referencial", marginX, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [["Partida", "Unidad", "Cantidad", "P. Unit.", "Parcial"]],
    body: presupuestoRows,
    foot: [["", "", "", "TOTAL", currencyFormatter.format(totalPresupuesto)]],
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [232, 236, 240], textColor: NAVY, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cursorY = (doc as any).lastAutoTable.finalY + 10;

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
        el.module === "losa" ? "Losa Aligerada" : el.module === "viga" ? "Viga" : "Escalera",
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
  doc.save(`metrado_${safeName}.pdf`);
}

import { getRebar } from "../../lib/materials";
import type { ColumnaInput } from "../../lib/calc/columna";
import {
  HDim,
  VDim,
  DIAGRAM_COLORS,
  fmt,
  BlueprintGrid,
  rectPerimeterPoints,
  circlePerimeterPoints,
  assignDiametersToPositions,
} from "./svgHelpers";

interface ColumnaCrossSectionProps {
  input: ColumnaInput;
}

const VIEW_W = 280;
const VIEW_H = 300;
const MARGIN_L = 55;
const MARGIN_R = 30;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 50;

// Colores de las ramas de estribo suplementario (familia cálida, distinta a cada Ø
// pero siempre distinguible del estribo perimetral y entre sí).
const SUPLEMENTARIO_COLORS = ["#c2410c", "#991b1b"];

function totalBarras(input: ColumnaInput): number {
  return input.barrasLongitudinales.reduce((acc, g) => acc + Math.max(g.cantidad, 0), 0);
}

function maxDiametroMm(input: ColumnaInput): number {
  const dbs = input.barrasLongitudinales.filter((g) => g.cantidad > 0).map((g) => getRebar(g.diametroId).diameterMm);
  return dbs.length > 0 ? Math.max(...dbs) : 16;
}

function grupoLabel(input: ColumnaInput): string {
  return input.barrasLongitudinales
    .filter((g) => g.cantidad > 0)
    .map((g) => `${g.cantidad}Ø${getRebar(g.diametroId).diameterMm}mm`)
    .join(" + ");
}

export function ColumnaCrossSection({ input }: ColumnaCrossSectionProps) {
  const recub = input.recubrimiento;
  const n = totalBarras(input);
  const dbMax = maxDiametroMm(input);
  const barGroups = input.barrasLongitudinales.filter((g) => g.cantidad > 0);

  if (input.tipoSeccion === "rectangular" && (input.base <= 0 || input.peralte <= 0)) {
    return <p className="text-sm text-steel-500">Ingresa una base y peralte válidos para ver la sección.</p>;
  }
  if (input.tipoSeccion === "circular" && input.diametro <= 0) {
    return <p className="text-sm text-steel-500">Ingresa un diámetro válido para ver la sección.</p>;
  }

  const drawW = VIEW_W - MARGIN_L - MARGIN_R;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;

  if (input.tipoSeccion === "circular") {
    const diametro = input.diametro;
    const scale = Math.min(drawW / diametro, drawH / diametro);
    const cx = MARGIN_L + (diametro * scale) / 2;
    const cy = MARGIN_TOP + (diametro * scale) / 2;
    const rOuter = (diametro * scale) / 2;
    const recubPx = recub * scale;
    const barRMax = Math.max((dbMax / 10) * scale * 0.5, 3);
    const rBars = rOuter - recubPx - barRMax;

    const barPositions = assignDiametersToPositions(circlePerimeterPoints(n, rBars), barGroups).map((p) => ({
      ...p,
      x: p.x + (cx - rBars),
      y: p.y + (cy - rBars),
    }));

    return (
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="mx-auto block w-full max-w-[220px]" role="img" aria-label="Sección transversal de columna circular">
          <BlueprintGrid width={VIEW_W} height={VIEW_H} id="grid-columna-circ" />
          <circle cx={cx} cy={cy} r={rOuter} fill={DIAGRAM_COLORS.concrete} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} />
          <circle
            cx={cx}
            cy={cy}
            r={rOuter - recubPx}
            fill="none"
            stroke={DIAGRAM_COLORS.stirrup}
            strokeWidth={Math.max((getRebar(input.diametroEstribosId).diameterMm / 10) * scale * 0.6, 1.5)}
          />
          {barPositions.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={Math.max((getRebar(p.diametroId).diameterMm / 10) * scale * 0.5, 3)}
              fill={getRebar(p.diametroId).color}
            />
          ))}
          <HDim x1={cx - rOuter} x2={cx + rOuter} y={cy + rOuter + 20} label={`Ø${fmt(diametro)}cm`} labelBelow />
        </svg>
        <p className="mt-1 text-xs text-steel-500">
          {grupoLabel(input) || "sin barras"} ({n} und, distribución perimetral) · estribo circular Ø
          {getRebar(input.diametroEstribosId).diameterMm}mm
        </p>
      </div>
    );
  }

  const base = input.base;
  const peralte = input.peralte;
  const scale = Math.min(drawW / base, drawH / peralte);
  const x0 = MARGIN_L;
  const y0 = MARGIN_TOP;
  const w = base * scale;
  const h = peralte * scale;
  const recubPx = recub * scale;
  const barRMax = Math.max((dbMax / 10) * scale * 0.5, 3);
  const insetX = x0 + recubPx + barRMax;
  const insetY = y0 + recubPx + barRMax;
  const insetW = Math.max(w - 2 * (recubPx + barRMax), 0);
  const insetH = Math.max(h - 2 * (recubPx + barRMax), 0);

  const barPositions = assignDiametersToPositions(rectPerimeterPoints(n, insetW, insetH), barGroups).map((p) => ({
    ...p,
    x: p.x + insetX,
    y: p.y + insetY,
  }));

  const menorLadoEsBase = base <= peralte;
  const supRecubPx = recub * scale;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="mx-auto block w-full max-w-[220px]" role="img" aria-label="Sección transversal de columna">
        <BlueprintGrid width={VIEW_W} height={VIEW_H} id="grid-columna-rect" />
        <rect x={x0} y={y0} width={w} height={h} fill={DIAGRAM_COLORS.concrete} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} />
        <rect
          x={x0 + recubPx}
          y={y0 + recubPx}
          width={w - 2 * recubPx}
          height={h - 2 * recubPx}
          fill="none"
          stroke={DIAGRAM_COLORS.stirrup}
          strokeWidth={Math.max((getRebar(input.diametroEstribosId).diameterMm / 10) * scale * 0.6, 1.5)}
        />
        {/* Estribos suplementarios: una rama esquemática cruzando la menor dimensión */}
        {input.estribosSuplementarios.map((s, i) => {
          const strokeW = Math.max((getRebar(s.diametroId).diameterMm / 10) * scale * 0.6, 1.5);
          const color = SUPLEMENTARIO_COLORS[i % SUPLEMENTARIO_COLORS.length];
          if (menorLadoEsBase) {
            const y = y0 + h / 2 + (i - (input.estribosSuplementarios.length - 1) / 2) * 10;
            return (
              <line key={i} x1={x0 + supRecubPx} y1={y} x2={x0 + w - supRecubPx} y2={y} stroke={color} strokeWidth={strokeW} strokeDasharray="5 3" />
            );
          }
          const x = x0 + w / 2 + (i - (input.estribosSuplementarios.length - 1) / 2) * 10;
          return (
            <line key={i} x1={x} y1={y0 + supRecubPx} x2={x} y2={y0 + h - supRecubPx} stroke={color} strokeWidth={strokeW} strokeDasharray="5 3" />
          );
        })}
        {barPositions.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={Math.max((getRebar(p.diametroId).diameterMm / 10) * scale * 0.5, 3)}
            fill={getRebar(p.diametroId).color}
          />
        ))}
        <HDim x1={x0} x2={x0 + w} y={y0 + h + 20} label={`b=${fmt(base)}cm`} labelBelow />
        <VDim y1={y0} y2={y0 + h} x={x0 - 20} label={`t=${fmt(peralte)}cm`} />
      </svg>
      <p className="mt-1 text-xs text-steel-500">
        {grupoLabel(input) || "sin barras"} ({n} und, distribución perimetral) · estribo Ø
        {getRebar(input.diametroEstribosId).diameterMm}mm
        {input.estribosSuplementarios.length > 0
          ? ` + ${input.estribosSuplementarios
              .map((s) => `${s.numeroRamas}Ø${getRebar(s.diametroId).diameterMm}mm supl.`)
              .join(" + ")}`
          : ""}
      </p>
    </div>
  );
}

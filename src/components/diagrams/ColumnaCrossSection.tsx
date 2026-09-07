import { getRebar } from "../../lib/materials";
import type { ColumnaInput } from "../../lib/calc/columna";
import { HDim, VDim, DIAGRAM_COLORS, fmt } from "./svgHelpers";

interface ColumnaCrossSectionProps {
  input: ColumnaInput;
}

const VIEW_W = 280;
const VIEW_H = 300;
const MARGIN_L = 55;
const MARGIN_R = 30;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 50;

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

// Distribuye N puntos a espaciamiento uniforme por longitud de arco sobre el
// perímetro de un rectángulo (empezando en la esquina superior izquierda).
function rectPerimeterPoints(n: number, x0: number, y0: number, w: number, h: number): { x: number; y: number }[] {
  if (n <= 0) return [];
  const perimeter = 2 * (w + h);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    let s = (i * perimeter) / n;
    if (s < w) points.push({ x: x0 + s, y: y0 });
    else if (s < w + h) points.push({ x: x0 + w, y: y0 + (s - w) });
    else if (s < 2 * w + h) points.push({ x: x0 + w - (s - w - h), y: y0 + h });
    else points.push({ x: x0, y: y0 + h - (s - 2 * w - h) });
  }
  return points;
}

export function ColumnaCrossSection({ input }: ColumnaCrossSectionProps) {
  const recub = input.recubrimiento;
  const n = totalBarras(input);
  const dbMax = maxDiametroMm(input);

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
    const barR = Math.max((dbMax / 10) * scale * 0.5, 3);
    const rBars = rOuter - recubPx - barR;

    const barPositions = Array.from({ length: n }, (_, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      return { x: cx + rBars * Math.cos(angle), y: cy + rBars * Math.sin(angle) };
    });

    return (
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="mx-auto block w-full max-w-[220px]" role="img" aria-label="Sección transversal de columna circular">
          <circle cx={cx} cy={cy} r={rOuter} fill={DIAGRAM_COLORS.concrete} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} />
          <circle cx={cx} cy={cy} r={rOuter - recubPx} fill="none" stroke={DIAGRAM_COLORS.stirrup} strokeWidth={2} />
          {barPositions.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={barR} fill={DIAGRAM_COLORS.rebar} />
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
  const barR = Math.max((dbMax / 10) * scale * 0.5, 3);

  const barPositions = rectPerimeterPoints(n, x0 + recubPx + barR, y0 + recubPx + barR, w - 2 * (recubPx + barR), h - 2 * (recubPx + barR));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="mx-auto block w-full max-w-[220px]" role="img" aria-label="Sección transversal de columna">
        <rect x={x0} y={y0} width={w} height={h} fill={DIAGRAM_COLORS.concrete} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} />
        <rect x={x0 + recubPx} y={y0 + recubPx} width={w - 2 * recubPx} height={h - 2 * recubPx} fill="none" stroke={DIAGRAM_COLORS.stirrup} strokeWidth={2} />
        {barPositions.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={barR} fill={DIAGRAM_COLORS.rebar} />
        ))}
        <HDim x1={x0} x2={x0 + w} y={y0 + h + 20} label={`b=${fmt(base)}cm`} labelBelow />
        <VDim y1={y0} y2={y0 + h} x={x0 - 20} label={`t=${fmt(peralte)}cm`} />
      </svg>
      <p className="mt-1 text-xs text-steel-500">
        {grupoLabel(input) || "sin barras"} ({n} und, distribución perimetral) · estribo Ø
        {getRebar(input.diametroEstribosId).diameterMm}mm
      </p>
    </div>
  );
}

import { getRebar } from "../../lib/materials";
import type { VigaCimentacionInput } from "../../lib/calc/vigaCimentacion";
import { HDim, VDim, DIAGRAM_COLORS, fmt } from "./svgHelpers";

interface VigaCimentacionCrossSectionProps {
  input: VigaCimentacionInput;
}

const VIEW_W = 300;
const VIEW_H = 300;
const MARGIN_L = 55;
const MARGIN_R = 30;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 50;

function flattenBarras(input: VigaCimentacionInput): number[] {
  const dbs: number[] = [];
  for (const grupo of input.barrasLongitudinales) {
    const db = getRebar(grupo.diametroId).diameterMm;
    for (let i = 0; i < Math.max(grupo.cantidad, 0); i++) dbs.push(db);
  }
  return dbs;
}

function grupoLabel(input: VigaCimentacionInput): string {
  return input.barrasLongitudinales
    .filter((g) => g.cantidad > 0)
    .map((g) => `${g.cantidad}Ø${getRebar(g.diametroId).diameterMm}mm`)
    .join(" + ");
}

export function VigaCimentacionCrossSection({ input }: VigaCimentacionCrossSectionProps) {
  const { base, altura, recubrimiento: recub } = input;
  if (base <= 0 || altura <= 0) {
    return <p className="text-sm text-steel-500">Ingresa una base y altura válidas para ver la sección.</p>;
  }

  const drawW = VIEW_W - MARGIN_L - MARGIN_R;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / base, drawH / altura);

  const xLeft = MARGIN_L;
  const yTop = MARGIN_TOP;
  const w = base * scale;
  const h = altura * scale;
  const recubPx = recub * scale;

  const bars = flattenBarras(input);
  const bottomCount = Math.ceil(bars.length / 2);
  const bottomBars = bars.slice(0, bottomCount);
  const topBars = bars.slice(bottomCount);

  function rowCircles(dbs: number[], y: number) {
    if (dbs.length === 0) return null;
    const usableLeft = xLeft + recubPx + 4;
    const usableRight = xLeft + w - recubPx - 4;
    const step = dbs.length > 1 ? (usableRight - usableLeft) / (dbs.length - 1) : 0;
    return dbs.map((db, i) => (
      <circle
        key={i}
        cx={dbs.length > 1 ? usableLeft + i * step : (usableLeft + usableRight) / 2}
        cy={y}
        r={Math.max((db / 10) * scale * 0.5, 3)}
        fill={DIAGRAM_COLORS.rebar}
      />
    ));
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[220px]"
        role="img"
        aria-label="Sección transversal de viga de cimentación"
      >
        <rect x={xLeft} y={yTop} width={w} height={h} fill={DIAGRAM_COLORS.concrete} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} />

        <rect
          x={xLeft + recubPx}
          y={yTop + recubPx}
          width={w - 2 * recubPx}
          height={h - 2 * recubPx}
          fill="none"
          stroke={DIAGRAM_COLORS.stirrup}
          strokeWidth={2}
        />

        {rowCircles(topBars, yTop + recubPx + 2)}
        {rowCircles(bottomBars, yTop + h - recubPx - 2)}

        <HDim x1={xLeft} x2={xLeft + w} y={yTop + h + 20} label={`b=${fmt(base)}cm`} labelBelow />
        <VDim y1={yTop} y2={yTop + h} x={xLeft - 20} label={`h=${fmt(altura)}cm`} />
      </svg>
      <p className="mt-1 text-xs text-steel-500">
        {grupoLabel(input) || "sin barras"} ({bottomBars.length} inf. / {topBars.length} sup., continuo) · estribo
        cerrado Ø{getRebar(input.diametroEstribosId).diameterMm}mm @ {fmt(input.separacionEstribos)}cm
      </p>
    </div>
  );
}

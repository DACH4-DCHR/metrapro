import type { EscaleraInput, TramoInput } from "../../lib/calc/escalera";
import { HDim, VDim, DIAGRAM_COLORS, fmt } from "./svgHelpers";

interface EscaleraProfileProps {
  input: EscaleraInput;
}

const VIEW_H = 260;
const MARGIN_L = 65;
const MARGIN_R = 30;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 50;

function stepPoints(tramo: TramoInput, startX: number, startY: number): { points: [number, number][]; endX: number; endY: number } {
  const points: [number, number][] = [[startX, startY]];
  let x = startX;
  let y = startY;
  const n = Math.max(tramo.numeroPeldanos, 0);
  for (let i = 0; i < n; i++) {
    y += tramo.contrahuella;
    points.push([x, y]);
    if (i < n - 1) {
      x += tramo.huella;
      points.push([x, y]);
    }
  }
  return { points, endX: x, endY: y };
}

export function EscaleraProfile({ input }: EscaleraProfileProps) {
  const esMultiTramo = input.tipo !== "un_tramo";
  const t1 = stepPoints(input.tramo1, 0, 0);

  let allPoints = t1.points;
  let landingRect: { x: number; y: number; w: number } | null = null;
  let totalEndX = t1.endX;

  if (esMultiTramo && input.tramo2 && input.descanso) {
    const landingLargo = input.descanso.largo * 100;
    landingRect = { x: t1.endX, y: t1.endY, w: landingLargo };
    const t2Start = t1.endX + landingLargo;
    const t2 = stepPoints(input.tramo2, t2Start, t1.endY);
    allPoints = [...t1.points, [t2Start, t1.endY], ...t2.points];
    totalEndX = t2.endX;
  }

  const totalWidthCm = totalEndX;
  const totalHeightCm = input.alturaEntrePisos * 100;

  if (totalWidthCm <= 0 || totalHeightCm <= 0) {
    return <p className="text-sm text-steel-500">Ingresa datos válidos de peldaños para ver el perfil.</p>;
  }

  const drawW = 560 - MARGIN_L - MARGIN_R;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / totalWidthCm, drawH / totalHeightCm);
  const viewW = totalWidthCm * scale + MARGIN_L + MARGIN_R;

  const espesorPx = Math.max(input.espesorLosaInclinada * scale, 2);
  const originX = MARGIN_L;
  const originY = MARGIN_TOP + totalHeightCm * scale; // y=0 (piso inferior) queda abajo

  const toPx = ([x, y]: [number, number]) => [originX + x * scale, originY - y * scale] as const;

  const stepPath = allPoints.map(toPx);
  const gargantaStart = toPx([allPoints[0][0], allPoints[0][1]]);
  const gargantaEnd = toPx([allPoints[allPoints.length - 1][0], allPoints[allPoints.length - 1][1]]);

  // Polígono relleno: perfil de peldaños arriba, línea de garganta (offset vertical) abajo.
  const fillPath = [
    ...stepPath,
    [gargantaEnd[0], gargantaEnd[1] + espesorPx],
    [gargantaStart[0], gargantaStart[1] + espesorPx],
  ]
    .map((p) => p.join(","))
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${viewW} ${VIEW_H}`} className="w-full min-w-[420px]" role="img" aria-label="Perfil de escalera">
        <polygon fill={DIAGRAM_COLORS.concrete} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} points={fillPath} />
        <polyline
          fill="none"
          stroke={DIAGRAM_COLORS.concreteStroke}
          strokeWidth={1.5}
          points={stepPath.map((p) => p.join(",")).join(" ")}
        />

        {landingRect && (
          <rect
            x={originX + landingRect.x * scale}
            y={originY - landingRect.y * scale}
            width={landingRect.w * scale}
            height={espesorPx}
            fill={DIAGRAM_COLORS.concrete}
            stroke={DIAGRAM_COLORS.concreteStroke}
            strokeWidth={1}
          />
        )}

        <VDim y1={originY - totalHeightCm * scale} y2={originY} x={originX - 24} label={`${fmt(input.alturaEntrePisos, 2)}m`} />
        <HDim
          x1={originX}
          x2={originX + totalWidthCm * scale}
          y={VIEW_H - 20}
          label={`desarrollo ${fmt(totalWidthCm / 100, 2)}m`}
          labelBelow
        />
      </svg>
      <p className="mt-1 text-xs text-steel-500">
        Perfil esquemático (elevación desarrollada){input.tipo === "L" || input.tipo === "U" ? " — no representa el giro en planta" : ""}
        {" · garganta "}
        {fmt(input.espesorLosaInclinada)} cm
      </p>
    </div>
  );
}

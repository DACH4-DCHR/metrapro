import { getRebar } from "../../lib/materials";
import type { VigaCimentacionInput } from "../../lib/calc/vigaCimentacion";
import type { BarraGrupo } from "../../lib/calc/viga";
import { HDim, VDim, DIAGRAM_COLORS, fmt, BlueprintGrid } from "./svgHelpers";

interface VigaCimentacionCrossSectionProps {
  input: VigaCimentacionInput;
}

const VIEW_W = 300;
const VIEW_H = 300;
const MARGIN_L = 55;
const MARGIN_R = 30;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 50;

function flattenBarras(grupos: BarraGrupo[]): string[] {
  const ids: string[] = [];
  for (const g of grupos) {
    for (let i = 0; i < Math.max(g.cantidad, 0); i++) ids.push(g.diametroId);
  }
  return ids;
}

function grupoLabel(grupos: BarraGrupo[]): string {
  return grupos
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

  const bottomIds = flattenBarras(input.barrasInferiores);
  const topIds = flattenBarras(input.barrasSuperiores);
  const lateralIds = flattenBarras(input.barrasLaterales);

  function rowCircles(ids: string[], y: number, keyPrefix: string) {
    if (ids.length === 0) return null;
    const usableLeft = xLeft + recubPx + 4;
    const usableRight = xLeft + w - recubPx - 4;
    const step = ids.length > 1 ? (usableRight - usableLeft) / (ids.length - 1) : 0;
    return ids.map((diametroId, i) => {
      const rebar = getRebar(diametroId);
      return (
        <circle
          key={`${keyPrefix}-${i}`}
          cx={ids.length > 1 ? usableLeft + i * step : (usableLeft + usableRight) / 2}
          cy={y}
          r={Math.max((rebar.diameterMm / 10) * scale * 0.5, 3)}
          fill={rebar.color}
        />
      );
    });
  }

  // "cantidad" en barrasLaterales es el total de barras (ambas caras del alma), igual
  // que en las mallas inf./sup. — se reparte en dos columnas (izquierda/derecha).
  function columnCircles(ids: string[]) {
    if (ids.length === 0) return null;
    const leftCount = Math.ceil(ids.length / 2);
    const leftIds = ids.slice(0, leftCount);
    const rightIds = ids.slice(leftCount);

    function column(colIds: string[], x: number, keyPrefix: string) {
      const usableTop = yTop + recubPx + 4;
      const usableBottom = yTop + h - recubPx - 4;
      const step = colIds.length > 1 ? (usableBottom - usableTop) / (colIds.length - 1) : 0;
      return colIds.map((diametroId, i) => {
        const rebar = getRebar(diametroId);
        const cy = colIds.length > 1 ? usableTop + i * step : (usableTop + usableBottom) / 2;
        return (
          <circle
            key={`${keyPrefix}-${i}`}
            cx={x}
            cy={cy}
            r={Math.max((rebar.diameterMm / 10) * scale * 0.5, 3)}
            fill={rebar.color}
          />
        );
      });
    }

    return (
      <>
        {column(leftIds, xLeft + recubPx, "lat-l")}
        {column(rightIds, xLeft + w - recubPx, "lat-r")}
      </>
    );
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[340px]"
        role="img"
        aria-label="Sección transversal de viga de cimentación"
      >
        <BlueprintGrid width={VIEW_W} height={VIEW_H} id="grid-vigacim" />

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

        {rowCircles(topIds, yTop + recubPx + 2, "top")}
        {rowCircles(bottomIds, yTop + h - recubPx - 2, "bottom")}
        {columnCircles(lateralIds)}

        <HDim x1={xLeft} x2={xLeft + w} y={yTop + h + 20} label={`b=${fmt(base)}cm`} labelBelow />
        <VDim y1={yTop} y2={yTop + h} x={xLeft - 20} label={`h=${fmt(altura)}cm`} />
      </svg>
      <p className="mt-1 text-xs text-steel-500">
        {grupoLabel(input.barrasInferiores) || "sin barras"} inf. + {grupoLabel(input.barrasSuperiores) || "sin barras"} sup.
        {lateralIds.length > 0 && ` + ${grupoLabel(input.barrasLaterales)} lat.`} · estribo cerrado Ø
        {getRebar(input.diametroEstribosId).diameterMm}mm @ {fmt(input.separacionEstribos)}cm
      </p>
    </div>
  );
}

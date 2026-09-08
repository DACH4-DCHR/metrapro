import { getRebar } from "../../lib/materials";
import type { PlacaInput } from "../../lib/calc/placa";
import { HDim, VDim, DIAGRAM_COLORS, fmt, BlueprintGrid } from "./svgHelpers";

interface PlacaElevationProps {
  input: PlacaInput;
}

const VIEW_W = 420;
const VIEW_H = 300;
const MARGIN_L = 60;
const MARGIN_R = 30;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 50;

export function PlacaElevation({ input }: PlacaElevationProps) {
  const { longitud, alturaLibre } = input;
  if (longitud <= 0 || alturaLibre <= 0) {
    return <p className="text-sm text-steel-500">Ingresa una longitud y altura válidas para ver la elevación.</p>;
  }

  const drawW = VIEW_W - MARGIN_L - MARGIN_R;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / longitud, drawH / alturaLibre);

  const x0 = MARGIN_L;
  const y0 = MARGIN_TOP;
  const w = longitud * scale;
  const h = alturaLibre * scale;

  const sepVM = Math.max(input.separacionVertical, 1) / 100;
  const sepHM = Math.max(input.separacionHorizontal, 1) / 100;

  const verticales: number[] = [];
  for (let x = 0; x < longitud; x += sepVM) verticales.push(x);
  const horizontales: number[] = [];
  for (let y = 0; y < alturaLibre; y += sepHM) horizontales.push(y);

  const anchoBordeM = Math.min(input.anchoElementoBorde / 100, longitud / 2);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-lg"
        role="img"
        aria-label="Elevación de placa con refuerzo distribuido"
      >
        <BlueprintGrid width={VIEW_W} height={VIEW_H} id="grid-placa" />

        <rect x={x0} y={y0} width={w} height={h} fill={DIAGRAM_COLORS.concrete} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1.5} />

        {input.incluirElementoBorde && anchoBordeM > 0 && (
          <>
            <rect x={x0} y={y0} width={anchoBordeM * scale} height={h} fill={DIAGRAM_COLORS.arcilla} opacity={0.35} />
            <rect x={x0 + w - anchoBordeM * scale} y={y0} width={anchoBordeM * scale} height={h} fill={DIAGRAM_COLORS.arcilla} opacity={0.35} />
          </>
        )}

        {verticales.map((x, i) => (
          <line key={`v-${i}`} x1={x0 + x * scale} y1={y0} x2={x0 + x * scale} y2={y0 + h} stroke={DIAGRAM_COLORS.rebar} strokeWidth={1} />
        ))}
        {horizontales.map((y, i) => (
          <line key={`h-${i}`} x1={x0} y1={y0 + y * scale} x2={x0 + w} y2={y0 + y * scale} stroke={DIAGRAM_COLORS.rebar} strokeWidth={1} />
        ))}

        <rect x={x0} y={y0} width={w} height={h} fill="none" stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1.5} />

        <HDim x1={x0} x2={x0 + w} y={y0 + h + 20} label={`L=${fmt(longitud, 2)}m`} labelBelow />
        <VDim y1={y0} y2={y0 + h} x={x0 - 24} label={`h=${fmt(alturaLibre, 2)}m`} />
      </svg>
      <p className="mt-1 text-xs text-steel-500">
        Refuerzo distribuido {input.numeroCapas === 2 ? "(2 capas)" : "(1 capa)"} — Ø
        {getRebar(input.diametroVerticalId).diameterMm}mm@{fmt(input.separacionVertical)}cm vert. · Ø
        {getRebar(input.diametroHorizontalId).diameterMm}mm@{fmt(input.separacionHorizontal)}cm horiz.
        {input.incluirElementoBorde && " · zonas sombreadas: elementos de borde"}
      </p>
    </div>
  );
}

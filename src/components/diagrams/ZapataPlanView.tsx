import type { ZapataInput } from "../../lib/calc/zapata";
import { HDim, VDim, DIAGRAM_COLORS, fmt, BlueprintGrid } from "./svgHelpers";

interface ZapataPlanViewProps {
  input: ZapataInput;
}

const VIEW_W = 420;
const VIEW_H = 340;
const MARGIN_L = 60;
const MARGIN_R = 40;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 50;

export function ZapataPlanView({ input }: ZapataPlanViewProps) {
  const { largo, ancho } = input;
  if (largo <= 0 || ancho <= 0) {
    return <p className="text-sm text-steel-500">Ingresa un largo y ancho válidos para ver la planta.</p>;
  }

  const drawW = VIEW_W - MARGIN_L - MARGIN_R;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / largo, drawH / ancho);

  const x0 = MARGIN_L;
  const y0 = MARGIN_TOP;
  const w = largo * scale;
  const h = ancho * scale;

  const sepXM = Math.max(input.separacionInferiorX, 1) / 100;
  const sepYM = Math.max(input.separacionInferiorY, 1) / 100;

  const barrasX: number[] = [];
  for (let y = 0; y < ancho; y += sepXM) barrasX.push(y);
  const barrasY: number[] = [];
  for (let x = 0; x < largo; x += sepYM) barrasY.push(x);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-lg"
        role="img"
        aria-label="Vista en planta de zapata con malla de acero"
      >
        <BlueprintGrid width={VIEW_W} height={VIEW_H} id="grid-zapata" />

        <rect x={x0} y={y0} width={w} height={h} fill={DIAGRAM_COLORS.concrete} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1.5} />

        {/* Barras "X": paralelas al largo, horizontales */}
        {barrasX.map((y, i) => (
          <line key={`x-${i}`} x1={x0} y1={y0 + y * scale} x2={x0 + w} y2={y0 + y * scale} stroke={DIAGRAM_COLORS.rebar} strokeWidth={1.5} />
        ))}
        {/* Barras "Y": paralelas al ancho, verticales */}
        {barrasY.map((x, i) => (
          <line key={`y-${i}`} x1={x0 + x * scale} y1={y0} x2={x0 + x * scale} y2={y0 + h} stroke={DIAGRAM_COLORS.rebar} strokeWidth={1.5} />
        ))}

        <HDim x1={x0} x2={x0 + w} y={y0 + h + 20} label={`largo=${fmt(largo, 2)}m`} labelBelow />
        <VDim y1={y0} y2={y0 + h} x={x0 - 24} label={`ancho=${fmt(ancho, 2)}m`} />
      </svg>
      <p className="mt-1 text-xs text-steel-500">
        Vista en planta, malla inferior (no a escala real){input.incluirMallaSuperior ? " · incluye malla superior (no graficada)" : ""}
      </p>
    </div>
  );
}

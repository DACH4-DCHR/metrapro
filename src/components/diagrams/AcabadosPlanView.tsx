import type { AcabadosInput } from "../../lib/calc/acabados";
import { HDim, VDim, fmt, BlueprintGrid } from "./svgHelpers";

interface AcabadosPlanViewProps {
  input: AcabadosInput;
}

const VIEW_W = 420;
const VIEW_H = 340;
const MARGIN_L = 60;
const MARGIN_R = 40;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 50;
const WALL_THICKNESS = 6;

export function AcabadosPlanView({ input }: AcabadosPlanViewProps) {
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

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-lg"
        role="img"
        aria-label="Vista en planta del ambiente"
      >
        <BlueprintGrid width={VIEW_W} height={VIEW_H} id="grid-acabados" />

        <rect
          x={x0 - WALL_THICKNESS}
          y={y0 - WALL_THICKNESS}
          width={w + WALL_THICKNESS * 2}
          height={h + WALL_THICKNESS * 2}
          fill="none"
          stroke="#4d5c6d"
          strokeWidth={WALL_THICKNESS}
        />
        <rect x={x0} y={y0} width={w} height={h} fill="#fdf6e8" stroke="#d98c2b" strokeWidth={1} />
        <text x={x0 + w / 2} y={y0 + h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={12} fill="#647485">
          {fmt(largo * ancho, 2)} m²
        </text>

        <HDim x1={x0} x2={x0 + w} y={y0 + h + 20} label={`largo=${fmt(largo, 2)}m`} labelBelow />
        <VDim y1={y0} y2={y0 + h} x={x0 - 24} label={`ancho=${fmt(ancho, 2)}m`} />
      </svg>
      <p className="mt-1 text-xs text-steel-500">Vista en planta del ambiente (no a escala real)</p>
    </div>
  );
}

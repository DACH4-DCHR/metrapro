import { estribosPositionsM, type VigaInput } from "../../lib/calc/viga";
import { HDim, DIAGRAM_COLORS, fmt } from "./svgHelpers";

interface VigaElevationProps {
  input: VigaInput;
}

const VIEW_W = 560;
const VIEW_H = 140;
const MARGIN_X = 30;
const MARGIN_TOP = 20;
const BEAM_H = 40;

export function VigaElevation({ input }: VigaElevationProps) {
  const longitud = input.longitud;
  if (longitud <= 0) return null;

  const drawW = VIEW_W - MARGIN_X * 2;
  const scale = drawW / longitud;
  const x0 = MARGIN_X;
  const yTop = MARGIN_TOP;
  const yBottom = MARGIN_TOP + BEAM_H;

  const positions = estribosPositionsM(input);
  const loM = input.longitudConfinamiento / 100;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full min-w-[420px]" role="img" aria-label="Elevación de viga con distribución de estribos">
        {input.incluirConfinamiento && (
          <>
            <rect x={x0} y={yTop} width={Math.min(loM, longitud) * scale} height={BEAM_H} fill="#fef3e2" />
            <rect
              x={x0 + Math.max(longitud - loM, 0) * scale}
              y={yTop}
              width={Math.min(loM, longitud) * scale}
              height={BEAM_H}
              fill="#fef3e2"
            />
          </>
        )}
        <rect
          x={x0}
          y={yTop}
          width={longitud * scale}
          height={BEAM_H}
          fill="none"
          stroke={DIAGRAM_COLORS.concreteStroke}
          strokeWidth={1}
        />
        {positions.map((p, i) => (
          <line
            key={i}
            x1={x0 + p * scale}
            y1={yTop}
            x2={x0 + p * scale}
            y2={yBottom}
            stroke={DIAGRAM_COLORS.stirrup}
            strokeWidth={1.5}
          />
        ))}
        <HDim x1={x0} x2={x0 + longitud * scale} y={yBottom + 20} label={`L=${fmt(longitud, 2)}m`} labelBelow />
      </svg>
      <p className="mt-1 text-xs text-steel-500">
        {positions.length} estribos por viga
        {input.incluirConfinamiento
          ? " · zonas sombreadas = confinamiento (Lo en cada extremo)"
          : " · separación uniforme"}
      </p>
    </div>
  );
}

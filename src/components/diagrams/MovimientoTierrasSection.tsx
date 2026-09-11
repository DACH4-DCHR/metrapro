import type { MovimientoTierrasInput } from "../../lib/calc/movimientoTierras";
import { HDim, VDim, DIAGRAM_COLORS, fmt, BlueprintGrid } from "./svgHelpers";

interface MovimientoTierrasSectionProps {
  input: MovimientoTierrasInput;
  anchoExcavacion: number; // m, ya con sobreancho de trabajo
  volumenExcavacion: number; // m3, ya calculado (evita repetir la fórmula aquí)
}

const VIEW_W = 280;
const VIEW_H = 300;
const MARGIN_L = 55;
const MARGIN_R = 30;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 55;

export function MovimientoTierrasSection({ input, anchoExcavacion, volumenExcavacion }: MovimientoTierrasSectionProps) {
  const { profundidad, volumenOcupadoCimentacion } = input;
  if (anchoExcavacion <= 0 || profundidad <= 0) {
    return <p className="text-sm text-steel-500">Ingresa un ancho y profundidad válidos para ver la sección.</p>;
  }

  const drawW = VIEW_W - MARGIN_L - MARGIN_R;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / anchoExcavacion, drawH / profundidad);

  const x0 = MARGIN_L;
  const y0 = MARGIN_TOP;
  const w = anchoExcavacion * scale;
  const h = profundidad * scale;

  // Bloque de cimentación esquemático: mismo ancho de la excavación, altura
  // proporcional al volumen que ocupará dentro del volumen total excavado (no a
  // escala real, solo para mostrar relleno arriba/alrededor vs. concreto abajo).
  const fraccionOcupada =
    volumenExcavacion > 0 ? Math.min(Math.max(volumenOcupadoCimentacion, 0) / volumenExcavacion, 1) : 0;
  const hCimentacion = h * fraccionOcupada;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[360px]"
        role="img"
        aria-label="Sección transversal de la excavación para cimentación"
      >
        <BlueprintGrid width={VIEW_W} height={VIEW_H} id="grid-movtierras" />

        {/* Nivel de terreno natural */}
        <line x1={x0 - 25} y1={y0} x2={x0 + w + 25} y2={y0} stroke={DIAGRAM_COLORS.arcillaStroke} strokeWidth={1.5} />
        {Array.from({ length: 10 }, (_, i) => {
          const gx = x0 - 22 + i * ((w + 44) / 9);
          return <line key={i} x1={gx} y1={y0} x2={gx - 6} y2={y0 - 7} stroke={DIAGRAM_COLORS.arcillaStroke} strokeWidth={1} />;
        })}

        {/* Excavación (relleno de material propio tras vaciar la cimentación) */}
        <rect x={x0} y={y0} width={w} height={h} fill={DIAGRAM_COLORS.arcilla} fillOpacity={0.28} stroke={DIAGRAM_COLORS.arcillaStroke} strokeWidth={1.5} strokeDasharray="4 3" />

        {/* Bloque de cimentación dentro de la excavación */}
        {hCimentacion > 0 && (
          <rect
            x={x0}
            y={y0 + h - hCimentacion}
            width={w}
            height={hCimentacion}
            fill={DIAGRAM_COLORS.concrete}
            stroke={DIAGRAM_COLORS.concreteStroke}
            strokeWidth={1.5}
          />
        )}

        <HDim x1={x0} x2={x0 + w} y={y0 + h + 20} label={`${fmt(anchoExcavacion, 2)}m`} labelBelow />
        <VDim y1={y0} y2={y0 + h} x={x0 - 20} label={`${fmt(profundidad, 2)}m`} />
      </svg>
      <p className="mt-1 text-xs text-steel-500">
        Excavación (tono tierra) + cimentación esquemática (gris) — no a escala real
      </p>
    </div>
  );
}

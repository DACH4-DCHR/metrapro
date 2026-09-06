import { getRebar } from "../../lib/materials";
import type { VigaInput } from "../../lib/calc/viga";
import { HDim, VDim, DIAGRAM_COLORS, fmt } from "./svgHelpers";

interface VigaCrossSectionProps {
  input: VigaInput;
}

const VIEW_W = 320;
const VIEW_H = 300;
const MARGIN_L = 55;
const MARGIN_R = 30;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 50;

export function VigaCrossSection({ input }: VigaCrossSectionProps) {
  if (input.tipoSeccion === "personalizada") {
    return (
      <p className="text-sm text-steel-500">
        Vista no disponible para sección personalizada (solo se conoce el área y el perímetro).
      </p>
    );
  }

  const base = input.base;
  const altura = input.altura;
  const recub = input.recubrimiento;
  const alaAncho = input.tipoSeccion === "T" ? input.alaAncho ?? base : base;
  const alaEspesor = input.tipoSeccion === "T" ? input.alaEspesor ?? 0 : 0;

  if (base <= 0 || altura <= 0) {
    return <p className="text-sm text-steel-500">Ingresa una base y altura válidas para ver la sección.</p>;
  }

  const totalWidthCm = Math.max(alaAncho, base);
  const drawW = VIEW_W - MARGIN_L - MARGIN_R;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / totalWidthCm, drawH / altura);

  const xCenter = MARGIN_L + (totalWidthCm * scale) / 2;
  const yTop = MARGIN_TOP;
  const yBottom = MARGIN_TOP + altura * scale;

  const webX = xCenter - (base * scale) / 2;
  const alaX = xCenter - (alaAncho * scale) / 2;

  const n = Math.max(input.numeroBarrasLongitudinales, 0);
  const bottomCount = Math.ceil(n / 2);
  const topCount = n - bottomCount;
  const dbLong = getRebar(input.diametroLongitudinalId).diameterMm;
  const recubPx = recub * scale;

  function rowCircles(count: number, y: number, xLeft: number, xRight: number) {
    if (count <= 0) return null;
    const usableLeft = xLeft + recubPx + 4;
    const usableRight = xRight - recubPx - 4;
    const step = count > 1 ? (usableRight - usableLeft) / (count - 1) : 0;
    return Array.from({ length: count }).map((_, i) => (
      <circle
        key={i}
        cx={count > 1 ? usableLeft + i * step : (usableLeft + usableRight) / 2}
        cy={y}
        r={Math.max((dbLong / 10) * scale * 0.5, 3)}
        fill={DIAGRAM_COLORS.rebar}
      />
    ));
  }

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full min-w-[260px]" role="img" aria-label="Sección transversal de viga">
        {input.tipoSeccion === "T" && alaEspesor > 0 && (
          <rect
            x={alaX}
            y={yTop}
            width={alaAncho * scale}
            height={alaEspesor * scale}
            fill={DIAGRAM_COLORS.concrete}
            stroke={DIAGRAM_COLORS.concreteStroke}
            strokeWidth={1}
          />
        )}
        <rect
          x={webX}
          y={yTop + alaEspesor * scale}
          width={base * scale}
          height={(altura - alaEspesor) * scale}
          fill={DIAGRAM_COLORS.concrete}
          stroke={DIAGRAM_COLORS.concreteStroke}
          strokeWidth={1}
        />

        {/* Estribo: perímetro interior, inset por el recubrimiento */}
        <rect
          x={webX + recubPx}
          y={yTop + alaEspesor * scale + recubPx}
          width={base * scale - 2 * recubPx}
          height={(altura - alaEspesor) * scale - 2 * recubPx - (alaEspesor > 0 ? 0 : 0)}
          fill="none"
          stroke={DIAGRAM_COLORS.stirrup}
          strokeWidth={2}
        />

        {/* Barras longitudinales */}
        {rowCircles(topCount, yTop + recubPx + 2, webX, webX + base * scale)}
        {rowCircles(bottomCount, yBottom - recubPx - 2, webX, webX + base * scale)}

        {/* Cotas */}
        <HDim x1={webX} x2={webX + base * scale} y={yBottom + 20} label={`b=${fmt(base)}cm`} labelBelow />
        <VDim y1={yTop} y2={yBottom} x={webX - 20} label={`h=${fmt(altura)}cm`} />
      </svg>
      <p className="mt-1 text-xs text-steel-500">
        {n} Ø{dbLong}mm ({topCount} sup. / {bottomCount} inf., distribución referencial) · estribo Ø
        {getRebar(input.diametroEstribosId).diameterMm}mm
      </p>
    </div>
  );
}

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

// "Aplana" los grupos de barras en entradas individuales (una por barra) para poder
// dibujarlas y repartirlas entre la fila superior e inferior.
function flattenBarras(input: VigaInput): number[] {
  const dbs: number[] = [];
  for (const grupo of input.barrasLongitudinales) {
    const db = getRebar(grupo.diametroId).diameterMm;
    for (let i = 0; i < Math.max(grupo.cantidad, 0); i++) dbs.push(db);
  }
  return dbs;
}

function grupoLabel(input: VigaInput): string {
  return input.barrasLongitudinales
    .filter((g) => g.cantidad > 0)
    .map((g) => `${g.cantidad}Ø${getRebar(g.diametroId).diameterMm}mm`)
    .join(" + ");
}

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

  const bars = flattenBarras(input);
  const bottomCount = Math.ceil(bars.length / 2);
  const bottomBars = bars.slice(0, bottomCount);
  const topBars = bars.slice(bottomCount);
  const recubPx = recub * scale;

  function rowCircles(dbs: number[], y: number, xLeft: number, xRight: number) {
    if (dbs.length === 0) return null;
    const usableLeft = xLeft + recubPx + 4;
    const usableRight = xRight - recubPx - 4;
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

  const almaAlturaPx = (altura - alaEspesor) * scale;
  const pielCount = input.incluirAceroPiel ? Math.max(input.pielNumeroBarras, 0) : 0;
  const pielPerSide = Math.ceil(pielCount / 2);
  const pielDb = getRebar(input.pielDiametroId).diameterMm;

  function pielDots(xEdge: number, count: number) {
    if (count <= 0) return null;
    const yTopInner = yTop + alaEspesor * scale + recubPx + 10;
    const yBottomInner = yBottom - recubPx - 10;
    const step = count > 1 ? (yBottomInner - yTopInner) / (count + 1) : (yBottomInner - yTopInner) / 2;
    return Array.from({ length: count }).map((_, i) => (
      <circle key={i} cx={xEdge} cy={yTopInner + step * (i + 1)} r={Math.max((pielDb / 10) * scale * 0.5, 2.5)} fill={DIAGRAM_COLORS.rebar} />
    ));
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[240px]"
        role="img"
        aria-label="Sección transversal de viga"
      >
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
          height={almaAlturaPx}
          fill={DIAGRAM_COLORS.concrete}
          stroke={DIAGRAM_COLORS.concreteStroke}
          strokeWidth={1}
        />

        {/* Estribo: perímetro interior, inset por el recubrimiento */}
        <rect
          x={webX + recubPx}
          y={yTop + alaEspesor * scale + recubPx}
          width={base * scale - 2 * recubPx}
          height={almaAlturaPx - 2 * recubPx}
          fill="none"
          stroke={DIAGRAM_COLORS.stirrup}
          strokeWidth={2}
        />

        {/* Barras longitudinales */}
        {rowCircles(topBars, yTop + recubPx + 2, webX, webX + base * scale)}
        {rowCircles(bottomBars, yBottom - recubPx - 2, webX, webX + base * scale)}

        {/* Acero de piel */}
        {pielDots(webX + recubPx, pielPerSide)}
        {pielDots(webX + base * scale - recubPx, pielCount - pielPerSide)}

        {/* Cotas */}
        <HDim x1={webX} x2={webX + base * scale} y={yBottom + 20} label={`b=${fmt(base)}cm`} labelBelow />
        <VDim y1={yTop} y2={yBottom} x={webX - 20} label={`h=${fmt(altura)}cm`} />
      </svg>
      <p className="mt-1 text-xs text-steel-500">
        {grupoLabel(input) || "sin barras"} ({bottomBars.length} inf. / {topBars.length} sup., distribución
        referencial) · estribo Ø{getRebar(input.diametroEstribosId).diameterMm}mm
        {pielCount > 0 && ` · piel ${pielCount}Ø${pielDb}mm`}
      </p>
    </div>
  );
}

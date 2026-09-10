import type { LosaAligeradaInput } from "../../lib/calc/losaAligerada";
import { HDim, VDim, DIAGRAM_COLORS, fmt, BlueprintGrid } from "./svgHelpers";

interface LosaCrossSectionProps {
  input: LosaAligeradaInput;
}

const VIEW_W = 540;
const VIEW_H = 260;
const MARGIN_L = 60;
const MARGIN_R = 55;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 60;
const NUM_MODULES = 2.4;

export function LosaCrossSection({ input }: LosaCrossSectionProps) {
  const espesor = input.espesorLosa;
  const alturaLadrillo =
    input.tipoLadrillo === "personalizado" ? input.alturaLadrilloPersonalizado ?? 0 : Number(input.tipoLadrillo);
  const capaCompresion = Math.max(espesor - alturaLadrillo, 0);
  const s = input.separacionViguetas;
  const b0 = input.anchoVigueta;

  if (espesor <= 0 || s <= 0 || b0 <= 0) {
    return <p className="text-sm text-steel-500">Ingresa dimensiones válidas para ver el corte.</p>;
  }

  const drawW = VIEW_W - MARGIN_L - MARGIN_R;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const totalWidthCm = s * NUM_MODULES;
  const scale = Math.min(drawW / totalWidthCm, drawH / espesor);

  const x0 = MARGIN_L;
  const yTop = MARGIN_TOP;
  const yBottom = MARGIN_TOP + espesor * scale;
  const totalWpx = totalWidthCm * scale;

  const modules = Math.ceil(NUM_MODULES);
  const isArcilla = input.materialLadrillo === "arcilla";
  const ladrilloFill = isArcilla ? DIAGRAM_COLORS.arcilla : DIAGRAM_COLORS.tecnopor;
  const ladrilloStroke = isArcilla ? DIAGRAM_COLORS.arcillaStroke : DIAGRAM_COLORS.tecnoporStroke;

  // Barras de temperatura: puntos dentro de la capa de compresión, espaciados según el input.
  const tempSeparationPx = Math.max(input.temperaturaSeparacion, 1) * scale;
  const tempDots: number[] = [];
  for (let x = tempSeparationPx / 2; x < totalWpx; x += tempSeparationPx) {
    tempDots.push(x0 + x);
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-lg"
        role="img"
        aria-label="Corte transversal de losa aligerada"
      >
        <BlueprintGrid width={VIEW_W} height={VIEW_H} id="grid-losa-cross" />

        {/* Concreto continuo (capa + nervios) de fondo */}
        <rect
          x={x0}
          y={yTop}
          width={totalWpx}
          height={espesor * scale}
          fill={DIAGRAM_COLORS.concrete}
          stroke={DIAGRAM_COLORS.concreteStroke}
          strokeWidth={1}
        />

        {/* Bloques de ladrillo/tecnopor entre nervios */}
        {Array.from({ length: modules }).map((_, i) => {
          const moduleX = x0 + i * s * scale;
          const ladrilloX = moduleX + b0 * scale;
          const ladrilloW = (s - b0) * scale;
          const ladrilloH = alturaLadrillo * scale;
          if (ladrilloW <= 0 || ladrilloH <= 0) return null;
          return (
            <rect
              key={i}
              x={ladrilloX}
              y={yBottom - ladrilloH}
              width={ladrilloW}
              height={ladrilloH}
              fill={ladrilloFill}
              stroke={ladrilloStroke}
              strokeWidth={1}
            />
          );
        })}

        {/* Contornos de nervios (viguetas) */}
        {Array.from({ length: modules + 1 }).map((_, i) => {
          const moduleX = x0 + i * s * scale;
          if (moduleX > x0 + totalWpx) return null;
          return (
            <rect
              key={`nervio-${i}`}
              x={moduleX}
              y={yTop}
              width={b0 * scale}
              height={espesor * scale}
              fill="none"
              stroke={DIAGRAM_COLORS.concreteStroke}
              strokeWidth={1}
            />
          );
        })}

        {/* Línea de la capa de compresión */}
        <line
          x1={x0}
          y1={yTop + capaCompresion * scale}
          x2={x0 + totalWpx}
          y2={yTop + capaCompresion * scale}
          stroke={DIAGRAM_COLORS.concreteStroke}
          strokeWidth={1}
          strokeDasharray="4 3"
        />

        {/* Acero de temperatura */}
        {tempDots.map((cx, i) => (
          <circle key={i} cx={cx} cy={yTop + (capaCompresion * scale) / 2} r={3} fill={DIAGRAM_COLORS.rebar} />
        ))}

        {/* Acero principal de viguetas (si el método es por barras) */}
        {input.aceroViguetasMetodo === "barras" &&
          Array.from({ length: modules }).map((_, i) => {
            const moduleX = x0 + i * s * scale + (b0 * scale) / 2;
            const n = Math.max(input.numeroVarillasPorVigueta, 1);
            const spacing = Math.min((b0 * scale) / (n + 1), 6);
            return Array.from({ length: n }).map((__, j) => {
              const offset = (j - (n - 1) / 2) * spacing;
              return (
                <circle
                  key={`${i}-${j}`}
                  cx={moduleX + offset}
                  cy={yBottom - Math.max(alturaLadrillo, 2) * scale * 0.15 - 4}
                  r={2.6}
                  fill={DIAGRAM_COLORS.rebar}
                />
              );
            });
          })}

        {/* Cotas */}
        <VDim y1={yTop} y2={yBottom} x={x0 - 24} label={`e=${fmt(espesor)}cm`} />
        <VDim
          y1={yTop}
          y2={yTop + capaCompresion * scale}
          x={x0 + totalWpx + 20}
          label={`${fmt(capaCompresion)}cm`}
          labelLeft={false}
        />
        <HDim x1={x0} x2={x0 + s * scale} y={yBottom + 20} label={`s=${fmt(s)}cm`} labelBelow />
        <HDim
          x1={x0}
          x2={x0 + b0 * scale}
          y={yBottom + 44}
          label={`b0=${fmt(b0)}cm`}
          labelBelow
        />
      </svg>
      <p className="mt-1 text-xs text-steel-500">
        Corte transversal esquemático (no a escala real) ·{" "}
        {isArcilla ? "ladrillo de arcilla" : "bloque de tecnopor (EPS)"} de {fmt(alturaLadrillo)} cm
      </p>
    </div>
  );
}

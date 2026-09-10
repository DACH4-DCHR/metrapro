import type { ConcretoCiclopeoInput } from "../../lib/calc/concretoCiclopeo";
import { HDim, VDim, DIAGRAM_COLORS, fmt, BlueprintGrid } from "./svgHelpers";

interface ConcretoCiclopeoSectionProps {
  input: ConcretoCiclopeoInput;
  stoneLabel: string; // "P.G." o "P.M."
}

const VIEW_W = 260;
const VIEW_H = 300;
const MARGIN_L = 50;
const MARGIN_R = 30;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 50;

// Distribución pseudoaleatoria pero determinística (no depende de Math.random,
// para que el diagrama no "parpadee" en cada render) de las piedras desplazadoras
// dentro de la sección, en proporción aproximada al % de piedra ingresado.
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function stonePositions(count: number): { fx: number; fy: number; fr: number }[] {
  const positions: { fx: number; fy: number; fr: number }[] = [];
  for (let i = 0; i < count; i++) {
    const fx = 0.15 + pseudoRandom(i * 2 + 1) * 0.7;
    const fy = 0.15 + pseudoRandom(i * 2 + 2) * 0.7;
    const fr = 0.06 + pseudoRandom(i * 2 + 3) * 0.05;
    positions.push({ fx, fy, fr });
  }
  return positions;
}

export function ConcretoCiclopeoSection({ input, stoneLabel }: ConcretoCiclopeoSectionProps) {
  const { ancho, altura, porcentajePiedra } = input;
  if (ancho <= 0 || altura <= 0) {
    return <p className="text-sm text-steel-500">Ingresa un ancho y altura válidos para ver la sección.</p>;
  }

  const drawW = VIEW_W - MARGIN_L - MARGIN_R;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scale = Math.min(drawW / ancho, drawH / altura);

  const x0 = MARGIN_L;
  const y0 = MARGIN_TOP;
  const w = ancho * scale;
  const h = altura * scale;

  const stoneCount = Math.round(Math.min(Math.max(porcentajePiedra, 0), 30) / 3);
  const minSide = Math.min(w, h);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[340px]"
        role="img"
        aria-label="Sección transversal de concreto ciclópeo"
      >
        <BlueprintGrid width={VIEW_W} height={VIEW_H} id="grid-ciclopeo" />

        <rect x={x0} y={y0} width={w} height={h} fill={DIAGRAM_COLORS.concrete} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1.5} />

        {stonePositions(stoneCount).map((p, i) => (
          <circle
            key={i}
            cx={x0 + p.fx * w}
            cy={y0 + p.fy * h}
            r={p.fr * minSide}
            fill={DIAGRAM_COLORS.arcilla}
            stroke={DIAGRAM_COLORS.arcillaStroke}
            strokeWidth={0.5}
          />
        ))}

        <HDim x1={x0} x2={x0 + w} y={y0 + h + 20} label={`${fmt(ancho)}cm`} labelBelow />
        <VDim y1={y0} y2={y0 + h} x={x0 - 20} label={`${fmt(altura)}cm`} />
      </svg>
      <p className="mt-1 text-xs text-steel-500">
        Concreto ciclópeo + {fmt(porcentajePiedra)}% {stoneLabel} (piedra referencial, no a escala real)
      </p>
    </div>
  );
}

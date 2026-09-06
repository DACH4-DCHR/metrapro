// Utilidades mínimas para dibujar líneas de cota en los diagramas técnicos SVG.

const DIM_COLOR = "#647485"; // steel-500
const TICK = 4;

export function HDim({
  x1,
  x2,
  y,
  label,
  labelBelow = false,
}: {
  x1: number;
  x2: number;
  y: number;
  label: string;
  labelBelow?: boolean;
}) {
  const mid = (x1 + x2) / 2;
  return (
    <g stroke={DIM_COLOR} strokeWidth={1} fontSize={11} fill={DIM_COLOR}>
      <line x1={x1} y1={y - TICK} x2={x1} y2={y + TICK} />
      <line x1={x2} y1={y - TICK} x2={x2} y2={y + TICK} />
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <text
        x={mid}
        y={labelBelow ? y + 14 : y - 6}
        textAnchor="middle"
        stroke="none"
        fontFamily="inherit"
      >
        {label}
      </text>
    </g>
  );
}

export function VDim({
  y1,
  y2,
  x,
  label,
  labelLeft = true,
}: {
  y1: number;
  y2: number;
  x: number;
  label: string;
  labelLeft?: boolean;
}) {
  const mid = (y1 + y2) / 2;
  return (
    <g stroke={DIM_COLOR} strokeWidth={1} fontSize={11} fill={DIM_COLOR}>
      <line x1={x - TICK} y1={y1} x2={x + TICK} y2={y1} />
      <line x1={x - TICK} y1={y2} x2={x + TICK} y2={y2} />
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <text
        x={labelLeft ? x - 8 : x + 8}
        y={mid}
        textAnchor={labelLeft ? "end" : "start"}
        dominantBaseline="middle"
        stroke="none"
        fontFamily="inherit"
      >
        {label}
      </text>
    </g>
  );
}

export const DIAGRAM_COLORS = {
  concrete: "#b3bfc9", // steel-300
  concreteStroke: "#4d5c6d", // steel-600
  arcilla: "#c17a4f",
  arcillaStroke: "#8a5433",
  tecnopor: "#eef3f7",
  tecnoporStroke: "#9fb0bd",
  rebar: "#0b1f3a", // navy-900
  stirrup: "#d98c2b", // amber-500
  dimText: DIM_COLOR,
};

export function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals).replace(/\.0+$/, "");
}

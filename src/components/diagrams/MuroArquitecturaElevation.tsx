import type { MuroArquitecturaInput } from "../../lib/calc/muroArquitectura";
import { HDim, VDim, DIAGRAM_COLORS, fmt, BlueprintGrid } from "./svgHelpers";

interface MuroArquitecturaElevationProps {
  input: MuroArquitecturaInput;
}

const VIEW_W = 420;
const VIEW_H = 300;
const MARGIN_L = 60;
const MARGIN_R = 30;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 50;

export function MuroArquitecturaElevation({ input }: MuroArquitecturaElevationProps) {
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

  const largoM = Math.max(input.largoUnidad, 1) / 100;
  const altoM = Math.max(input.alturaUnidad, 1) / 100;
  const filas = Math.max(Math.round(alturaLibre / altoM), 1);
  const filaAlturaPx = h / filas;

  const columnetas: number[] = [];
  if (input.incluirArriostres && input.numeroColumnetas >= 2) {
    for (let i = 0; i < input.numeroColumnetas; i++) {
      columnetas.push((i * longitud) / (input.numeroColumnetas - 1));
    }
  }
  const peralteColumnetaM = input.peralteColumneta / 100;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-xl"
        role="img"
        aria-label="Elevación de muro de arquitectura (tabique)"
      >
        <BlueprintGrid width={VIEW_W} height={VIEW_H} id="grid-muroarq" />

        <rect x={x0} y={y0} width={w} height={h} fill={DIAGRAM_COLORS.tecnopor} stroke={DIAGRAM_COLORS.tecnoporStroke} strokeWidth={1} />

        {Array.from({ length: filas }).map((_, row) => {
          const y = y0 + h - (row + 1) * filaAlturaPx;
          const offset = row % 2 === 1 ? (largoM * scale) / 2 : 0;
          const juntas: number[] = [];
          for (let x = -offset; x < w; x += largoM * scale) juntas.push(x);
          return (
            <g key={row}>
              <line x1={x0} y1={y} x2={x0 + w} y2={y} stroke={DIAGRAM_COLORS.tecnoporStroke} strokeWidth={0.75} />
              {juntas.map((x, i) => (
                <line
                  key={i}
                  x1={x0 + Math.max(x, 0)}
                  y1={y}
                  x2={x0 + Math.max(x, 0)}
                  y2={y + filaAlturaPx}
                  stroke={DIAGRAM_COLORS.tecnoporStroke}
                  strokeWidth={0.75}
                />
              ))}
            </g>
          );
        })}

        {input.incluirArriostres &&
          columnetas.map((x, i) => (
            <rect
              key={i}
              x={x0 + x * scale - (peralteColumnetaM * scale) / 2}
              y={y0}
              width={peralteColumnetaM * scale}
              height={h}
              fill={DIAGRAM_COLORS.concrete}
              stroke={DIAGRAM_COLORS.concreteStroke}
              strokeWidth={1}
            />
          ))}

        <rect x={x0} y={y0} width={w} height={h} fill="none" stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1.5} />

        <HDim x1={x0} x2={x0 + w} y={y0 + h + 20} label={`L=${fmt(longitud, 2)}m`} labelBelow />
        <VDim y1={y0} y2={y0 + h} x={x0 - 24} label={`h=${fmt(alturaLibre, 2)}m`} />
      </svg>
      <p className="mt-1 text-xs text-steel-500">
        Tabique de {fmt(input.espesor)}cm, unidad {fmt(input.largoUnidad)}x{fmt(input.alturaUnidad)}cm
        {input.incluirArriostres && ` · ${input.numeroColumnetas} columnetas de arriostre`}
      </p>
    </div>
  );
}

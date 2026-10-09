import { useState } from "react";

export interface DonutChartItem {
  label: string;
  value: number;
  pct: number;
  color: string;
}

interface DonutChartProps {
  items: DonutChartItem[];
  centerValue: string;
  centerLabel: string;
  valueFormatter: (v: number) => string;
}

const SIZE = 200;
const RADIUS = 70;
const STROKE = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Dona de composición (ej. costo por categoría): SVG puro, sin librería —
// mismo criterio artesanal que HorizontalBarChart. Por defecto la leyenda
// muestra el monto (S/.) de cada categoría; al pasar el mouse o tocar una
// fila (o su arco en la dona), esa fila cambia a mostrar el porcentaje en el
// color de su propia categoría, y el centro de la dona muestra ese mismo
// porcentaje — fuera de eso, el centro muestra el total.
export function DonutChart({ items, centerValue, centerLabel, valueFormatter }: DonutChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const cumulativePcts = items.reduce<number[]>((acc, _item, idx) => {
    acc.push(idx === 0 ? 0 : acc[idx - 1] + items[idx - 1].pct);
    return acc;
  }, []);
  const segments = items.map((item, idx) => ({
    ...item,
    idx,
    dash: (item.pct / 100) * CIRCUMFERENCE,
    offset: -((cumulativePcts[idx] / 100) * CIRCUMFERENCE),
  }));

  function toggle(idx: number) {
    setActiveIdx((cur) => (cur === idx ? null : idx));
  }

  const active = activeIdx !== null ? segments[activeIdx] : null;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={180} height={180} role="img" aria-label="Costo por categoría">
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {segments.map((seg) => (
              <circle
                key={seg.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={seg.color}
                strokeWidth={activeIdx === seg.idx ? STROKE + 5 : STROKE}
                strokeDasharray={`${seg.dash} ${CIRCUMFERENCE}`}
                strokeDashoffset={seg.offset}
                className="cursor-pointer transition-[stroke-width,opacity] duration-150"
                style={{ opacity: activeIdx === null || activeIdx === seg.idx ? 1 : 0.35 }}
                onMouseEnter={() => setActiveIdx(seg.idx)}
                onMouseLeave={() => setActiveIdx(null)}
                onClick={() => toggle(seg.idx)}
              />
            ))}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {active ? (
            <>
              <span className="text-xl font-bold" style={{ color: active.color }}>
                {active.pct.toFixed(1)}%
              </span>
              <span className="max-w-[100px] truncate text-[11px] text-steel-500">{active.label}</span>
            </>
          ) : (
            <>
              <span className="max-w-[110px] truncate text-lg font-bold text-navy-900">{centerValue}</span>
              <span className="text-[11px] text-steel-500">{centerLabel}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex w-full flex-col gap-1">
        {segments.map((seg) => (
          <button
            key={seg.label}
            type="button"
            aria-pressed={activeIdx === seg.idx}
            onMouseEnter={() => setActiveIdx(seg.idx)}
            onMouseLeave={() => setActiveIdx(null)}
            onFocus={() => setActiveIdx(seg.idx)}
            onBlur={() => setActiveIdx(null)}
            onClick={() => toggle(seg.idx)}
            className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm outline-none transition-colors hover:bg-steel-50 focus-visible:bg-steel-50"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: seg.color }} />
            <span className="flex-1 truncate text-navy-900">{seg.label}</span>
            <span
              className={`font-mono text-xs font-semibold ${activeIdx === seg.idx ? "" : "text-steel-500"}`}
              style={activeIdx === seg.idx ? { color: seg.color } : undefined}
            >
              {activeIdx === seg.idx ? `${seg.pct.toFixed(1)}%` : valueFormatter(seg.value)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

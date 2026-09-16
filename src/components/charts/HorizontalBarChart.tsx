import { useState } from "react";

export interface HorizontalBarChartItem {
  label: string;
  value: number;
  color: string;
}

interface HorizontalBarChartProps {
  items: HorizontalBarChartItem[];
  valueFormatter?: (value: number) => string;
  emptyMessage?: string;
}

const defaultFormatter = (v: number) => v.toLocaleString("es-PE", { maximumFractionDigits: 2 });

// Gráfico de barras horizontales simple: una barra por categoría, valor
// siempre mostrado afuera de la barra (nunca se recorta), resaltado y
// tooltip al pasar el mouse o enfocar con teclado. Sin librería externa,
// consistente con el resto del proyecto (jsPDF/Excel propio en vez de xlsx).
export function HorizontalBarChart({ items, valueFormatter, emptyMessage }: HorizontalBarChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const fmt = valueFormatter ?? defaultFormatter;
  const max = Math.max(...items.map((i) => i.value), 0);

  if (items.length === 0 || max <= 0) {
    return (
      <p className="py-4 text-center text-sm text-steel-500">{emptyMessage ?? "Sin datos para graficar todavía."}</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, idx) => {
        const pct = Math.max((item.value / max) * 100, 2);
        const isHover = hoverIdx === idx;
        return (
          <div
            key={item.label}
            className="flex items-center gap-3 outline-none"
            onMouseEnter={() => setHoverIdx(idx)}
            onMouseLeave={() => setHoverIdx((h) => (h === idx ? null : h))}
            onFocus={() => setHoverIdx(idx)}
            onBlur={() => setHoverIdx((h) => (h === idx ? null : h))}
            tabIndex={0}
            aria-label={`${item.label}: ${fmt(item.value)}`}
          >
            <span className="w-28 shrink-0 truncate text-right text-xs text-steel-600 sm:w-36" title={item.label}>
              {item.label}
            </span>
            <div className="relative h-6 min-w-0 flex-1 rounded-sm bg-steel-100">
              <div
                className="h-6 rounded-r-[4px] transition-[filter] duration-150"
                style={{ width: `${pct}%`, backgroundColor: item.color, filter: isHover ? "brightness(0.88)" : "none" }}
              />
              {isHover && (
                <div className="pointer-events-none absolute -top-8 left-0 z-10 whitespace-nowrap rounded bg-navy-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg">
                  {item.label}: <span className="font-bold">{fmt(item.value)}</span>
                </div>
              )}
            </div>
            <span className="w-20 shrink-0 text-right text-xs font-semibold text-navy-800 sm:w-24">
              {fmt(item.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

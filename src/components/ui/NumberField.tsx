import { Minus, Plus } from "lucide-react";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  helper?: string;
}

export function NumberField({ label, value, onChange, unit, min, max, step = 0.01, helper }: NumberFieldProps) {
  const current = Number.isFinite(value) ? value : 0;

  function clamp(next: number) {
    let v = next;
    if (min !== undefined) v = Math.max(v, min);
    if (max !== undefined) v = Math.min(v, max);
    return v;
  }

  function nudge(delta: number) {
    onChange(clamp(Math.round((current + delta) / step) * step));
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-navy-800">{label}</span>
      <div className="flex items-stretch overflow-hidden rounded-md border border-steel-200 bg-white focus-within:border-navy-600 focus-within:ring-2 focus-within:ring-navy-600/20">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => nudge(-step)}
          aria-label={`Disminuir ${label}`}
          className="flex w-6 shrink-0 items-center justify-center text-steel-500 transition-colors hover:bg-steel-100 hover:text-navy-800 active:bg-steel-200"
        >
          <Minus size={12} />
        </button>
        <input
          type="number"
          className="number-field-input w-full min-w-0 px-0.5 py-2 text-center text-navy-900 outline-none"
          value={current}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => nudge(step)}
          aria-label={`Aumentar ${label}`}
          className="flex w-6 shrink-0 items-center justify-center text-steel-500 transition-colors hover:bg-steel-100 hover:text-navy-800 active:bg-steel-200"
        >
          <Plus size={12} />
        </button>
        {unit && (
          <span className="flex shrink-0 items-center border-l border-steel-200 bg-steel-100 px-1.5 text-xs font-medium text-steel-600">
            {unit}
          </span>
        )}
      </div>
      {helper && <span className="text-xs text-steel-500">{helper}</span>}
    </label>
  );
}

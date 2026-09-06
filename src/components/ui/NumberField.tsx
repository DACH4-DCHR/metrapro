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
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-navy-800">{label}</span>
      <div className="flex items-stretch overflow-hidden rounded-md border border-steel-200 bg-white focus-within:border-navy-600 focus-within:ring-2 focus-within:ring-navy-600/20">
        <input
          type="number"
          className="w-full min-w-0 px-3 py-2 text-navy-900 outline-none"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        />
        {unit && (
          <span className="flex items-center bg-steel-100 px-3 text-sm font-medium text-steel-600">
            {unit}
          </span>
        )}
      </div>
      {helper && <span className="text-xs text-steel-500">{helper}</span>}
    </label>
  );
}

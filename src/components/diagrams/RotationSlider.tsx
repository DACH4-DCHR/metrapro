interface RotationSliderProps {
  value: number;
  onChange: (value: number) => void;
  defaultValue?: number;
}

export function RotationSlider({ value, onChange, defaultValue = 45 }: RotationSliderProps) {
  return (
    <div className="mt-2 flex items-center gap-2 px-1">
      <span className="shrink-0 text-xs text-steel-500">Girar vista</span>
      <input
        type="range"
        min={0}
        max={360}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer accent-amber-500"
        aria-label="Girar vista 3D alrededor del eje vertical"
      />
      <button
        type="button"
        onClick={() => onChange(defaultValue)}
        className="shrink-0 rounded-md border border-steel-200 px-1.5 py-0.5 text-xs text-steel-500 transition-colors hover:border-navy-300 hover:text-navy-700"
        title="Restablecer vista"
      >
        ↺
      </button>
    </div>
  );
}

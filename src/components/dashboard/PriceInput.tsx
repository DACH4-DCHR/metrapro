import { useState } from "react";

// Precio unitario con prefijo "S/" y 2 decimales siempre visibles. Un <input
// type="number"> nativo no puede mostrar el cero final (4.8 y 4.80 son el mismo
// número para el navegador), así que mientras el campo tiene foco se edita como
// texto libre, y al salir se formatea a 2 decimales y recién ahí se guarda.
export function PriceInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(value.toFixed(2));

  return (
    <div className="ml-auto flex w-28 items-center gap-1 rounded border border-steel-200 bg-white px-2 py-1 focus-within:border-navy-600 focus-within:ring-2 focus-within:ring-navy-600/20">
      <span className="text-xs text-steel-500">S/</span>
      <input
        type="text"
        inputMode="decimal"
        value={focused ? text : value.toFixed(2)}
        onFocus={() => {
          setText(value.toFixed(2));
          setFocused(true);
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const parsed = Math.max(parseFloat(text.replace(",", ".")) || 0, 0);
          setFocused(false);
          onChange(parsed);
        }}
        className="w-full min-w-0 flex-1 bg-transparent text-right font-mono text-navy-900 outline-none"
      />
    </div>
  );
}

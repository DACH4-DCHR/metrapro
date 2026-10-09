export type ScopeTab = "todo" | "estructural" | "acabados";

const TABS: { value: ScopeTab; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "estructural", label: "Metrados Estructurales" },
  { value: "acabados", label: "Acabados y Adicionales" },
];

// Pestañas Todo / Estructural / Acabados — reemplazan el patrón anterior de
// mostrar siempre ambos grupos apilados uno debajo del otro en cada sección
// (Metrados y Presupuesto), que sobrecargaba la vista incluso cuando al
// usuario solo le interesaba un lado.
export function ScopeTabs({ value, onChange }: { value: ScopeTab; onChange: (v: ScopeTab) => void }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 rounded-md bg-steel-100 p-1 text-sm">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`rounded px-3 py-1.5 font-semibold transition-colors ${
            value === tab.value ? "bg-white text-navy-900 shadow-sm" : "text-steel-600 hover:text-navy-800"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

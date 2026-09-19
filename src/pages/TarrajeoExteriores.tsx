import { useMemo, useState } from "react";
import { Home, Save, Tag, Ruler, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { calcularTarrajeoExteriores, type TarrajeoExterioresInput } from "../lib/calc/tarrajeoExteriores";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

function nextName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "tarrajeoExteriores").length;
  return `Paño ${count + 1}`;
}

export function TarrajeoExterioresPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextName);

  const [input, setInput] = useState<TarrajeoExterioresInput>({
    longitud: 6,
    altura: 2.8,
    areaVanos: 2,
  });
  const [espesor, setEspesor] = useState(2);

  const result = useMemo(() => calcularTarrajeoExteriores(input), [input]);

  const lines: MetradoLine[] = [
    {
      partida: `Tarrajeo de muros exteriores, mezcla C:A 1:5, e=${espesor}cm`,
      unidad: "m²",
      cantidad: result.areaNeta,
    },
  ];

  function update<K extends keyof TarrajeoExterioresInput>(key: K, value: TarrajeoExterioresInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updateEspesor(value: number) {
    setEspesor(value);
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "tarrajeoExteriores",
      name: nombre || "Paño",
      createdAt: Date.now(),
      concreteM3: 0,
      steelKg: 0,
      formworkM2: 0,
      lines,
      inputsSummary: {
        Dimensiones: `${input.longitud} x ${input.altura} m`,
        "Área de vanos": `${input.areaVanos} m²`,
        Espesor: `${espesor} cm`,
      },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextName());
  }

  return (
    <div>
      <PageHeader
        title="Tarrajeo de Exteriores"
        subtitle="Tarrajeo de fachadas y muros exteriores, por paño"
        icon={<Home size={20} />}
        helpKey="tarrajeoExteriores"
        actions={
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-navy-950 shadow-sm transition-colors hover:bg-amber-400"
          >
            <Save size={16} />
            {saved ? "Agregado ✓ (puedes calcular otro)" : "Agregar a la lista"}
          </button>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
          <div className="flex flex-col gap-6">
            <SectionCard title="Identificación" icon={<Tag size={16} className="text-navy-700" />}>
              <TextField label="Nombre del paño" value={nombre} onChange={setNombre} />
            </SectionCard>

            <SectionCard title="Dimensiones del paño" icon={<Ruler size={16} className="text-navy-700" />}>
              <div className="grid grid-cols-2 gap-4">
                <NumberField
                  label="Longitud"
                  unit="m"
                  value={input.longitud}
                  onChange={(v) => update("longitud", v)}
                  helper="Desarrollo en planta del paño"
                />
                <NumberField label="Altura" unit="m" value={input.altura} onChange={(v) => update("altura", v)} />
                <NumberField
                  label="Área de vanos"
                  unit="m²"
                  value={input.areaVanos}
                  onChange={(v) => update("areaVanos", v)}
                  helper="Puertas y ventanas del paño, a descontar"
                />
                <NumberField
                  label="Espesor de tarrajeo"
                  unit="cm"
                  step={0.5}
                  value={espesor}
                  onChange={updateEspesor}
                  helper="Por defecto 2cm (exteriores); ajústalo si tu proyecto usa otro"
                />
              </div>
            </SectionCard>
          </div>

          <div className="flex flex-col gap-6">
            <WarningsBox warnings={result.warnings} />

            <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <ResultMetric label="Área bruta" value={result.areaBruta} unit="m²" />
                <ResultMetric label="Área neta" value={result.areaNeta} unit="m²" accent="navy" />
              </div>
            </SectionCard>

            <SectionCard title="Resumen" icon={<ClipboardList size={16} className="text-navy-700" />}>
              <ResultTable lines={lines} />
            </SectionCard>

            <SectionCard title="Paños registrados en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
              <ModuleElementsList
                module="tarrajeoExteriores"
                emptyLabel="Aún no has agregado ningún paño. Calcula arriba y presiona 'Agregar a la lista'."
              />
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-navy-800">{label}</span>
      <input
        type="text"
        className="w-full rounded-md border border-steel-200 bg-white px-3 py-2 text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

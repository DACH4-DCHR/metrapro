import { useMemo, useState } from "react";
import { PanelTop, Save, Tag, Ruler, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { calcularCielorraso, type CielorrasoInput } from "../lib/calc/cielorraso";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

function nextName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "cielorraso").length;
  return `Ambiente ${count + 1}`;
}

export function CielorrasoPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextName);

  const [input, setInput] = useState<CielorrasoInput>({ largo: 4, ancho: 3 });
  const result = useMemo(() => calcularCielorraso(input), [input]);

  const lines: MetradoLine[] = [{ partida: "Cielorraso con yeso", unidad: "m²", cantidad: result.areaCielorraso }];

  function update<K extends keyof CielorrasoInput>(key: K, value: CielorrasoInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "cielorraso",
      name: nombre || "Ambiente",
      createdAt: Date.now(),
      concreteM3: 0,
      steelKg: 0,
      formworkM2: 0,
      lines,
      inputsSummary: { Dimensiones: `${input.largo} x ${input.ancho} m` },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextName());
  }

  return (
    <div>
      <PageHeader
        title="Cielorraso"
        subtitle="Cielorraso con yeso de un ambiente, por ambiente (cuarto, baño, sala, etc.)"
        icon={<PanelTop size={20} />}
        helpKey="cielorraso"
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
              <TextField label="Nombre del ambiente" value={nombre} onChange={setNombre} />
            </SectionCard>

            <SectionCard title="Dimensiones del ambiente" icon={<Ruler size={16} className="text-navy-700" />}>
              <div className="grid grid-cols-2 gap-4">
                <NumberField label="Largo" unit="m" value={input.largo} onChange={(v) => update("largo", v)} />
                <NumberField label="Ancho" unit="m" value={input.ancho} onChange={(v) => update("ancho", v)} />
              </div>
            </SectionCard>
          </div>

          <div className="flex flex-col gap-6">
            <WarningsBox warnings={result.warnings} />

            <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <ResultMetric label="Área de cielorraso" value={result.areaCielorraso} unit="m²" accent="navy" />
              </div>
            </SectionCard>

            <SectionCard title="Resumen" icon={<ClipboardList size={16} className="text-navy-700" />}>
              <ResultTable lines={lines} />
            </SectionCard>

            <SectionCard title="Ambientes registrados en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
              <ModuleElementsList
                module="cielorraso"
                emptyLabel="Aún no has agregado ningún ambiente. Calcula arriba y presiona 'Agregar a la lista'."
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

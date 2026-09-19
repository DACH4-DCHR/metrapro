import { useMemo, useState } from "react";
import { Grid3x3, Save, Tag, Ruler, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { SelectField } from "../components/ui/SelectField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { ModuleElementsList } from "../components/ModuleElementsList";
import {
  calcularPisosPavimentos,
  TIPO_PISO_LABEL,
  type PisosPavimentosInput,
  type TipoPiso,
} from "../lib/calc/pisosPavimentos";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

const TIPO_PISO_OPTIONS = (Object.keys(TIPO_PISO_LABEL) as TipoPiso[]).map((value) => ({
  value,
  label: TIPO_PISO_LABEL[value],
}));

function nextName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "pisosPavimentos").length;
  return `Ambiente ${count + 1}`;
}

export function PisosPavimentosPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextName);

  const [input, setInput] = useState<PisosPavimentosInput>({
    largo: 4,
    ancho: 3,
    tipoPiso: "ceramico",
    incluirContrapiso: true,
  });

  const result = useMemo(() => calcularPisosPavimentos(input), [input]);

  const lines: MetradoLine[] = [];
  if (input.incluirContrapiso) {
    lines.push({ partida: "Contrapiso de mortero e=4cm", unidad: "m²", cantidad: result.areaPiso });
  }
  lines.push({ partida: TIPO_PISO_LABEL[input.tipoPiso], unidad: "m²", cantidad: result.areaPiso });

  function update<K extends keyof PisosPavimentosInput>(key: K, value: PisosPavimentosInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "pisosPavimentos",
      name: nombre || "Ambiente",
      createdAt: Date.now(),
      concreteM3: 0,
      steelKg: 0,
      formworkM2: 0,
      lines,
      inputsSummary: {
        Dimensiones: `${input.largo} x ${input.ancho} m`,
        "Tipo de piso": TIPO_PISO_LABEL[input.tipoPiso],
        Contrapiso: input.incluirContrapiso ? "sí" : "no",
      },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextName());
  }

  return (
    <div>
      <PageHeader
        title="Pisos y Pavimentos"
        subtitle="Piso terminado de un ambiente, por ambiente (cuarto, baño, sala, etc.)"
        icon={<Grid3x3 size={20} />}
        helpKey="pisosPavimentos"
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

            <SectionCard title="Tipo de piso" icon={<Grid3x3 size={16} className="text-navy-700" />}>
              <div className="flex flex-col gap-3">
                <SelectField
                  label="Piso terminado"
                  value={input.tipoPiso}
                  onChange={(v) => update("tipoPiso", v as TipoPiso)}
                  options={TIPO_PISO_OPTIONS}
                />
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={input.incluirContrapiso}
                    onChange={(e) => update("incluirContrapiso", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
                  />
                  <span className="text-sm font-medium text-navy-800">Incluir contrapiso (mortero de base)</span>
                </label>
              </div>
            </SectionCard>
          </div>

          <div className="flex flex-col gap-6">
            <WarningsBox warnings={result.warnings} />

            <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <ResultMetric label="Área de piso" value={result.areaPiso} unit="m²" accent="navy" />
              </div>
            </SectionCard>

            <SectionCard title="Resumen" icon={<ClipboardList size={16} className="text-navy-700" />}>
              <ResultTable lines={lines} />
            </SectionCard>

            <SectionCard title="Ambientes registrados en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
              <ModuleElementsList
                module="pisosPavimentos"
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

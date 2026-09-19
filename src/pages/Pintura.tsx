import { useMemo, useState } from "react";
import { PaintBucket, Save, Tag, Ruler, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { calcularAcabados, type AcabadosInput } from "../lib/calc/acabados";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

function nextName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "pintura").length;
  return `Ambiente ${count + 1}`;
}

export function PinturaPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextName);

  const [input, setInput] = useState<AcabadosInput>({
    largo: 4,
    ancho: 3,
    altura: 2.6,
    areaVanos: 3,
    incluirTarrajeoMuros: true,
    incluirTarrajeoCielorraso: false,
  });

  const result = useMemo(() => calcularAcabados(input), [input]);

  const lines: MetradoLine[] = [];
  if (input.incluirTarrajeoMuros) {
    lines.push({ partida: "Pintura látex 2 manos en muros", unidad: "m²", cantidad: result.areaMurosNeta });
  }
  if (input.incluirTarrajeoCielorraso) {
    lines.push({ partida: "Pintura látex 2 manos en cielorraso", unidad: "m²", cantidad: result.areaCielorraso });
  }

  function update<K extends keyof AcabadosInput>(key: K, value: AcabadosInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "pintura",
      name: nombre || "Ambiente",
      createdAt: Date.now(),
      concreteM3: 0,
      steelKg: 0,
      formworkM2: 0,
      lines,
      inputsSummary: {
        Dimensiones: `${input.largo} x ${input.ancho} x ${input.altura} m`,
        "Área de vanos": `${input.areaVanos} m²`,
        Partidas:
          [input.incluirTarrajeoMuros && "pintura de muros", input.incluirTarrajeoCielorraso && "pintura de cielorraso"]
            .filter(Boolean)
            .join(", ") || "ninguna seleccionada",
      },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextName());
  }

  return (
    <div>
      <PageHeader
        title="Pintura"
        subtitle="Pintura de muros y cielorraso, por ambiente (cuarto, baño, sala, etc.)"
        icon={<PaintBucket size={20} />}
        helpKey="pintura"
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
                <NumberField
                  label="Altura"
                  unit="m"
                  value={input.altura}
                  onChange={(v) => update("altura", v)}
                  helper="Del piso terminado al cielorraso"
                />
                <NumberField
                  label="Área de vanos"
                  unit="m²"
                  value={input.areaVanos}
                  onChange={(v) => update("areaVanos", v)}
                  helper="Puertas y ventanas, a descontar del área de muros"
                />
              </div>
            </SectionCard>

            <SectionCard title="Partidas a incluir" icon={<PaintBucket size={16} className="text-navy-700" />}>
              <div className="flex flex-col gap-3">
                <CheckboxField
                  label="Pintura de muros"
                  checked={input.incluirTarrajeoMuros}
                  onChange={(v) => update("incluirTarrajeoMuros", v)}
                />
                <CheckboxField
                  label="Pintura de cielorraso"
                  checked={input.incluirTarrajeoCielorraso}
                  onChange={(v) => update("incluirTarrajeoCielorraso", v)}
                />
              </div>
            </SectionCard>
          </div>

          <div className="flex flex-col gap-6">
            <WarningsBox warnings={result.warnings} />

            <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <ResultMetric label="Área de muros (neta)" value={result.areaMurosNeta} unit="m²" accent="navy" />
                <ResultMetric label="Área de cielorraso" value={result.areaCielorraso} unit="m²" accent="amber" />
              </div>
            </SectionCard>

            <SectionCard title="Resumen" icon={<ClipboardList size={16} className="text-navy-700" />}>
              <ResultTable lines={lines} />
            </SectionCard>

            <SectionCard title="Ambientes registrados en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
              <ModuleElementsList
                module="pintura"
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

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
      />
      <span className="text-sm font-medium text-navy-800">{label}</span>
    </label>
  );
}

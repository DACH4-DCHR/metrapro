import { useMemo, useState } from "react";
import { Paintbrush, Save, Tag, Ruler, Footprints, LandPlot, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { SelectField } from "../components/ui/SelectField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { ModuleElementsList } from "../components/ModuleElementsList";
import {
  calcularTarrajeoEscalera,
  type TarrajeoEscaleraInput,
  type TipoEscaleraTarrajeo,
} from "../lib/calc/tarrajeoEscalera";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

const tipoOptions: { value: TipoEscaleraTarrajeo; label: string }[] = [
  { value: "un_tramo", label: "Un tramo" },
  { value: "dos_tramos", label: "Dos tramos" },
];

function nextName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "tarrajeoEscalera").length;
  return `Escalera ${count + 1}`;
}

export function TarrajeoEscaleraPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextName);

  const [input, setInput] = useState<TarrajeoEscaleraInput>({
    tipo: "un_tramo",
    anchoEscalera: 1.2,
    tramo1: { numeroPasos: 16, paso: 25, contrapaso: 16.875 },
    tramo2: { numeroPasos: 8, paso: 25, contrapaso: 16.875 },
    descanso: { ancho: 1.2, largo: 1.2 },
    incluirTarrajeoGaganta: true,
    incluirVestiduraPasos: true,
  });

  const result = useMemo(() => calcularTarrajeoEscalera(input), [input]);
  const esMultiTramo = input.tipo === "dos_tramos";

  const lines: MetradoLine[] = [];
  if (input.incluirTarrajeoGaganta) {
    lines.push({
      partida: "Tarrajeo de garganta de escalera, mezcla C:A 1:5, e=1.5cm",
      unidad: "m²",
      cantidad: result.areaGargantaTotal,
    });
  }
  if (input.incluirVestiduraPasos) {
    lines.push({ partida: "Vestidura de pasos y contrapasos", unidad: "m²", cantidad: result.areaVestiduraTotal });
  }

  function updateRoot<K extends keyof TarrajeoEscaleraInput>(key: K, value: TarrajeoEscaleraInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updateTramo1<K extends keyof TarrajeoEscaleraInput["tramo1"]>(key: K, value: number) {
    setInput((prev) => ({ ...prev, tramo1: { ...prev.tramo1, [key]: value } }));
    setSaved(false);
  }

  function updateTramo2<K extends keyof TarrajeoEscaleraInput["tramo1"]>(key: K, value: number) {
    setInput((prev) => ({
      ...prev,
      tramo2: { ...(prev.tramo2 ?? { numeroPasos: 0, paso: 0, contrapaso: 0 }), [key]: value },
    }));
    setSaved(false);
  }

  function updateDescanso<K extends keyof NonNullable<TarrajeoEscaleraInput["descanso"]>>(key: K, value: number) {
    setInput((prev) => ({
      ...prev,
      descanso: { ...(prev.descanso ?? { ancho: 0, largo: 0 }), [key]: value },
    }));
    setSaved(false);
  }

  function handleTipoChange(nuevoTipo: TipoEscaleraTarrajeo) {
    setInput((prev) => ({ ...prev, tipo: nuevoTipo }));
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "tarrajeoEscalera",
      name: nombre || "Escalera",
      createdAt: Date.now(),
      concreteM3: 0,
      steelKg: 0,
      formworkM2: 0,
      lines,
      inputsSummary: {
        Tipo: tipoOptions.find((t) => t.value === input.tipo)?.label ?? input.tipo,
        Ancho: `${input.anchoEscalera} m`,
      },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextName());
  }

  return (
    <div>
      <PageHeader
        title="Tarrajeo de Escalera"
        subtitle="Tarrajeo de garganta y vestidura de pasos y contrapasos"
        icon={<Paintbrush size={20} />}
        helpKey="tarrajeoEscalera"
        actions={
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-navy-950 shadow-sm transition-colors hover:bg-amber-400"
          >
            <Save size={16} />
            {saved ? "Agregada ✓ (puedes calcular otra)" : "Agregar a la lista"}
          </button>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
          <div className="flex flex-col gap-6">
            <SectionCard title="Identificación" icon={<Tag size={16} className="text-navy-700" />}>
              <TextField label="Nombre del elemento" value={nombre} onChange={setNombre} />
            </SectionCard>

            <SectionCard title="Datos generales" icon={<Ruler size={16} className="text-navy-700" />}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <SelectField
                    label="Tipo de escalera"
                    value={input.tipo}
                    onChange={(v) => handleTipoChange(v as TipoEscaleraTarrajeo)}
                    options={tipoOptions}
                  />
                </div>
                <NumberField
                  label="Ancho de escalera"
                  unit="m"
                  value={input.anchoEscalera}
                  onChange={(v) => updateRoot("anchoEscalera", v)}
                />
              </div>
            </SectionCard>

            <SectionCard title={esMultiTramo ? "Tramo 1" : "Pasos"} icon={<Footprints size={16} className="text-navy-700" />}>
              <div className="grid grid-cols-2 gap-4">
                <NumberField
                  label="N° de pasos"
                  unit="und"
                  step={1}
                  value={input.tramo1.numeroPasos}
                  onChange={(v) => updateTramo1("numeroPasos", v)}
                />
                <NumberField label="Paso" unit="cm" value={input.tramo1.paso} onChange={(v) => updateTramo1("paso", v)} />
                <NumberField
                  label="Contrapaso"
                  unit="cm"
                  value={input.tramo1.contrapaso}
                  onChange={(v) => updateTramo1("contrapaso", v)}
                />
              </div>
            </SectionCard>

            {esMultiTramo && (
              <>
                <SectionCard title="Tramo 2" icon={<Footprints size={16} className="text-navy-700" />}>
                  <div className="grid grid-cols-2 gap-4">
                    <NumberField
                      label="N° de pasos"
                      unit="und"
                      step={1}
                      value={input.tramo2?.numeroPasos ?? 0}
                      onChange={(v) => updateTramo2("numeroPasos", v)}
                    />
                    <NumberField
                      label="Paso"
                      unit="cm"
                      value={input.tramo2?.paso ?? 0}
                      onChange={(v) => updateTramo2("paso", v)}
                    />
                    <NumberField
                      label="Contrapaso"
                      unit="cm"
                      value={input.tramo2?.contrapaso ?? 0}
                      onChange={(v) => updateTramo2("contrapaso", v)}
                    />
                  </div>
                </SectionCard>

                <SectionCard title="Descanso" icon={<LandPlot size={16} className="text-navy-700" />}>
                  <div className="grid grid-cols-2 gap-4">
                    <NumberField
                      label="Ancho"
                      unit="m"
                      value={input.descanso?.ancho ?? 0}
                      onChange={(v) => updateDescanso("ancho", v)}
                    />
                    <NumberField
                      label="Largo"
                      unit="m"
                      value={input.descanso?.largo ?? 0}
                      onChange={(v) => updateDescanso("largo", v)}
                    />
                  </div>
                </SectionCard>
              </>
            )}

            <SectionCard title="Partidas a incluir" icon={<Paintbrush size={16} className="text-navy-700" />}>
              <div className="flex flex-col gap-3">
                <CheckboxField
                  label="Tarrajeo de garganta"
                  checked={input.incluirTarrajeoGaganta}
                  onChange={(v) => updateRoot("incluirTarrajeoGaganta", v)}
                />
                <CheckboxField
                  label="Vestidura de pasos y contrapasos"
                  checked={input.incluirVestiduraPasos}
                  onChange={(v) => updateRoot("incluirVestiduraPasos", v)}
                />
              </div>
            </SectionCard>
          </div>

          <div className="flex flex-col gap-6">
            <WarningsBox warnings={result.warnings} />

            <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <ResultMetric label="Área de garganta" value={result.areaGargantaTotal} unit="m²" accent="navy" />
                <ResultMetric label="Área de vestidura" value={result.areaVestiduraTotal} unit="m²" accent="amber" />
              </div>
            </SectionCard>

            <SectionCard title="Resumen" icon={<ClipboardList size={16} className="text-navy-700" />}>
              <ResultTable lines={lines} />
            </SectionCard>

            <SectionCard title="Escaleras registradas en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
              <ModuleElementsList
                module="tarrajeoEscalera"
                emptyLabel="Aún no has agregado ninguna escalera. Calcula arriba y presiona 'Agregar a la lista'."
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

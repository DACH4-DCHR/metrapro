import { useMemo, useState } from "react";
import { Rows3, Save, Tag, Ruler, Eye, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { ConcretoCiclopeoSection } from "../components/diagrams/ConcretoCiclopeoSection";
import { calcularSobrecimiento, type SobrecimientoInput } from "../lib/calc/sobrecimiento";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

function nextName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "sobrecimiento").length;
  return `Sobrecimiento ${count + 1}`;
}

export function SobrecimientoPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextName);

  const [input, setInput] = useState<SobrecimientoInput>({
    longitudTotal: 40,
    ancho: 15,
    altura: 30,
    porcentajePiedra: 25,
  });

  const result = useMemo(() => calcularSobrecimiento(input), [input]);

  const lines: MetradoLine[] = [
    {
      partida: `Concreto ciclópeo en sobrecimientos f'c=140 kg/cm² + ${input.porcentajePiedra}% P.M.`,
      unidad: "m³",
      cantidad: result.volumenTotal,
    },
    { partida: "Encofrado y desencofrado de sobrecimientos", unidad: "m²", cantidad: result.encofradoM2 },
  ];

  function update<K extends keyof SobrecimientoInput>(key: K, value: SobrecimientoInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "sobrecimiento",
      name: nombre || "Sobrecimiento",
      createdAt: Date.now(),
      concreteM3: result.volumenTotal,
      steelKg: 0,
      formworkM2: result.encofradoM2,
      lines,
      inputsSummary: {
        Longitud: `${input.longitudTotal} m`,
        Sección: `${input.ancho} x ${input.altura} cm`,
        "% Piedra mediana": `${input.porcentajePiedra}%`,
      },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextName());
  }

  return (
    <div>
      <PageHeader
        title="Metrado de Sobrecimientos"
        subtitle="Concreto ciclópeo entre el cimiento corrido y el nivel de piso terminado (NTE E.060 Art. 22.10)"
        icon={<Rows3 size={20} />}
        actions={
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
          >
            <Save size={16} />
            {saved ? "Agregado ✓ (puedes calcular otro)" : "Agregar a la lista"}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-[420px_1fr]">
        <div className="flex flex-col gap-6">
          <SectionCard title="Identificación" icon={<Tag size={16} className="text-navy-700" />}>
            <TextField label="Nombre del elemento" value={nombre} onChange={setNombre} />
          </SectionCard>

          <SectionCard title="Geometría" icon={<Ruler size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <NumberField
                  label="Longitud total"
                  unit="m"
                  value={input.longitudTotal}
                  onChange={(v) => update("longitudTotal", v)}
                  helper="Suma de todos los tramos de sobrecimiento del proyecto"
                />
              </div>
              <NumberField
                label="Ancho (espesor de muro)"
                unit="cm"
                value={input.ancho}
                onChange={(v) => update("ancho", v)}
                helper="Igual al espesor del muro que soporta"
              />
              <NumberField
                label="Altura"
                unit="cm"
                value={input.altura}
                onChange={(v) => update("altura", v)}
                helper="Desde el cimiento corrido hasta el nivel de piso terminado"
              />
              <div className="col-span-2">
                <NumberField
                  label="% Piedra mediana (P.M.)"
                  unit="%"
                  value={input.porcentajePiedra}
                  onChange={(v) => update("porcentajePiedra", v)}
                  helper="Máximo 30% del volumen (E.060 Art. 22.10.1b); típico 25% P.M."
                />
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <WarningsBox warnings={result.warnings} />

          <SectionCard title="Sección transversal (vista en vivo)" icon={<Eye size={16} className="text-navy-700" />}>
            <ConcretoCiclopeoSection input={input} stoneLabel="P.M." />
          </SectionCard>

          <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <ResultMetric label="Volumen total" value={result.volumenTotal} unit="m³" accent="navy" />
              <ResultMetric label="Volumen de piedra mediana" value={result.volumenPiedra} unit="m³" />
              <ResultMetric label="Volumen de concreto simple" value={result.volumenConcretoSimple} unit="m³" accent="navy" />
              <ResultMetric label="Área de encofrado" value={result.encofradoM2} unit="m²" accent="amber" />
            </div>
          </SectionCard>

          <SectionCard title="Resumen" icon={<ClipboardList size={16} className="text-navy-700" />}>
            <ResultTable lines={lines} />
          </SectionCard>

          <SectionCard title="Tramos registrados en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
            <ModuleElementsList module="sobrecimiento" emptyLabel="Aún no has agregado ningún tramo de sobrecimiento. Calcula arriba y presiona 'Agregar a la lista'." />
          </SectionCard>
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

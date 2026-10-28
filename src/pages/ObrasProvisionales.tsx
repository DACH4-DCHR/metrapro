import { useMemo, useState } from "react";
import { HardHat, Save, Tag, Ruler, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { calcularObrasProvisionales, type ObrasProvisionalesInput } from "../lib/calc/obrasProvisionales";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

function nextName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "obrasProvisionales").length;
  return `Obras Provisionales ${count + 1}`;
}

export function ObrasProvisionalesPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextName);

  const [input, setInput] = useState<ObrasProvisionalesInput>({
    largoTerreno: 10,
    anchoTerreno: 15,
    incluirCartel: true,
    incluirCerco: true,
    incluirTrazo: true,
    incluirLimpiezaPermanente: false,
    incluirLimpiezaFinal: true,
  });
  const result = useMemo(() => calcularObrasProvisionales(input), [input]);

  const lines: MetradoLine[] = [];
  if (input.incluirCartel) {
    lines.push({ partida: "Cartel de identificación de la obra", unidad: "und", cantidad: 1 });
  }
  if (input.incluirCerco) {
    lines.push({ partida: "Cerco de obra", unidad: "m", cantidad: result.perimetroTerreno });
  }
  if (input.incluirTrazo) {
    lines.push({ partida: "Trazos, niveles y replanteo", unidad: "m²", cantidad: result.areaTerreno });
  }
  if (input.incluirLimpiezaPermanente) {
    lines.push({ partida: "Limpieza permanente de obra", unidad: "m²", cantidad: result.areaTerreno });
  }
  if (input.incluirLimpiezaFinal) {
    lines.push({ partida: "Limpieza final de obra", unidad: "m²", cantidad: result.areaTerreno });
  }

  function update<K extends keyof ObrasProvisionalesInput>(key: K, value: ObrasProvisionalesInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "obrasProvisionales",
      name: nombre || "Obras Provisionales",
      createdAt: Date.now(),
      concreteM3: 0,
      steelKg: 0,
      formworkM2: 0,
      lines,
      inputsSummary: { Terreno: `${input.largoTerreno} x ${input.anchoTerreno} m` },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextName());
  }

  return (
    <div>
      <PageHeader
        title="Obras Provisionales"
        subtitle="Cartel, cerco, trazo/replanteo y limpieza — a partir de las medidas del terreno"
        icon={<HardHat size={20} />}
        helpKey="obrasProvisionales"
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
              <TextField label="Nombre" value={nombre} onChange={setNombre} />
            </SectionCard>

            <SectionCard title="Medidas del terreno" icon={<Ruler size={16} className="text-navy-700" />}>
              <div className="grid grid-cols-2 gap-4">
                <NumberField label="Largo" unit="m" value={input.largoTerreno} onChange={(v) => update("largoTerreno", v)} />
                <NumberField label="Ancho" unit="m" value={input.anchoTerreno} onChange={(v) => update("anchoTerreno", v)} />
              </div>
              <p className="mt-2 text-xs text-steel-500">
                De acá salen el área (trazo y limpieza) y el perímetro (cerco) de todas las partidas de abajo.
              </p>
            </SectionCard>

            <SectionCard title="Partidas a incluir" icon={<HardHat size={16} className="text-navy-700" />}>
              <div className="flex flex-col gap-3">
                <CheckboxRow
                  label="Cartel de identificación de la obra (1 und)"
                  checked={input.incluirCartel}
                  onChange={(v) => update("incluirCartel", v)}
                />
                <CheckboxRow label="Cerco de obra" checked={input.incluirCerco} onChange={(v) => update("incluirCerco", v)} />
                <CheckboxRow
                  label="Trazos, niveles y replanteo"
                  checked={input.incluirTrazo}
                  onChange={(v) => update("incluirTrazo", v)}
                />
                <CheckboxRow
                  label="Limpieza permanente de obra"
                  checked={input.incluirLimpiezaPermanente}
                  onChange={(v) => update("incluirLimpiezaPermanente", v)}
                />
                <CheckboxRow
                  label="Limpieza final de obra"
                  checked={input.incluirLimpiezaFinal}
                  onChange={(v) => update("incluirLimpiezaFinal", v)}
                />
              </div>
            </SectionCard>
          </div>

          <div className="flex flex-col gap-6">
            <WarningsBox warnings={result.warnings} />

            <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <ResultMetric label="Área de terreno" value={result.areaTerreno} unit="m²" accent="navy" />
                <ResultMetric label="Perímetro de terreno" value={result.perimetroTerreno} unit="m" accent="amber" />
              </div>
            </SectionCard>

            <SectionCard title="Resumen" icon={<ClipboardList size={16} className="text-navy-700" />}>
              <ResultTable lines={lines} />
            </SectionCard>

            <SectionCard title="Registros en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
              <ModuleElementsList
                module="obrasProvisionales"
                emptyLabel="Aún no has agregado obras provisionales. Calcula arriba y presiona 'Agregar a la lista'."
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

function CheckboxRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
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

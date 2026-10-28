import { useMemo, useState } from "react";
import { DoorOpen, Save, Tag, Ruler, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { calcularCarpinteria, type CarpinteriaInput } from "../lib/calc/carpinteria";
import type { VanoGrupoInput } from "../lib/calc/derrames";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

function nextName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "carpinteria").length;
  return `Carpintería ${count + 1}`;
}

export function CarpinteriaPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextName);

  const [puertas, setPuertas] = useState<VanoGrupoInput>({ cantidad: 1, ancho: 0.9, alto: 2.1 });
  const [ventanas, setVentanas] = useState<VanoGrupoInput>({ cantidad: 1, ancho: 1.2, alto: 1.2 });
  const [incluirVidrioVentanas, setIncluirVidrioVentanas] = useState(true);
  const [incluirCerraduras, setIncluirCerraduras] = useState(true);

  const input: CarpinteriaInput = { puertas, ventanas, incluirVidrioVentanas, incluirCerraduras };
  const result = useMemo(() => calcularCarpinteria(input), [input]);

  const lines: MetradoLine[] = [];
  if (result.numeroPuertas > 0) {
    lines.push({ partida: "Puerta contraplacada de madera", unidad: "und", cantidad: result.numeroPuertas });
  }
  if (incluirCerraduras && result.numeroPuertas > 0) {
    lines.push({ partida: "Cerradura de perilla para puerta", unidad: "und", cantidad: result.numeroPuertas });
  }
  if (result.numeroVentanas > 0) {
    lines.push({ partida: "Ventana de madera", unidad: "und", cantidad: result.numeroVentanas });
  }
  if (incluirVidrioVentanas && result.numeroVentanas > 0) {
    lines.push({ partida: "Vidrio simple incoloro", unidad: "m²", cantidad: result.areaVentanas });
  }

  function updatePuertas<K extends keyof VanoGrupoInput>(key: K, value: number) {
    setPuertas((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }
  function updateVentanas<K extends keyof VanoGrupoInput>(key: K, value: number) {
    setVentanas((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "carpinteria",
      name: nombre || "Carpintería",
      createdAt: Date.now(),
      concreteM3: 0,
      steelKg: 0,
      formworkM2: 0,
      lines,
      inputsSummary: {
        Puertas: `${result.numeroPuertas} und (${puertas.ancho}x${puertas.alto}m)`,
        Ventanas: `${result.numeroVentanas} und (${ventanas.ancho}x${ventanas.alto}m)`,
      },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextName());
  }

  return (
    <div>
      <PageHeader
        title="Carpintería y Vidrios"
        subtitle="Puertas, ventanas, vidrio y cerraduras — por tipo de puerta/ventana"
        icon={<DoorOpen size={20} />}
        helpKey="carpinteria"
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

            <SectionCard title="Puertas" icon={<Ruler size={16} className="text-navy-700" />}>
              <div className="grid grid-cols-3 gap-3">
                <NumberField label="Cantidad" unit="und" step={1} value={puertas.cantidad} onChange={(v) => updatePuertas("cantidad", v)} />
                <NumberField label="Ancho" unit="m" value={puertas.ancho} onChange={(v) => updatePuertas("ancho", v)} />
                <NumberField label="Alto" unit="m" value={puertas.alto} onChange={(v) => updatePuertas("alto", v)} />
              </div>
              <label className="mt-3 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={incluirCerraduras}
                  onChange={(e) => setIncluirCerraduras(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
                />
                <span className="text-sm font-medium text-navy-800">Agregar 1 cerradura por puerta</span>
              </label>
            </SectionCard>

            <SectionCard title="Ventanas" icon={<Ruler size={16} className="text-navy-700" />}>
              <div className="grid grid-cols-3 gap-3">
                <NumberField
                  label="Cantidad"
                  unit="und"
                  step={1}
                  value={ventanas.cantidad}
                  onChange={(v) => updateVentanas("cantidad", v)}
                />
                <NumberField label="Ancho" unit="m" value={ventanas.ancho} onChange={(v) => updateVentanas("ancho", v)} />
                <NumberField label="Alto" unit="m" value={ventanas.alto} onChange={(v) => updateVentanas("alto", v)} />
              </div>
              <label className="mt-3 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={incluirVidrioVentanas}
                  onChange={(e) => setIncluirVidrioVentanas(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
                />
                <span className="text-sm font-medium text-navy-800">Agregar vidrio simple incoloro (área de las ventanas)</span>
              </label>
            </SectionCard>
          </div>

          <div className="flex flex-col gap-6">
            <WarningsBox warnings={result.warnings} />

            <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <ResultMetric label="N° de puertas" value={result.numeroPuertas} unit="und" />
                <ResultMetric label="Área de puertas" value={result.areaPuertas} unit="m²" />
                <ResultMetric label="N° de ventanas" value={result.numeroVentanas} unit="und" />
                <ResultMetric label="Área de ventanas (vidrio)" value={result.areaVentanas} unit="m²" accent="navy" />
              </div>
            </SectionCard>

            <SectionCard title="Resumen" icon={<ClipboardList size={16} className="text-navy-700" />}>
              <ResultTable lines={lines} />
            </SectionCard>

            <SectionCard title="Registros en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
              <ModuleElementsList
                module="carpinteria"
                emptyLabel="Aún no has agregado carpintería. Calcula arriba y presiona 'Agregar a la lista'."
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

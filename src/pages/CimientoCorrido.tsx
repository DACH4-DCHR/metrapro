import { useMemo, useState } from "react";
import { StretchHorizontal, Save, Tag, Ruler, Shovel, Eye, Box, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { StickyViewsRow } from "../components/ui/StickyViewsRow";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { ConcretoCiclopeoSection } from "../components/diagrams/ConcretoCiclopeoSection";
import { ConcretoCiclopeoIsometric } from "../components/diagrams/ConcretoCiclopeoIsometric";
import { calcularCimientoCorrido, type CimientoCorridoInput } from "../lib/calc/cimientoCorrido";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

function nextName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "cimientoCorrido").length;
  return `Cimiento Corrido ${count + 1}`;
}

export function CimientoCorridoPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextName);

  const [input, setInput] = useState<CimientoCorridoInput>({
    longitudTotal: 40,
    ancho: 50,
    altura: 60,
    porcentajePiedra: 30,
    incluirMovimientoTierras: true,
    profundidadExcavacion: 0.7,
    sobreanchoExcavacion: 10,
    porcentajeEsponjamiento: 25,
  });

  const result = useMemo(() => calcularCimientoCorrido(input), [input]);

  const lines: MetradoLine[] = [
    ...(input.incluirMovimientoTierras
      ? [
          { partida: "Excavación de zanjas para cimiento corrido (terreno normal)", unidad: "m³", cantidad: result.volumenExcavacion },
          { partida: "Refine y nivelación de fondo de excavación", unidad: "m²", cantidad: result.areaNivelacionFondo },
        ]
      : []),
    {
      partida: `Concreto ciclópeo en cimientos corridos f'c=140 kg/cm² + ${input.porcentajePiedra}% P.G.`,
      unidad: "m³",
      cantidad: result.volumenTotal,
    },
    ...(input.incluirMovimientoTierras
      ? [
          { partida: "Relleno y compactado con material propio", unidad: "m³", cantidad: result.volumenRelleno },
          { partida: "Eliminación de material excedente", unidad: "m³", cantidad: result.volumenEliminacionEsponjado },
        ]
      : []),
  ];

  function update<K extends keyof CimientoCorridoInput>(key: K, value: CimientoCorridoInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "cimientoCorrido",
      name: nombre || "Cimiento Corrido",
      createdAt: Date.now(),
      concreteM3: result.volumenTotal,
      steelKg: 0,
      formworkM2: 0,
      lines,
      inputsSummary: {
        Longitud: `${input.longitudTotal} m`,
        Sección: `${input.ancho} x ${input.altura} cm`,
        "% Piedra grande": `${input.porcentajePiedra}%`,
      },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextName());
  }

  return (
    <div>
      <PageHeader
        title="Metrado de Cimientos Corridos"
        subtitle="Concreto ciclópeo en cimentación continua para muros portantes (NTE E.060 Art. 22.10)"
        icon={<StretchHorizontal size={20} />}
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
        <StickyViewsRow>
          <SectionCard title="Sección transversal (vista en vivo)" icon={<Eye size={16} className="text-navy-700" />} collapsible>
            <ConcretoCiclopeoSection input={input} stoneLabel="P.G." />
          </SectionCard>

          <SectionCard title="Vista isométrica del concreto (3D)" icon={<Box size={16} className="text-navy-700" />} collapsible>
            <ConcretoCiclopeoIsometric input={input} stoneLabel="P.G." />
          </SectionCard>
        </StickyViewsRow>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
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
                  helper="Suma de todos los tramos de cimiento corrido del proyecto"
                />
              </div>
              <NumberField
                label="Ancho"
                unit="cm"
                value={input.ancho}
                onChange={(v) => update("ancho", v)}
                helper="Típico 40-60 cm según capacidad portante del suelo"
              />
              <NumberField
                label="Altura / profundidad"
                unit="cm"
                value={input.altura}
                onChange={(v) => update("altura", v)}
              />
              <div className="col-span-2">
                <NumberField
                  label="% Piedra grande (P.G.)"
                  unit="%"
                  value={input.porcentajePiedra}
                  onChange={(v) => update("porcentajePiedra", v)}
                  helper="Máximo 30% del volumen (E.060 Art. 22.10.1b); típico 30% P.G."
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Movimiento de tierras" icon={<Shovel size={16} className="text-navy-700" />}>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={input.incluirMovimientoTierras}
                onChange={(e) => update("incluirMovimientoTierras", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
              />
              <span className="text-sm font-medium text-navy-800">
                Incluir excavación, relleno y eliminación en el metrado de este tramo
              </span>
            </label>
            {input.incluirMovimientoTierras && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <NumberField
                  label="Profundidad de excavación"
                  unit="m"
                  value={input.profundidadExcavacion}
                  onChange={(v) => update("profundidadExcavacion", v)}
                  helper="Desde el nivel de terreno hasta el fondo del cimiento"
                />
                <NumberField
                  label="Sobreancho de trabajo (por lado)"
                  unit="cm"
                  value={input.sobreanchoExcavacion}
                  onChange={(v) => update("sobreanchoExcavacion", v)}
                  helper="Típico 10 cm"
                />
                <NumberField
                  label="Esponjamiento del material"
                  unit="%"
                  value={input.porcentajeEsponjamiento}
                  onChange={(v) => update("porcentajeEsponjamiento", v)}
                  helper="Para eliminación/acarreo; típico 25-30%"
                />
              </div>
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <WarningsBox warnings={result.warnings} />

          <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <ResultMetric label="Volumen total" value={result.volumenTotal} unit="m³" accent="navy" />
              <ResultMetric label="Volumen de piedra grande" value={result.volumenPiedra} unit="m³" />
              <ResultMetric label="Volumen de concreto simple" value={result.volumenConcretoSimple} unit="m³" accent="navy" />
              {input.incluirMovimientoTierras && (
                <>
                  <ResultMetric label="Volumen excavado" value={result.volumenExcavacion} unit="m³" />
                  <ResultMetric label="Relleno y compactado" value={result.volumenRelleno} unit="m³" />
                  <ResultMetric label="Eliminación (esponjado)" value={result.volumenEliminacionEsponjado} unit="m³" />
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Resumen" icon={<ClipboardList size={16} className="text-navy-700" />}>
            <ResultTable lines={lines} />
          </SectionCard>

          <SectionCard title="Tramos registrados en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
            <ModuleElementsList module="cimientoCorrido" emptyLabel="Aún no has agregado ningún tramo de cimiento corrido. Calcula arriba y presiona 'Agregar a la lista'." />
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

import { useMemo, useState } from "react";
import { Shovel, Save, Tag, Ruler, Eye, Box, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { SelectField } from "../components/ui/SelectField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { StickyViewsRow } from "../components/ui/StickyViewsRow";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { MovimientoTierrasSection } from "../components/diagrams/MovimientoTierrasSection";
import { MovimientoTierrasIsometric } from "../components/diagrams/MovimientoTierrasIsometric";
import { calcularMovimientoTierras, type MovimientoTierrasInput, type TipoExcavacion } from "../lib/calc/movimientoTierras";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

const tipoExcavacionOptions: { value: TipoExcavacion; label: string }[] = [
  { value: "zapata", label: "Zapata aislada (pozo, sobreancho en ambas direcciones)" },
  { value: "zanja", label: "Cimiento corrido / viga de cimentación (zanja continua)" },
  { value: "general", label: "General (zanja/pozo, sobreancho solo en el ancho)" },
];

const partidaExcavacionPorTipo: Record<TipoExcavacion, string> = {
  zapata: "Excavación para zapatas aisladas (terreno normal)",
  zanja: "Excavación de zanjas para cimiento corrido / vigas de cimentación (terreno normal)",
  general: "Excavación de zanjas/pozos para cimentación (terreno normal)",
};

function nextName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "movimientoTierras").length;
  return `Movimiento de Tierras ${count + 1}`;
}

export function MovimientoTierrasPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextName);

  const [input, setInput] = useState<MovimientoTierrasInput>({
    tipoExcavacion: "general",
    largo: 10,
    ancho: 0.5,
    profundidad: 1.2,
    numeroExcavaciones: 1,
    sobreanchoTrabajo: 10,
    volumenOcupadoCimentacion: 3,
    porcentajeEsponjamiento: 25,
  });

  const result = useMemo(() => calcularMovimientoTierras(input), [input]);

  const lines: MetradoLine[] = [
    { partida: partidaExcavacionPorTipo[input.tipoExcavacion], unidad: "m³", cantidad: result.volumenExcavacion },
    { partida: "Refine y nivelación de fondo de excavación", unidad: "m²", cantidad: result.areaNivelacionFondo },
    { partida: "Relleno y compactado con material propio", unidad: "m³", cantidad: result.volumenRelleno },
    { partida: "Eliminación de material excedente", unidad: "m³", cantidad: result.volumenEliminacionEsponjado },
  ];

  function update<K extends keyof MovimientoTierrasInput>(key: K, value: MovimientoTierrasInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "movimientoTierras",
      name: nombre || "Movimiento de Tierras",
      createdAt: Date.now(),
      concreteM3: 0,
      steelKg: 0,
      formworkM2: 0,
      lines,
      inputsSummary: {
        Excavación: `${input.largo} m x ${result.anchoExcavacion.toFixed(2)} m x ${input.profundidad} m x ${input.numeroExcavaciones}`,
        "Volumen excavado": `${result.volumenExcavacion.toFixed(2)} m³`,
      },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextName());
  }

  return (
    <div>
      <PageHeader
        title="Metrado de Movimiento de Tierras"
        subtitle="Excavación, relleno compactado y eliminación de material excedente para cimentaciones"
        icon={<Shovel size={20} />}
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
            <MovimientoTierrasSection input={input} anchoExcavacion={result.anchoExcavacion} volumenExcavacion={result.volumenExcavacion} />
          </SectionCard>

          <SectionCard title="Vista isométrica de la excavación (3D)" icon={<Box size={16} className="text-navy-700" />} collapsible>
            <MovimientoTierrasIsometric
              input={input}
              largoExcavacion={result.largoExcavacion}
              anchoExcavacion={result.anchoExcavacion}
              volumenExcavacion={result.volumenExcavacion}
            />
          </SectionCard>
        </StickyViewsRow>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <div className="flex flex-col gap-6">
          <SectionCard title="Identificación" icon={<Tag size={16} className="text-navy-700" />}>
            <TextField label="Nombre del elemento" value={nombre} onChange={setNombre} />
          </SectionCard>

          <SectionCard title="Geometría de la excavación" icon={<Ruler size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <SelectField
                  label="Tipo de excavación"
                  value={input.tipoExcavacion}
                  onChange={(v) => update("tipoExcavacion", v as TipoExcavacion)}
                  options={tipoExcavacionOptions}
                />
              </div>
              <div className="col-span-2">
                <NumberField
                  label="Longitud"
                  unit="m"
                  value={input.largo}
                  onChange={(v) => update("largo", v)}
                  helper={
                    input.tipoExcavacion === "zapata"
                      ? "Largo del pozo (dirección X de la zapata)"
                      : "Longitud total de la zanja o del tramo repetido"
                  }
                />
              </div>
              <NumberField
                label="Ancho neto"
                unit="m"
                value={input.ancho}
                onChange={(v) => update("ancho", v)}
                helper="Ancho de la cimentación (zapata, cimiento corrido, viga de cimentación)"
              />
              <NumberField
                label="Profundidad"
                unit="m"
                value={input.profundidad}
                onChange={(v) => update("profundidad", v)}
              />
              <NumberField
                label="N° de excavaciones iguales"
                unit="und"
                step={1}
                value={input.numeroExcavaciones}
                onChange={(v) => update("numeroExcavaciones", v)}
              />
              <NumberField
                label="Sobreancho de trabajo (por lado)"
                unit="cm"
                value={input.sobreanchoTrabajo}
                onChange={(v) => update("sobreanchoTrabajo", v)}
                helper="Holgura para encofrar y compactar; típico 10 cm"
              />
            </div>
          </SectionCard>

          <SectionCard title="Relleno y eliminación" icon={<Calculator size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <NumberField
                  label="Volumen ocupado por la cimentación"
                  unit="m³"
                  value={input.volumenOcupadoCimentacion}
                  onChange={(v) => update("volumenOcupadoCimentacion", v)}
                  helper="Volumen de concreto (o concreto ciclópeo) que desplazará al relleno; usa el resultado del módulo de la cimentación"
                />
              </div>
              <NumberField
                label="Esponjamiento del material"
                unit="%"
                value={input.porcentajeEsponjamiento}
                onChange={(v) => update("porcentajeEsponjamiento", v)}
                helper="Para eliminación/acarreo; típico 25-30%"
              />
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <WarningsBox warnings={result.warnings} />

          <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {input.tipoExcavacion === "zapata" && (
                <ResultMetric label="Largo de excavación" value={result.largoExcavacion} unit="m" />
              )}
              <ResultMetric label="Ancho de excavación" value={result.anchoExcavacion} unit="m" />
              <ResultMetric label="Volumen excavado" value={result.volumenExcavacion} unit="m³" accent="navy" />
              <ResultMetric label="Área de nivelación de fondo" value={result.areaNivelacionFondo} unit="m²" />
              <ResultMetric label="Relleno y compactado" value={result.volumenRelleno} unit="m³" accent="navy" />
              <ResultMetric label="Eliminación (en banco)" value={result.volumenEliminacion} unit="m³" accent="amber" />
              <ResultMetric label="Eliminación (esponjado)" value={result.volumenEliminacionEsponjado} unit="m³" accent="amber" />
            </div>
          </SectionCard>

          <SectionCard title="Resumen" icon={<ClipboardList size={16} className="text-navy-700" />}>
            <ResultTable lines={lines} />
          </SectionCard>

          <SectionCard title="Excavaciones registradas en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
            <ModuleElementsList module="movimientoTierras" emptyLabel="Aún no has agregado ninguna excavación. Calcula arriba y presiona 'Agregar a la lista'." />
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

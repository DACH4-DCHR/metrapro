import { useMemo, useState } from "react";
import { GitCommitHorizontal, Save, Plus, Trash2, Tag, Ruler, Grid3x3, Eye, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { SelectField } from "../components/ui/SelectField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { VigaCimentacionCrossSection } from "../components/diagrams/VigaCimentacionCrossSection";
import {
  calcularVigaCimentacion,
  sugerirSeparacionEstribosCimentacion,
  type VigaCimentacionInput,
  type BarraGrupo,
} from "../lib/calc/vigaCimentacion";
import { REBAR_SIZES, getRebar } from "../lib/materials";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

const rebarOptions = REBAR_SIZES.map((r) => ({ value: r.id, label: r.label }));
const numberFormatter = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 });

function nextName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "vigaCimentacion").length;
  return `Grupo de Vigas de Cimentación ${count + 1}`;
}

function grupoLabel(grupos: BarraGrupo[]): string {
  return grupos
    .filter((g) => g.cantidad > 0)
    .map((g) => `${g.cantidad}Ø${getRebar(g.diametroId).diameterMm}mm`)
    .join(" + ");
}

export function VigasCimentacionPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextName);

  const [input, setInput] = useState<VigaCimentacionInput>({
    numeroVigas: 4,
    luzLibre: 4,
    base: 30,
    altura: 40,
    barrasLongitudinales: [{ diametroId: "16", cantidad: 4 }],
    diametroEstribosId: "8",
    separacionEstribos: 20,
    recubrimiento: 4,
  });

  const result = useMemo(() => calcularVigaCimentacion(input), [input]);

  const lines: MetradoLine[] = [
    { partida: "Concreto f'c=210 kg/cm² en vigas de cimentación", unidad: "m³", cantidad: result.volumenConcreto },
    { partida: "Acero de refuerzo fy=4200 kg/cm²", unidad: "kg", cantidad: result.pesoAceroTotal },
    { partida: "Encofrado y desencofrado de vigas de cimentación", unidad: "m²", cantidad: result.areaEncofrado },
  ];

  function update<K extends keyof VigaCimentacionInput>(key: K, value: VigaCimentacionInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updateGrupo(index: number, patch: Partial<BarraGrupo>) {
    setInput((prev) => ({
      ...prev,
      barrasLongitudinales: prev.barrasLongitudinales.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    }));
    setSaved(false);
  }

  function addGrupo() {
    setInput((prev) => ({
      ...prev,
      barrasLongitudinales: [...prev.barrasLongitudinales, { diametroId: "12", cantidad: 2 }],
    }));
    setSaved(false);
  }

  function removeGrupo(index: number) {
    setInput((prev) => ({
      ...prev,
      barrasLongitudinales: prev.barrasLongitudinales.filter((_, i) => i !== index),
    }));
    setSaved(false);
  }

  function handleSugerirSeparacion() {
    const sugerida = sugerirSeparacionEstribosCimentacion(input.base, input.altura, input.barrasLongitudinales);
    update("separacionEstribos", sugerida);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "vigaCimentacion",
      name: nombre || "Vigas de Cimentación",
      createdAt: Date.now(),
      concreteM3: result.volumenConcreto,
      steelKg: result.pesoAceroTotal,
      formworkM2: result.areaEncofrado,
      lines,
      inputsSummary: {
        Cantidad: `${input.numeroVigas} vigas`,
        Sección: `${input.base} x ${input.altura} cm`,
        "Luz libre": `${input.luzLibre} m`,
        "Acero longitudinal": grupoLabel(input.barrasLongitudinales) || "-",
      },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextName());
  }

  return (
    <div>
      <PageHeader
        title="Metrado de Vigas de Cimentación"
        subtitle="Acoples horizontales entre zapatas o cabezales de pilotes (NTE E.060 Art. 21.12.3)"
        icon={<GitCommitHorizontal size={20} />}
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
              <NumberField
                label="N° de vigas"
                unit="und"
                step={1}
                value={input.numeroVigas}
                onChange={(v) => update("numeroVigas", v)}
              />
              <NumberField
                label="Luz libre entre apoyos"
                unit="m"
                value={input.luzLibre}
                onChange={(v) => update("luzLibre", v)}
                helper="Espacio libre entre zapatas o cabezales conectados"
              />
              <NumberField label="Base" unit="cm" value={input.base} onChange={(v) => update("base", v)} />
              <NumberField label="Altura" unit="cm" value={input.altura} onChange={(v) => update("altura", v)} />
            </div>
            <p className="mt-3 text-xs text-steel-500">
              Dimensión mínima sugerida: {numberFormatter.format(result.dimensionMinimaSugeridaCm)} cm (luz libre/20,
              máx. 45 cm — E.060 Art. 21.12.3.2)
            </p>
          </SectionCard>

          <SectionCard title="Acero de refuerzo" icon={<Grid3x3 size={16} className="text-navy-700" />}>
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-navy-800">
                Barras longitudinales (refuerzo continuo, superior e inferior)
              </span>
              {input.barrasLongitudinales.map((grupo, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="w-28">
                    <NumberField
                      label={i === 0 ? "Cantidad" : ""}
                      unit="und"
                      step={1}
                      value={grupo.cantidad}
                      onChange={(v) => updateGrupo(i, { cantidad: v })}
                    />
                  </div>
                  <div className="flex-1">
                    <SelectField
                      label={i === 0 ? "Diámetro" : ""}
                      value={grupo.diametroId}
                      onChange={(v) => updateGrupo(i, { diametroId: v })}
                      options={rebarOptions}
                    />
                  </div>
                  <button
                    onClick={() => removeGrupo(i)}
                    disabled={input.barrasLongitudinales.length <= 1}
                    aria-label="Quitar grupo"
                    className="mb-0.5 rounded p-2 text-steel-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                onClick={addGrupo}
                className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-steel-300 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-steel-50"
              >
                <Plus size={14} />
                Agregar grupo
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-steel-100 pt-4">
              <SelectField
                label="Ø de estribos cerrados"
                value={input.diametroEstribosId}
                onChange={(v) => update("diametroEstribosId", v)}
                options={rebarOptions}
              />
              <NumberField
                label="Separación de estribos"
                unit="cm"
                value={input.separacionEstribos}
                onChange={(v) => update("separacionEstribos", v)}
                helper={`Máx. sugerido: ${result.separacionMaximaSugeridaCm} cm`}
              />
              <NumberField
                label="Recubrimiento"
                unit="cm"
                value={input.recubrimiento}
                onChange={(v) => update("recubrimiento", v)}
              />
              <div className="flex items-end">
                <button
                  onClick={handleSugerirSeparacion}
                  className="w-full rounded-md border border-steel-300 bg-white px-3 py-2 text-xs font-semibold text-navy-800 hover:bg-steel-100"
                >
                  Usar separación máxima permitida
                </button>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <WarningsBox warnings={result.warnings} />

          <SectionCard title="Sección transversal (vista en vivo)" icon={<Eye size={16} className="text-navy-700" />}>
            <VigaCimentacionCrossSection input={input} />
          </SectionCard>

          <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <ResultMetric label="Área de sección" value={result.areaSeccion} unit="m²" />
              <ResultMetric label="Volumen de concreto" value={result.volumenConcreto} unit="m³" accent="navy" />
              <ResultMetric label="Área de encofrado" value={result.areaEncofrado} unit="m²" accent="amber" />
              <ResultMetric label="N° barras longitudinales" value={result.numeroBarrasLongitudinales} unit="und" />
              <ResultMetric label="Peso acero longitudinal" value={result.pesoAceroLongitudinal} unit="kg" accent="steel" />
              <ResultMetric label="N° de estribos (total)" value={result.numeroEstribosTotal} unit="und" />
              <ResultMetric label="Peso de estribos" value={result.pesoEstribos} unit="kg" accent="steel" />
              <ResultMetric label="Acero total" value={result.pesoAceroTotal} unit="kg" accent="steel" />
              <ResultMetric label="Longitud total de fierro" value={result.longitudTotalFierro} unit="m" accent="steel" />
            </div>
          </SectionCard>

          <SectionCard title="Resumen" icon={<ClipboardList size={16} className="text-navy-700" />}>
            <ResultTable lines={lines} />
          </SectionCard>

          <SectionCard title="Grupos de vigas de cimentación registrados en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
            <ModuleElementsList module="vigaCimentacion" emptyLabel="Aún no has agregado ningún grupo. Calcula arriba y presiona 'Agregar a la lista'." />
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

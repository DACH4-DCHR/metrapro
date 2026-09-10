import { useMemo, useState } from "react";
import { LayoutPanelTop, Save, Tag, Ruler, Grid3x3, Eye, Box, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { SelectField } from "../components/ui/SelectField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { StickyViewsRow } from "../components/ui/StickyViewsRow";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { LosaMacizaPlanView } from "../components/diagrams/LosaMacizaPlanView";
import { LosaMacizaIsometric } from "../components/diagrams/LosaMacizaIsometric";
import { calcularLosaMaciza, type LosaMacizaInput, type TipoApoyoLosaMaciza } from "../lib/calc/losaMaciza";
import { lineasAceroPorDiametro } from "../lib/calc/aceroResumen";
import { REBAR_SIZES } from "../lib/materials";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

const rebarOptions = REBAR_SIZES.map((r) => ({ value: r.id, label: r.label }));
const tipoApoyoOptions: { value: TipoApoyoLosaMaciza; label: string }[] = [
  { value: "simple", label: "Simplemente apoyada (L/20)" },
  { value: "un_extremo_continuo", label: "Un extremo continuo (L/24)" },
  { value: "ambos_continuos", label: "Ambos extremos continuos (L/28)" },
  { value: "voladizo", label: "En voladizo (L/10)" },
];

const numberFormatter = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 4 });

function nextName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "losaMaciza").length;
  return `Losa Maciza ${count + 1}`;
}

export function LosaMacizaPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextName);

  const [input, setInput] = useState<LosaMacizaInput>({
    largo: 4,
    ancho: 4,
    espesor: 20,
    tipoApoyo: "ambos_continuos",
    diametroPrincipalId: "12",
    separacionPrincipal: 20,
    diametroTemperaturaId: "10",
    separacionTemperatura: 20,
    incluirMallaSuperior: true,
    diametroPrincipalSupId: "12",
    separacionPrincipalSup: 20,
    diametroTemperaturaSupId: "10",
    separacionTemperaturaSup: 20,
    considerarGanchoLongitudinal: false,
    extremosConGancho: 2,
  });

  const result = useMemo(() => calcularLosaMaciza(input), [input]);

  const lines: MetradoLine[] = [
    { partida: "Concreto f'c=210 kg/cm² en losa maciza", unidad: "m³", cantidad: result.volumenConcreto },
    ...lineasAceroPorDiametro(result.desgloseAcero),
    { partida: "Encofrado y desencofrado de losa maciza", unidad: "m²", cantidad: result.encofradoM2 },
  ];

  function update<K extends keyof LosaMacizaInput>(key: K, value: LosaMacizaInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "losaMaciza",
      name: nombre || "Losa Maciza",
      createdAt: Date.now(),
      concreteM3: result.volumenConcreto,
      steelKg: result.pesoAceroTotal,
      formworkM2: result.encofradoM2,
      lines,
      steelByDiameter: result.desgloseAcero,
      inputsSummary: {
        Dimensiones: `${input.largo} x ${input.ancho} m`,
        Espesor: `${input.espesor} cm`,
        "Malla inferior": `Ø${input.diametroPrincipalId}mm@${input.separacionPrincipal}cm / Ø${input.diametroTemperaturaId}mm@${input.separacionTemperatura}cm`,
        ...(input.incluirMallaSuperior ? { "Malla superior": "sí" } : {}),
      },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextName());
  }

  return (
    <div>
      <PageHeader
        title="Metrado de Losa Maciza"
        subtitle="Losa de concreto armado de espesor uniforme, sin ladrillo aligerante"
        icon={<LayoutPanelTop size={20} />}
        actions={
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-navy-950 shadow-sm transition-colors hover:bg-amber-400"
          >
            <Save size={16} />
            {saved ? "Agregado ✓ (puedes calcular otra)" : "Agregar a la lista"}
          </button>
        }
      />

      <div className="p-6">
        <StickyViewsRow>
            <SectionCard title="Vista en planta (vista en vivo)" icon={<Eye size={16} className="text-navy-700" />}>
              <LosaMacizaPlanView input={input} />
            </SectionCard>

            <SectionCard title="Vista isométrica del acero (3D)" icon={<Box size={16} className="text-navy-700" />} collapsible>
              <LosaMacizaIsometric input={input} />
            </SectionCard>
        </StickyViewsRow>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <div className="flex flex-col gap-6">
          <SectionCard title="Identificación" icon={<Tag size={16} className="text-navy-700" />}>
            <TextField label="Nombre del elemento" value={nombre} onChange={setNombre} />
          </SectionCard>

          <SectionCard title="Geometría" icon={<Ruler size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="Largo (luz principal)" unit="m" value={input.largo} onChange={(v) => update("largo", v)} />
              <NumberField label="Ancho" unit="m" value={input.ancho} onChange={(v) => update("ancho", v)} />
              <NumberField label="Espesor" unit="cm" value={input.espesor} onChange={(v) => update("espesor", v)} />
              <div className="col-span-2">
                <SelectField
                  label="Condición de apoyo (dirección del largo)"
                  value={input.tipoApoyo}
                  onChange={(v) => update("tipoApoyo", v as TipoApoyoLosaMaciza)}
                  options={tipoApoyoOptions}
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-steel-500">
              Espesor mínimo sugerido: {numberFormatter.format(result.espesorMinimoCm)} cm (Tabla 9.1, E.060 Art. 9.6.2.1)
            </p>
          </SectionCard>

          <SectionCard title="Acero de refuerzo" icon={<Grid3x3 size={16} className="text-navy-700" />}>
            <span className="text-sm font-medium text-navy-800">Malla inferior</span>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <SelectField
                label="Ø principal (paralelo al largo)"
                value={input.diametroPrincipalId}
                onChange={(v) => update("diametroPrincipalId", v)}
                options={rebarOptions}
              />
              <NumberField
                label="Separación principal"
                unit="cm"
                value={input.separacionPrincipal}
                onChange={(v) => update("separacionPrincipal", v)}
              />
              <SelectField
                label="Ø temperatura (paralelo al ancho)"
                value={input.diametroTemperaturaId}
                onChange={(v) => update("diametroTemperaturaId", v)}
                options={rebarOptions}
              />
              <NumberField
                label="Separación temperatura"
                unit="cm"
                value={input.separacionTemperatura}
                onChange={(v) => update("separacionTemperatura", v)}
                helper={`Máx.: ${result.separacionMaximaCm.toFixed(0)} cm`}
              />
            </div>
            <p className="mt-3 text-xs text-steel-500">
              Cuantía de temperatura: {numberFormatter.format(result.cuantiaTemperatura)} (mín. 0,0018 — E.060 Art. 9.7.2)
            </p>

            <div className="mt-4 border-t border-steel-100 pt-4">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={input.incluirMallaSuperior}
                  onChange={(e) => update("incluirMallaSuperior", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
                />
                <span className="text-sm font-medium text-navy-800">
                  Incluir malla superior (losa continua, refuerzo negativo en apoyos)
                </span>
              </label>

              {input.incluirMallaSuperior && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <SelectField
                    label="Ø principal"
                    value={input.diametroPrincipalSupId}
                    onChange={(v) => update("diametroPrincipalSupId", v)}
                    options={rebarOptions}
                  />
                  <NumberField
                    label="Separación principal"
                    unit="cm"
                    value={input.separacionPrincipalSup}
                    onChange={(v) => update("separacionPrincipalSup", v)}
                  />
                  <SelectField
                    label="Ø temperatura"
                    value={input.diametroTemperaturaSupId}
                    onChange={(v) => update("diametroTemperaturaSupId", v)}
                    options={rebarOptions}
                  />
                  <NumberField
                    label="Separación temperatura"
                    unit="cm"
                    value={input.separacionTemperaturaSup}
                    onChange={(v) => update("separacionTemperaturaSup", v)}
                  />
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-steel-100 pt-4">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={input.considerarGanchoLongitudinal}
                  onChange={(e) => update("considerarGanchoLongitudinal", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
                />
                <span className="text-sm font-medium text-navy-800">
                  Considerar gancho estándar en extremos discontinuos (+12·db por extremo, malla inf. y sup.)
                </span>
              </label>
              {input.considerarGanchoLongitudinal && (
                <div className="mt-3 w-40">
                  <NumberField
                    label="Extremos con gancho"
                    unit="und"
                    step={1}
                    min={0}
                    max={2}
                    value={input.extremosConGancho}
                    onChange={(v) => update("extremosConGancho", Math.max(0, Math.min(2, v)))}
                    helper="Por barra: 0, 1 ó 2"
                  />
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <WarningsBox warnings={result.warnings} />


          <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <ResultMetric label="Área de losa" value={result.areaLosa} unit="m²" />
              <ResultMetric label="Volumen de concreto" value={result.volumenConcreto} unit="m³" accent="navy" />
              <ResultMetric label="Peso de concreto" value={result.pesoConcreto} unit="kg" accent="navy" />
              <ResultMetric label="Área de encofrado" value={result.encofradoM2} unit="m²" accent="amber" />
              <ResultMetric label="Barras principales (inf.)" value={result.numeroBarrasPrincipalInf} unit="und" />
              <ResultMetric label="Barras temperatura (inf.)" value={result.numeroBarrasTemperaturaInf} unit="und" />
              <ResultMetric label="Peso malla inferior" value={result.pesoMallaInferior} unit="kg" accent="steel" />
              {input.incluirMallaSuperior && (
                <>
                  <ResultMetric label="Barras principales (sup.)" value={result.numeroBarrasPrincipalSup} unit="und" />
                  <ResultMetric label="Barras temperatura (sup.)" value={result.numeroBarrasTemperaturaSup} unit="und" />
                  <ResultMetric label="Peso malla superior" value={result.pesoMallaSuperior} unit="kg" accent="steel" />
                </>
              )}
              <ResultMetric label="Acero total" value={result.pesoAceroTotal} unit="kg" accent="steel" />
              <ResultMetric label="Longitud total de fierro" value={result.longitudTotalFierro} unit="m" accent="steel" />
            </div>
          </SectionCard>

          <SectionCard title="Resumen" icon={<ClipboardList size={16} className="text-navy-700" />}>
            <ResultTable lines={lines} />
          </SectionCard>

          <SectionCard title="Losas macizas registradas en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
            <ModuleElementsList module="losaMaciza" emptyLabel="Aún no has agregado ninguna losa maciza. Calcula arriba y presiona 'Agregar a la lista'." />
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

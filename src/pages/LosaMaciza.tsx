import { useMemo, useState } from "react";
import { LayoutPanelTop, Save } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { SelectField } from "../components/ui/SelectField";
import { ResultTable } from "../components/ui/ResultTable";
import { WarningsBox } from "../components/ui/WarningsBox";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { LosaMacizaPlanView } from "../components/diagrams/LosaMacizaPlanView";
import { calcularLosaMaciza, type LosaMacizaInput, type TipoApoyoLosaMaciza } from "../lib/calc/losaMaciza";
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
  });

  const result = useMemo(() => calcularLosaMaciza(input), [input]);

  const lines: MetradoLine[] = [
    { partida: "Concreto f'c=210 kg/cm² en losa maciza", unidad: "m³", cantidad: result.volumenConcreto },
    { partida: "Acero de refuerzo fy=4200 kg/cm²", unidad: "kg", cantidad: result.pesoAceroTotal },
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
            className="flex items-center gap-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
          >
            <Save size={16} />
            {saved ? "Agregado ✓ (puedes calcular otra)" : "Agregar a la lista"}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-[420px_1fr]">
        <div className="flex flex-col gap-6">
          <SectionCard title="Identificación">
            <TextField label="Nombre del elemento" value={nombre} onChange={setNombre} />
          </SectionCard>

          <SectionCard title="Geometría">
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

          <SectionCard title="Acero de refuerzo">
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
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <WarningsBox warnings={result.warnings} />

          <SectionCard title="Vista en planta (vista en vivo)">
            <LosaMacizaPlanView input={input} />
          </SectionCard>

          <SectionCard title="Resultados de cálculo">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Metric label="Área de losa" value={result.areaLosa} unit="m²" />
              <Metric label="Volumen de concreto" value={result.volumenConcreto} unit="m³" />
              <Metric label="Peso de concreto" value={result.pesoConcreto} unit="kg" />
              <Metric label="Área de encofrado" value={result.encofradoM2} unit="m²" />
              <Metric label="Barras principales (inf.)" value={result.numeroBarrasPrincipalInf} unit="und" />
              <Metric label="Barras temperatura (inf.)" value={result.numeroBarrasTemperaturaInf} unit="und" />
              <Metric label="Peso malla inferior" value={result.pesoMallaInferior} unit="kg" />
              {input.incluirMallaSuperior && (
                <>
                  <Metric label="Barras principales (sup.)" value={result.numeroBarrasPrincipalSup} unit="und" />
                  <Metric label="Barras temperatura (sup.)" value={result.numeroBarrasTemperaturaSup} unit="und" />
                  <Metric label="Peso malla superior" value={result.pesoMallaSuperior} unit="kg" />
                </>
              )}
              <Metric label="Acero total" value={result.pesoAceroTotal} unit="kg" />
              <Metric label="Longitud total de fierro" value={result.longitudTotalFierro} unit="m" />
            </div>
          </SectionCard>

          <SectionCard title="Resumen">
            <ResultTable lines={lines} />
          </SectionCard>

          <SectionCard title="Losas macizas registradas en este proyecto">
            <ModuleElementsList module="losaMaciza" emptyLabel="Aún no has agregado ninguna losa maciza. Calcula arriba y presiona 'Agregar a la lista'." />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-md bg-steel-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{label}</p>
      <p className="text-base font-bold text-navy-900">
        {numberFormatter.format(value)} <span className="text-xs font-medium text-steel-500">{unit}</span>
      </p>
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

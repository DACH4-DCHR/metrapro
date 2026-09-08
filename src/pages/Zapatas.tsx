import { useMemo, useState } from "react";
import { Square, Save, Tag, Ruler, Grid3x3, Eye, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { SelectField } from "../components/ui/SelectField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { ZapataPlanView } from "../components/diagrams/ZapataPlanView";
import { calcularZapata, type ZapataInput } from "../lib/calc/zapata";
import { lineasAceroPorDiametro } from "../lib/calc/aceroResumen";
import { REBAR_SIZES } from "../lib/materials";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

const rebarOptions = REBAR_SIZES.map((r) => ({ value: r.id, label: r.label }));

function nextZapataName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "zapata").length;
  return `Grupo de Zapatas ${count + 1}`;
}

export function ZapatasPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextZapataName);

  const [input, setInput] = useState<ZapataInput>({
    numeroZapatas: 4,
    largo: 1.6,
    ancho: 1.6,
    peralte: 40,
    recubrimiento: 7.5,
    diametroInferiorXId: "16",
    separacionInferiorX: 20,
    diametroInferiorYId: "16",
    separacionInferiorY: 20,
    incluirMallaSuperior: false,
    diametroSuperiorXId: "12",
    separacionSuperiorX: 25,
    diametroSuperiorYId: "12",
    separacionSuperiorY: 25,
  });

  const result = useMemo(() => calcularZapata(input), [input]);

  const lines: MetradoLine[] = [
    { partida: "Concreto f'c=210 kg/cm² en zapatas", unidad: "m³", cantidad: result.volumenConcreto },
    ...lineasAceroPorDiametro(result.desgloseAcero),
    { partida: "Encofrado y desencofrado de zapatas", unidad: "m²", cantidad: result.encofradoM2 },
  ];

  function update<K extends keyof ZapataInput>(key: K, value: ZapataInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "zapata",
      name: nombre || "Zapatas",
      createdAt: Date.now(),
      concreteM3: result.volumenConcreto,
      steelKg: result.pesoAceroTotal,
      formworkM2: result.encofradoM2,
      lines,
      steelByDiameter: result.desgloseAcero,
      inputsSummary: {
        Cantidad: `${input.numeroZapatas} zapatas`,
        Dimensiones: `${input.largo} x ${input.ancho} x ${input.peralte / 100} m`,
        "Malla inferior": `Ø${input.diametroInferiorXId}mm@${input.separacionInferiorX}cm / Ø${input.diametroInferiorYId}mm@${input.separacionInferiorY}cm`,
        ...(input.incluirMallaSuperior
          ? { "Malla superior": `Ø${input.diametroSuperiorXId}mm@${input.separacionSuperiorX}cm / Ø${input.diametroSuperiorYId}mm@${input.separacionSuperiorY}cm` }
          : {}),
      },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextZapataName());
  }

  return (
    <div>
      <PageHeader
        title="Metrado de Zapatas Aisladas"
        subtitle="Zapatas rectangulares de concreto armado con malla de acero inferior y superior"
        icon={<Square size={20} />}
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

      <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-[420px_1fr]">
        <div className="flex flex-col gap-6">
          <SectionCard title="Identificación" icon={<Tag size={16} className="text-navy-700" />}>
            <TextField label="Nombre del elemento" value={nombre} onChange={setNombre} />
          </SectionCard>

          <SectionCard title="Geometría" icon={<Ruler size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="N° de zapatas"
                unit="und"
                step={1}
                value={input.numeroZapatas}
                onChange={(v) => update("numeroZapatas", v)}
              />
              <NumberField label="Largo (X)" unit="m" value={input.largo} onChange={(v) => update("largo", v)} />
              <NumberField label="Ancho (Y)" unit="m" value={input.ancho} onChange={(v) => update("ancho", v)} />
              <NumberField
                label="Peralte"
                unit="cm"
                value={input.peralte}
                onChange={(v) => update("peralte", v)}
                helper="Mínimo 30 cm sobre suelo (E.060 Art. 15.8.1.1)"
              />
              <NumberField
                label="Recubrimiento"
                unit="cm"
                value={input.recubrimiento}
                onChange={(v) => update("recubrimiento", v)}
                helper="Mínimo 7.5 cm, concreto contra el suelo (E.060 Art. 7.7.1a)"
              />
            </div>
          </SectionCard>

          <SectionCard title="Acero de refuerzo" icon={<Grid3x3 size={16} className="text-navy-700" />}>
            <span className="text-sm font-medium text-navy-800">Malla inferior</span>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <SelectField
                label="Ø dirección X (largo)"
                value={input.diametroInferiorXId}
                onChange={(v) => update("diametroInferiorXId", v)}
                options={rebarOptions}
              />
              <NumberField
                label="Separación X"
                unit="cm"
                value={input.separacionInferiorX}
                onChange={(v) => update("separacionInferiorX", v)}
              />
              <SelectField
                label="Ø dirección Y (ancho)"
                value={input.diametroInferiorYId}
                onChange={(v) => update("diametroInferiorYId", v)}
                options={rebarOptions}
              />
              <NumberField
                label="Separación Y"
                unit="cm"
                value={input.separacionInferiorY}
                onChange={(v) => update("separacionInferiorY", v)}
              />
            </div>

            <div className="mt-4 border-t border-steel-100 pt-4">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={input.incluirMallaSuperior}
                  onChange={(e) => update("incluirMallaSuperior", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
                />
                <span className="text-sm font-medium text-navy-800">
                  Incluir malla superior (zapatas excéntricas o con momento)
                </span>
              </label>

              {input.incluirMallaSuperior && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <SelectField
                    label="Ø dirección X (largo)"
                    value={input.diametroSuperiorXId}
                    onChange={(v) => update("diametroSuperiorXId", v)}
                    options={rebarOptions}
                  />
                  <NumberField
                    label="Separación X"
                    unit="cm"
                    value={input.separacionSuperiorX}
                    onChange={(v) => update("separacionSuperiorX", v)}
                  />
                  <SelectField
                    label="Ø dirección Y (ancho)"
                    value={input.diametroSuperiorYId}
                    onChange={(v) => update("diametroSuperiorYId", v)}
                    options={rebarOptions}
                  />
                  <NumberField
                    label="Separación Y"
                    unit="cm"
                    value={input.separacionSuperiorY}
                    onChange={(v) => update("separacionSuperiorY", v)}
                  />
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <WarningsBox warnings={result.warnings} />

          <SectionCard title="Vista en planta (vista en vivo)" icon={<Eye size={16} className="text-navy-700" />}>
            <ZapataPlanView input={input} />
          </SectionCard>

          <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <ResultMetric label="Área en planta" value={result.areaPlanta} unit="m²" />
              <ResultMetric label="Volumen de concreto" value={result.volumenConcreto} unit="m³" accent="navy" />
              <ResultMetric label="Peso de concreto" value={result.pesoConcreto} unit="kg" accent="navy" />
              <ResultMetric label="Área de encofrado" value={result.encofradoM2} unit="m²" accent="amber" />
              <ResultMetric label="Barras malla inf. (X)" value={result.numeroBarrasInferiorX} unit="und" />
              <ResultMetric label="Barras malla inf. (Y)" value={result.numeroBarrasInferiorY} unit="und" />
              <ResultMetric label="Peso malla inferior" value={result.pesoMallaInferior} unit="kg" accent="steel" />
              {input.incluirMallaSuperior && (
                <>
                  <ResultMetric label="Barras malla sup. (X)" value={result.numeroBarrasSuperiorX} unit="und" />
                  <ResultMetric label="Barras malla sup. (Y)" value={result.numeroBarrasSuperiorY} unit="und" />
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

          <SectionCard title="Grupos de zapatas registrados en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
            <ModuleElementsList module="zapata" emptyLabel="Aún no has agregado ningún grupo de zapatas. Calcula arriba y presiona 'Agregar a la lista'." />
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

import { useMemo, useState } from "react";
import { PanelLeft, Save, Plus, Trash2, Tag, Ruler, Grid3x3, ShieldCheck, Eye, Box, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { SelectField } from "../components/ui/SelectField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { PlacaElevation } from "../components/diagrams/PlacaElevation";
import { PlacaIsometric } from "../components/diagrams/PlacaIsometric";
import { calcularPlaca, type PlacaInput, type TipoPlaca, type BarraGrupo } from "../lib/calc/placa";
import { lineasAceroPorDiametro } from "../lib/calc/aceroResumen";
import { REBAR_SIZES, getRebar } from "../lib/materials";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

const rebarOptions = REBAR_SIZES.map((r) => ({ value: r.id, label: r.label }));
const tipoMuroOptions: { value: TipoPlaca; label: string }[] = [
  { value: "estructural", label: "Estructural (E.060 Art. 21.9.3.2)" },
  { value: "ductilidad_limitada", label: "Ductilidad limitada (E.060 Art. 21.9.3.3)" },
];
const capasOptions = [
  { value: "1", label: "1 capa" },
  { value: "2", label: "2 capas (obligatorio si espesor ≥ 20 cm)" },
];

const numberFormatter = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 4 });

function nextName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "placa").length;
  return `Grupo de Placas ${count + 1}`;
}

function grupoLabel(grupos: BarraGrupo[]): string {
  return grupos
    .filter((g) => g.cantidad > 0)
    .map((g) => `${g.cantidad}Ø${getRebar(g.diametroId).diameterMm}mm`)
    .join(" + ");
}

export function PlacasPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextName);

  const [input, setInput] = useState<PlacaInput>({
    numeroMuros: 2,
    longitud: 3,
    alturaLibre: 2.6,
    espesor: 20,
    tipoMuro: "estructural",
    numeroCapas: 2,
    diametroHorizontalId: "10",
    separacionHorizontal: 25,
    diametroVerticalId: "10",
    separacionVertical: 25,
    incluirElementoBorde: false,
    anchoElementoBorde: 40,
    barrasElementoBorde: [{ diametroId: "16", cantidad: 4 }],
    diametroEstribosBordeId: "8",
    separacionEstribosBorde: 9,
    recubrimiento: 3,
    considerarGanchoEstribo: true,
  });

  const result = useMemo(() => calcularPlaca(input), [input]);

  const lines: MetradoLine[] = [
    { partida: "Concreto f'c=210 kg/cm² en placas", unidad: "m³", cantidad: result.volumenConcreto },
    ...lineasAceroPorDiametro(result.desgloseAcero),
    { partida: "Encofrado y desencofrado de placas", unidad: "m²", cantidad: result.areaEncofrado },
  ];

  function update<K extends keyof PlacaInput>(key: K, value: PlacaInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updateGrupoBorde(index: number, patch: Partial<BarraGrupo>) {
    setInput((prev) => ({
      ...prev,
      barrasElementoBorde: prev.barrasElementoBorde.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    }));
    setSaved(false);
  }

  function addGrupoBorde() {
    setInput((prev) => ({
      ...prev,
      barrasElementoBorde: [...prev.barrasElementoBorde, { diametroId: "16", cantidad: 2 }],
    }));
    setSaved(false);
  }

  function removeGrupoBorde(index: number) {
    setInput((prev) => ({
      ...prev,
      barrasElementoBorde: prev.barrasElementoBorde.filter((_, i) => i !== index),
    }));
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "placa",
      name: nombre || "Placas",
      createdAt: Date.now(),
      concreteM3: result.volumenConcreto,
      steelKg: result.pesoAceroTotal,
      formworkM2: result.areaEncofrado,
      lines,
      steelByDiameter: result.desgloseAcero,
      inputsSummary: {
        Cantidad: `${input.numeroMuros} muros`,
        Dimensiones: `${input.longitud} m x ${input.alturaLibre} m x ${input.espesor} cm`,
        "Refuerzo distribuido": `V: Ø${getRebar(input.diametroVerticalId).diameterMm}mm@${input.separacionVertical}cm / H: Ø${getRebar(input.diametroHorizontalId).diameterMm}mm@${input.separacionHorizontal}cm`,
        ...(input.incluirElementoBorde
          ? { "Elemento de borde": grupoLabel(input.barrasElementoBorde) || "-" }
          : {}),
      },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextName());
  }

  return (
    <div>
      <PageHeader
        title="Metrado de Placas (Muros Estructurales)"
        subtitle="Muros de concreto armado que resisten fuerzas sísmicas en su plano (NTE E.060 Art. 21.9)"
        icon={<PanelLeft size={20} />}
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
                label="N° de muros"
                unit="und"
                step={1}
                value={input.numeroMuros}
                onChange={(v) => update("numeroMuros", v)}
              />
              <NumberField
                label="Altura libre de entrepiso"
                unit="m"
                value={input.alturaLibre}
                onChange={(v) => update("alturaLibre", v)}
              />
              <NumberField
                label="Longitud de muro"
                unit="m"
                value={input.longitud}
                onChange={(v) => update("longitud", v)}
              />
              <NumberField label="Espesor" unit="cm" value={input.espesor} onChange={(v) => update("espesor", v)} />
              <div className="col-span-2">
                <SelectField
                  label="Tipo de muro"
                  value={input.tipoMuro}
                  onChange={(v) => update("tipoMuro", v as TipoPlaca)}
                  options={tipoMuroOptions}
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-steel-500">
              Espesor mínimo sugerido: {numberFormatter.format(result.espesorMinimoCm)} cm
            </p>
          </SectionCard>

          <SectionCard title="Refuerzo distribuido (alma)" icon={<Grid3x3 size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <SelectField
                  label="N° de capas"
                  value={String(input.numeroCapas)}
                  onChange={(v) => update("numeroCapas", Number(v) as 1 | 2)}
                  options={capasOptions}
                />
              </div>
              <SelectField
                label="Ø vertical"
                value={input.diametroVerticalId}
                onChange={(v) => update("diametroVerticalId", v)}
                options={rebarOptions}
              />
              <NumberField
                label="Separación vertical"
                unit="cm"
                value={input.separacionVertical}
                onChange={(v) => update("separacionVertical", v)}
                helper={`Máx. sugerido: ${result.separacionMaximaSugeridaCm.toFixed(0)} cm`}
              />
              <SelectField
                label="Ø horizontal"
                value={input.diametroHorizontalId}
                onChange={(v) => update("diametroHorizontalId", v)}
                options={rebarOptions}
              />
              <NumberField
                label="Separación horizontal"
                unit="cm"
                value={input.separacionHorizontal}
                onChange={(v) => update("separacionHorizontal", v)}
                helper={`Máx. sugerido: ${result.separacionMaximaSugeridaCm.toFixed(0)} cm`}
              />
            </div>
            <p className="mt-3 text-xs text-steel-500">
              Cuantía vertical: {numberFormatter.format(result.cuantiaVertical)} (mín. 0,0015) · Cuantía horizontal:{" "}
              {numberFormatter.format(result.cuantiaHorizontal)} (mín. 0,002) — E.060 Art. 11.10.7 / 21.9.4.1
            </p>
          </SectionCard>

          <SectionCard title="Elementos de borde" icon={<ShieldCheck size={16} className="text-navy-700" />}>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={input.incluirElementoBorde}
                onChange={(e) => update("incluirElementoBorde", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
              />
              <span className="text-sm font-medium text-navy-800">
                Incluir elementos de borde confinados en los extremos (E.060 Art. 21.9.7)
              </span>
            </label>

            {input.incluirElementoBorde && (
              <div className="mt-4 flex flex-col gap-4">
                <NumberField
                  label="Ancho del elemento de borde"
                  unit="cm"
                  value={input.anchoElementoBorde}
                  onChange={(v) => update("anchoElementoBorde", v)}
                  helper="Por extremo, medido a lo largo del muro"
                />

                <div className="flex flex-col gap-3">
                  <span className="text-sm font-medium text-navy-800">Acero longitudinal (por extremo)</span>
                  {input.barrasElementoBorde.map((grupo, i) => (
                    <div key={i} className="flex items-end gap-2">
                      <div className="w-28">
                        <NumberField
                          label={i === 0 ? "Cantidad" : ""}
                          unit="und"
                          step={1}
                          value={grupo.cantidad}
                          onChange={(v) => updateGrupoBorde(i, { cantidad: v })}
                        />
                      </div>
                      <div className="flex-1">
                        <SelectField
                          label={i === 0 ? "Diámetro" : ""}
                          value={grupo.diametroId}
                          onChange={(v) => updateGrupoBorde(i, { diametroId: v })}
                          options={rebarOptions}
                        />
                      </div>
                      <button
                        onClick={() => removeGrupoBorde(i)}
                        disabled={input.barrasElementoBorde.length <= 1}
                        aria-label="Quitar grupo"
                        className="mb-0.5 rounded p-2 text-steel-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addGrupoBorde}
                    className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-steel-300 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-steel-50"
                  >
                    <Plus size={14} />
                    Agregar grupo
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-steel-100 pt-4">
                  <SelectField
                    label="Ø de estribos"
                    value={input.diametroEstribosBordeId}
                    onChange={(v) => update("diametroEstribosBordeId", v)}
                    options={rebarOptions}
                  />
                  <NumberField
                    label="Separación de estribos"
                    unit="cm"
                    value={input.separacionEstribosBorde}
                    onChange={(v) => update("separacionEstribosBorde", v)}
                    helper={`Máx.: ${result.separacionMaximaEstribosBordeCm.toFixed(1)} cm`}
                  />
                  <NumberField
                    label="Recubrimiento"
                    unit="cm"
                    value={input.recubrimiento}
                    onChange={(v) => update("recubrimiento", v)}
                  />
                  <label className="col-span-2 flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={input.considerarGanchoEstribo}
                      onChange={(e) => update("considerarGanchoEstribo", e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
                    />
                    <span className="text-xs font-medium text-navy-800">Gancho a 135° en estribos (según Ø)</span>
                  </label>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <WarningsBox warnings={result.warnings} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:sticky xl:top-24 xl:z-10">
            <SectionCard title="Elevación (vista en vivo)" icon={<Eye size={16} className="text-navy-700" />}>
              <PlacaElevation input={input} />
            </SectionCard>

            <SectionCard title="Vista isométrica del acero (3D)" icon={<Box size={16} className="text-navy-700" />} collapsible>
              <PlacaIsometric input={input} />
            </SectionCard>
          </div>

          <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <ResultMetric label="Área de muro (1 cara)" value={result.areaMuro} unit="m²" />
              <ResultMetric label="Volumen de concreto" value={result.volumenConcreto} unit="m³" accent="navy" />
              <ResultMetric label="Área de encofrado" value={result.areaEncofrado} unit="m²" accent="amber" />
              <ResultMetric label="Barras horizontales" value={result.numeroBarrasHorizontales} unit="und" />
              <ResultMetric label="Peso acero horizontal" value={result.pesoAceroHorizontal} unit="kg" accent="steel" />
              <ResultMetric label="Barras verticales" value={result.numeroBarrasVerticales} unit="und" />
              <ResultMetric label="Peso acero vertical" value={result.pesoAceroVertical} unit="kg" accent="steel" />
              {input.incluirElementoBorde && (
                <>
                  <ResultMetric label="Barras elemento de borde (x extremo)" value={result.numeroBarrasElementoBorde} unit="und" />
                  <ResultMetric label="Peso acero elemento de borde" value={result.pesoAceroElementoBorde} unit="kg" accent="steel" />
                  <ResultMetric label="Estribos borde (x extremo)" value={result.numeroEstribosElementoBorde} unit="und" />
                  <ResultMetric label="Peso estribos de borde" value={result.pesoEstribosElementoBorde} unit="kg" accent="steel" />
                </>
              )}
              <ResultMetric label="Acero total" value={result.pesoAceroTotal} unit="kg" accent="steel" />
              <ResultMetric label="Longitud total de fierro" value={result.longitudTotalFierro} unit="m" accent="steel" />
            </div>
          </SectionCard>

          <SectionCard title="Resumen" icon={<ClipboardList size={16} className="text-navy-700" />}>
            <ResultTable lines={lines} />
          </SectionCard>

          <SectionCard title="Grupos de placas registrados en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
            <ModuleElementsList module="placa" emptyLabel="Aún no has agregado ningún grupo de placas. Calcula arriba y presiona 'Agregar a la lista'." />
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

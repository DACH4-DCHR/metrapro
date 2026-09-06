import { useMemo, useState } from "react";
import { Layers3, Save } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { SelectField } from "../components/ui/SelectField";
import { ResultTable } from "../components/ui/ResultTable";
import { WarningsBox } from "../components/ui/WarningsBox";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { LosaCrossSection } from "../components/diagrams/LosaCrossSection";
import { calcularLosaAligerada, type AceroViguetasMetodo, type LosaAligeradaInput } from "../lib/calc/losaAligerada";
import { HOLLOW_BLOCK_HEIGHT_OPTIONS, HOLLOW_BLOCK_MATERIALS, REBAR_SIZES, type HollowBlockMaterialId } from "../lib/materials";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

const tipoLadrilloOptions = [
  ...HOLLOW_BLOCK_HEIGHT_OPTIONS.map((b) => ({ value: b.id, label: `${b.heightCm} cm` })),
  { value: "personalizado", label: "Personalizado" },
];

const materialLadrilloOptions = HOLLOW_BLOCK_MATERIALS.map((m) => ({ value: m.id, label: m.label }));

const aceroViguetasMetodoOptions: { value: AceroViguetasMetodo; label: string }[] = [
  { value: "barras", label: "N° de barras por vigueta" },
  { value: "ratio", label: "Ratio (kg/m²)" },
];

const rebarOptions = REBAR_SIZES.map((r) => ({ value: r.id, label: r.label }));

const numberFormatter = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 });

function nextLosaName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "losa").length;
  return `Losa Aligerada ${count + 1}`;
}

export function LosaAligeradaPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextLosaName);

  const [input, setInput] = useState<LosaAligeradaInput>({
    largo: 6,
    ancho: 5,
    espesorLosa: 20,
    separacionViguetas: 40,
    anchoVigueta: 10,
    tipoLadrillo: "15",
    alturaLadrilloPersonalizado: 15,
    materialLadrillo: "arcilla",
    temperaturaDiametroId: "6",
    temperaturaSeparacion: 25,
    aceroViguetasMetodo: "barras",
    ratioAceroViguetasKgM2: 7,
    numeroVarillasPorVigueta: 2,
    diametroVarillaViguetaId: "8",
    desperdicioLadrilloPct: 5,
  });

  const result = useMemo(() => calcularLosaAligerada(input), [input]);

  const materialLabel = HOLLOW_BLOCK_MATERIALS.find((m) => m.id === input.materialLadrillo)?.label ?? "Ladrillo";

  const lines: MetradoLine[] = [
    { partida: "Concreto f'c=210 kg/cm² losa aligerada", unidad: "m³", cantidad: result.volumenConcreto },
    { partida: "Acero de refuerzo fy=4200 kg/cm²", unidad: "kg", cantidad: result.aceroTotalKg },
    { partida: `${materialLabel} para techo`, unidad: "und", cantidad: result.numeroLadrillos },
    { partida: "Encofrado y desencofrado de losa", unidad: "m²", cantidad: result.encofradoM2 },
  ];

  function update<K extends keyof LosaAligeradaInput>(key: K, value: LosaAligeradaInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "losa",
      name: nombre || "Losa Aligerada",
      createdAt: Date.now(),
      concreteM3: result.volumenConcreto,
      steelKg: result.aceroTotalKg,
      formworkM2: result.encofradoM2,
      lines,
      inputsSummary: {
        Dimensiones: `${input.largo} x ${input.ancho} m`,
        Espesor: `${input.espesorLosa} cm`,
        Ladrillo:
          (input.tipoLadrillo === "personalizado"
            ? `${input.alturaLadrilloPersonalizado} cm (personalizado)`
            : `${input.tipoLadrillo} cm`) + ` — ${materialLabel}`,
      },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextLosaName());
  }

  return (
    <div>
      <PageHeader
        title="Metrado de Losa Aligerada"
        subtitle="Losas de concreto armado con ladrillo aligerante y viguetas"
        icon={<Layers3 size={20} />}
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
            <NumberFieldLikeText label="Nombre del elemento" value={nombre} onChange={setNombre} />
          </SectionCard>

          <SectionCard title="Datos geométricos" icon={<Layers3 size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="Largo de losa" unit="m" value={input.largo} onChange={(v) => update("largo", v)} />
              <NumberField label="Ancho de losa" unit="m" value={input.ancho} onChange={(v) => update("ancho", v)} />
              <NumberField
                label="Espesor de losa"
                unit="cm"
                value={input.espesorLosa}
                onChange={(v) => update("espesorLosa", v)}
              />
              <NumberField
                label="Separación viguetas"
                unit="cm"
                value={input.separacionViguetas}
                onChange={(v) => update("separacionViguetas", v)}
                helper="Eje a eje, típico 40 cm"
              />
              <NumberField
                label="Ancho de vigueta"
                unit="cm"
                value={input.anchoVigueta}
                onChange={(v) => update("anchoVigueta", v)}
                helper="Típico 10 cm"
              />
            </div>
          </SectionCard>

          <SectionCard title="Ladrillo / bloque aligerante">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <SelectField
                  label="Material"
                  value={input.materialLadrillo}
                  onChange={(v) => update("materialLadrillo", v as HollowBlockMaterialId)}
                  options={materialLadrilloOptions}
                />
              </div>
              <SelectField
                label="Altura"
                value={input.tipoLadrillo}
                onChange={(v) => update("tipoLadrillo", v as LosaAligeradaInput["tipoLadrillo"])}
                options={tipoLadrilloOptions}
              />
              {input.tipoLadrillo === "personalizado" && (
                <NumberField
                  label="Altura personalizada"
                  unit="cm"
                  value={input.alturaLadrilloPersonalizado ?? 0}
                  onChange={(v) => update("alturaLadrilloPersonalizado", v)}
                />
              )}
              <NumberField
                label="Desperdicio"
                unit="%"
                value={input.desperdicioLadrilloPct}
                onChange={(v) => update("desperdicioLadrilloPct", v)}
              />
            </div>
          </SectionCard>

          <SectionCard title="Acero de refuerzo">
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Ø temperatura (capa comp.)"
                value={input.temperaturaDiametroId}
                onChange={(v) => update("temperaturaDiametroId", v)}
                options={rebarOptions}
              />
              <NumberField
                label="Separación temperatura"
                unit="cm"
                value={input.temperaturaSeparacion}
                onChange={(v) => update("temperaturaSeparacion", v)}
              />
            </div>

            <div className="mt-4 border-t border-steel-100 pt-4">
              <SelectField
                label="Acero principal de viguetas — método de cálculo"
                value={input.aceroViguetasMetodo}
                onChange={(v) => update("aceroViguetasMetodo", v as AceroViguetasMetodo)}
                options={aceroViguetasMetodoOptions}
              />

              {input.aceroViguetasMetodo === "barras" ? (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <NumberField
                    label="N° de varillas por vigueta"
                    unit="und"
                    step={1}
                    value={input.numeroVarillasPorVigueta}
                    onChange={(v) => update("numeroVarillasPorVigueta", v)}
                    helper="Típico: 2 (corridas)"
                  />
                  <SelectField
                    label="Ø de varilla"
                    value={input.diametroVarillaViguetaId}
                    onChange={(v) => update("diametroVarillaViguetaId", v)}
                    options={rebarOptions}
                  />
                </div>
              ) : (
                <div className="mt-4">
                  <NumberField
                    label="Ratio acero viguetas"
                    unit="kg/m²"
                    value={input.ratioAceroViguetasKgM2}
                    onChange={(v) => update("ratioAceroViguetasKgM2", v)}
                    helper="Estimado, ajustable según diseño estructural real"
                  />
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <WarningsBox warnings={result.warnings} />

          <SectionCard title="Corte transversal (vista en vivo)">
            <LosaCrossSection input={input} />
          </SectionCard>

          <SectionCard title="Resultados de cálculo">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Metric label="Área de losa" value={result.areaLosa} unit="m²" />
              <Metric label="Volumen de concreto" value={result.volumenConcreto} unit="m³" />
              <Metric label="Capa de compresión" value={result.capaCompresionM * 100} unit="cm" />
              <Metric label="Volumen de nervios" value={result.volumenNervios} unit="m³" />
              <Metric label="Vol. capa de compresión" value={result.volumenCapaCompresion} unit="m³" />
              <Metric label="N° de viguetas" value={result.numeroViguetas} unit="und" />
              <Metric label="Longitud de viguetas" value={result.longitudViguetas} unit="m" />
              <Metric label="Ladrillos por m²" value={result.ladrillosPorM2} unit="und/m²" />
              <Metric label="N° total de ladrillos" value={result.numeroLadrillos} unit="und" />
              <Metric label="Peso de ladrillos" value={result.pesoLadrillos} unit="kg" />
              <Metric label="Peso de concreto" value={result.pesoConcreto} unit="kg" />
              <Metric label="Acero total" value={result.aceroTotalKg} unit="kg" />
              <Metric label="Peso total materiales" value={result.pesoTotalMateriales} unit="kg" />
              <Metric label="Encofrado" value={result.encofradoM2} unit="m²" />
            </div>
          </SectionCard>

          <SectionCard title="Cuadro de metrados">
            <ResultTable lines={lines} />
          </SectionCard>

          <SectionCard title="Losas registradas en este proyecto">
            <ModuleElementsList module="losa" emptyLabel="Aún no has agregado ninguna losa. Calcula arriba y presiona 'Guardar elemento'." />
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

function NumberFieldLikeText({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
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

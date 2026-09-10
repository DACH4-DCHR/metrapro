import { useMemo, useState } from "react";
import { Grid2x2, Save, Plus, Trash2, Tag, Ruler, Package, ShieldCheck, Eye, Box, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { SelectField } from "../components/ui/SelectField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { MuroArquitecturaElevation } from "../components/diagrams/MuroArquitecturaElevation";
import { MuroArquitecturaIsometric } from "../components/diagrams/MuroArquitecturaIsometric";
import { calcularMuroArquitectura, type MuroArquitecturaInput, type BarraGrupo } from "../lib/calc/muroArquitectura";
import { lineasAceroPorDiametro } from "../lib/calc/aceroResumen";
import { REBAR_SIZES, getRebar } from "../lib/materials";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

const rebarOptions = REBAR_SIZES.map((r) => ({ value: r.id, label: r.label }));

function nextName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "muroArquitectura").length;
  return `Muro de Arquitectura ${count + 1}`;
}

function grupoLabel(grupos: BarraGrupo[]): string {
  return grupos
    .filter((g) => g.cantidad > 0)
    .map((g) => `${g.cantidad}Ø${getRebar(g.diametroId).diameterMm}mm`)
    .join(" + ");
}

export function MurosArquitecturaPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextName);

  const [input, setInput] = useState<MuroArquitecturaInput>({
    longitud: 4,
    alturaLibre: 2.6,
    espesor: 10,
    areaVanos: 0,
    largoUnidad: 24,
    alturaUnidad: 24,
    juntaMortero: 1.5,
    desperdicioPct: 5,
    incluirArriostres: false,
    numeroColumnetas: 2,
    peralteColumneta: 15,
    barrasColumneta: [{ diametroId: "8", cantidad: 4 }],
    diametroEstribosColumnetaId: "6",
    separacionEstribosColumneta: 20,
    recubrimiento: 2,
    considerarGanchoEstribo: true,
  });

  const result = useMemo(() => calcularMuroArquitectura(input), [input]);

  const lines: MetradoLine[] = [
    { partida: "Tabique de albañilería (pandereta)", unidad: "m²", cantidad: result.areaMuroNeta },
    { partida: "Ladrillo pandereta para tabique", unidad: "und", cantidad: result.numeroUnidades },
    { partida: "Mortero para asentado (cemento-arena 1:5)", unidad: "m³", cantidad: result.volumenMortero },
    ...(input.incluirArriostres
      ? [
          {
            partida: "Concreto f'c=175 kg/cm² en columnetas de arriostre",
            unidad: "m³",
            cantidad: result.volumenConcretoColumnetas,
          },
          ...lineasAceroPorDiametro(result.desgloseAcero),
          { partida: "Encofrado de columnetas de arriostre", unidad: "m²", cantidad: result.encofradoColumnetas },
        ]
      : []),
  ];

  function update<K extends keyof MuroArquitecturaInput>(key: K, value: MuroArquitecturaInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updateGrupo(index: number, patch: Partial<BarraGrupo>) {
    setInput((prev) => ({
      ...prev,
      barrasColumneta: prev.barrasColumneta.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    }));
    setSaved(false);
  }
  function addGrupo() {
    setInput((prev) => ({ ...prev, barrasColumneta: [...prev.barrasColumneta, { diametroId: "8", cantidad: 2 }] }));
    setSaved(false);
  }
  function removeGrupo(index: number) {
    setInput((prev) => ({ ...prev, barrasColumneta: prev.barrasColumneta.filter((_, i) => i !== index) }));
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "muroArquitectura",
      name: nombre || "Muro de Arquitectura",
      createdAt: Date.now(),
      concreteM3: result.volumenConcretoColumnetas,
      steelKg: result.pesoAceroTotal,
      formworkM2: result.encofradoColumnetas,
      lines,
      steelByDiameter: result.desgloseAcero,
      inputsSummary: {
        Dimensiones: `${input.longitud} m x ${input.alturaLibre} m x ${input.espesor} cm`,
        Unidades: `${result.numeroUnidades} und`,
        ...(input.incluirArriostres
          ? { "Columnetas de arriostre": `${input.numeroColumnetas} de ${grupoLabel(input.barrasColumneta) || "-"}` }
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
        title="Metrado de Muros de Arquitectura (Tabiquería)"
        subtitle="Muros no portantes de subdivisión, sin función estructural (NTE E.070 Art. 71)"
        icon={<Grid2x2 size={20} />}
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
                label="Longitud de muro"
                unit="m"
                value={input.longitud}
                onChange={(v) => update("longitud", v)}
              />
              <NumberField
                label="Altura libre"
                unit="m"
                value={input.alturaLibre}
                onChange={(v) => update("alturaLibre", v)}
              />
              <NumberField
                label="Espesor efectivo"
                unit="cm"
                value={input.espesor}
                onChange={(v) => update("espesor", v)}
                helper="Típico: 10 cm (pandereta) o 15 cm"
              />
              <NumberField
                label="Área de vanos"
                unit="m²"
                value={input.areaVanos}
                onChange={(v) => update("areaVanos", v)}
                helper="Puertas y ventanas, a descontar"
              />
            </div>
          </SectionCard>

          <SectionCard title="Unidad de albañilería" icon={<Package size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-4">
              <NumberField label="Largo" unit="cm" value={input.largoUnidad} onChange={(v) => update("largoUnidad", v)} />
              <NumberField label="Alto" unit="cm" value={input.alturaUnidad} onChange={(v) => update("alturaUnidad", v)} />
              <NumberField
                label="Junta de mortero"
                unit="cm"
                value={input.juntaMortero}
                onChange={(v) => update("juntaMortero", v)}
              />
              <NumberField
                label="Desperdicio"
                unit="%"
                value={input.desperdicioPct}
                onChange={(v) => update("desperdicioPct", v)}
              />
            </div>
          </SectionCard>

          <SectionCard title="Arriostres (columnetas)" icon={<ShieldCheck size={16} className="text-navy-700" />}>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={input.incluirArriostres}
                onChange={(e) => update("incluirArriostres", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
              />
              <span className="text-sm font-medium text-navy-800">
                Incluir columnetas de arriostre (paños largos o expuestos a volteo, E.070 Art. 71/81)
              </span>
            </label>

            {input.incluirArriostres && (
              <div className="mt-4 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    label="N° de columnetas"
                    unit="und"
                    step={1}
                    value={input.numeroColumnetas}
                    onChange={(v) => update("numeroColumnetas", v)}
                    helper={`Espaciamiento máx.: ${result.espaciamientoMaximoArriostresM.toFixed(2)} m`}
                  />
                  <NumberField
                    label="Peralte de columneta"
                    unit="cm"
                    value={input.peralteColumneta}
                    onChange={(v) => update("peralteColumneta", v)}
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-steel-100 pt-4">
                  <span className="text-sm font-medium text-navy-800">Acero longitudinal (mín. 4 varillas)</span>
                  {input.barrasColumneta.map((grupo, i) => (
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
                        disabled={input.barrasColumneta.length <= 1}
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

                <div className="grid grid-cols-2 gap-4 border-t border-steel-100 pt-4">
                  <SelectField
                    label="Ø de estribos"
                    value={input.diametroEstribosColumnetaId}
                    onChange={(v) => update("diametroEstribosColumnetaId", v)}
                    options={rebarOptions}
                  />
                  <NumberField
                    label="Separación de estribos"
                    unit="cm"
                    value={input.separacionEstribosColumneta}
                    onChange={(v) => update("separacionEstribosColumneta", v)}
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
              <MuroArquitecturaElevation input={input} />
            </SectionCard>

            <SectionCard title="Vista isométrica del acero (3D)" icon={<Box size={16} className="text-navy-700" />} collapsible>
              <MuroArquitecturaIsometric input={input} />
            </SectionCard>
          </div>

          <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <ResultMetric label="Área bruta" value={result.areaMuroBruta} unit="m²" />
              <ResultMetric label="Área neta (sin vanos)" value={result.areaMuroNeta} unit="m²" />
              <ResultMetric label="N° de unidades" value={result.numeroUnidades} unit="und" />
              <ResultMetric label="Volumen de mortero" value={result.volumenMortero} unit="m³" accent="navy" />
              {input.incluirArriostres && (
                <>
                  <ResultMetric label="Volumen de concreto (columnetas)" value={result.volumenConcretoColumnetas} unit="m³" accent="navy" />
                  <ResultMetric label="Área de encofrado" value={result.encofradoColumnetas} unit="m²" accent="amber" />
                  <ResultMetric label="Acero total" value={result.pesoAceroTotal} unit="kg" accent="steel" />
                  <ResultMetric label="Longitud total de fierro" value={result.longitudTotalFierro} unit="m" accent="steel" />
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Resumen" icon={<ClipboardList size={16} className="text-navy-700" />}>
            <ResultTable lines={lines} />
          </SectionCard>

          <SectionCard title="Muros registrados en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
            <ModuleElementsList module="muroArquitectura" emptyLabel="Aún no has agregado ningún muro de arquitectura. Calcula arriba y presiona 'Agregar a la lista'." />
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

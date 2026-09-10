import { useMemo, useState } from "react";
import { BrickWall, Save, Plus, Trash2, Tag, Ruler, Package, ShieldCheck, Eye, Box, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { SelectField } from "../components/ui/SelectField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { StickyViewsRow } from "../components/ui/StickyViewsRow";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { MuroAlbanileriaElevation } from "../components/diagrams/MuroAlbanileriaElevation";
import { MuroAlbanileriaIsometric } from "../components/diagrams/MuroAlbanileriaIsometric";
import { calcularMuroAlbanileria, type MuroAlbanileriaInput, type BarraGrupo } from "../lib/calc/muroAlbanileria";
import { lineasAceroPorDiametro } from "../lib/calc/aceroResumen";
import { REBAR_SIZES, getRebar } from "../lib/materials";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

const rebarOptions = REBAR_SIZES.map((r) => ({ value: r.id, label: r.label }));

function nextName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "muroAlbanileria").length;
  return `Muro de Albañilería ${count + 1}`;
}

function grupoLabel(grupos: BarraGrupo[]): string {
  return grupos
    .filter((g) => g.cantidad > 0)
    .map((g) => `${g.cantidad}Ø${getRebar(g.diametroId).diameterMm}mm`)
    .join(" + ");
}

export function MurosAlbanileriaPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextName);

  const [input, setInput] = useState<MuroAlbanileriaInput>({
    longitud: 4,
    alturaLibre: 2.6,
    espesor: 13,
    largoUnidad: 24,
    alturaUnidad: 9,
    juntaMortero: 1.5,
    desperdicioPct: 5,
    incluirConfinamiento: true,
    numeroColumnas: 2,
    peralteColumna: 25,
    barrasColumna: [{ diametroId: "8", cantidad: 4 }],
    diametroEstribosColumnaId: "6",
    separacionConfinamiento: 10,
    separacionCentral: 25,
    peralteSolera: 20,
    barrasSolera: [{ diametroId: "8", cantidad: 4 }],
    diametroEstribosSoleraId: "6",
    recubrimiento: 2,
    considerarGanchoEstribo: true,
  });

  const result = useMemo(() => calcularMuroAlbanileria(input), [input]);

  const lines: MetradoLine[] = [
    { partida: "Muro de soga con ladrillo King Kong", unidad: "m²", cantidad: result.areaMuroNeta },
    { partida: "Ladrillo King Kong para muro", unidad: "und", cantidad: result.numeroUnidades },
    { partida: "Mortero para asentado (cemento-arena 1:4)", unidad: "m³", cantidad: result.volumenMortero },
    ...(input.incluirConfinamiento
      ? [
          {
            partida: "Concreto f'c=175 kg/cm² en columnas y soleras de confinamiento",
            unidad: "m³",
            cantidad: result.volumenConcretoConfinamiento,
          },
          ...lineasAceroPorDiametro(result.desgloseAcero),
          {
            partida: "Encofrado de columnas y soleras de confinamiento",
            unidad: "m²",
            cantidad: result.encofradoConfinamiento,
          },
        ]
      : []),
  ];

  function update<K extends keyof MuroAlbanileriaInput>(key: K, value: MuroAlbanileriaInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updateGrupoColumna(index: number, patch: Partial<BarraGrupo>) {
    setInput((prev) => ({
      ...prev,
      barrasColumna: prev.barrasColumna.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    }));
    setSaved(false);
  }
  function addGrupoColumna() {
    setInput((prev) => ({ ...prev, barrasColumna: [...prev.barrasColumna, { diametroId: "8", cantidad: 2 }] }));
    setSaved(false);
  }
  function removeGrupoColumna(index: number) {
    setInput((prev) => ({ ...prev, barrasColumna: prev.barrasColumna.filter((_, i) => i !== index) }));
    setSaved(false);
  }

  function updateGrupoSolera(index: number, patch: Partial<BarraGrupo>) {
    setInput((prev) => ({
      ...prev,
      barrasSolera: prev.barrasSolera.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    }));
    setSaved(false);
  }
  function addGrupoSolera() {
    setInput((prev) => ({ ...prev, barrasSolera: [...prev.barrasSolera, { diametroId: "8", cantidad: 2 }] }));
    setSaved(false);
  }
  function removeGrupoSolera(index: number) {
    setInput((prev) => ({ ...prev, barrasSolera: prev.barrasSolera.filter((_, i) => i !== index) }));
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "muroAlbanileria",
      name: nombre || "Muro de Albañilería",
      createdAt: Date.now(),
      concreteM3: result.volumenConcretoConfinamiento,
      steelKg: result.pesoAceroTotal,
      formworkM2: result.encofradoConfinamiento,
      lines,
      steelByDiameter: result.desgloseAcero,
      inputsSummary: {
        Dimensiones: `${input.longitud} m x ${input.alturaLibre} m x ${input.espesor} cm`,
        Unidades: `${result.numeroUnidades} und`,
        ...(input.incluirConfinamiento
          ? {
              "Columnas de confinamiento": `${input.numeroColumnas} de ${grupoLabel(input.barrasColumna) || "-"}`,
              "Viga solera": grupoLabel(input.barrasSolera) || "-",
            }
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
        title="Metrado de Muros de Albañilería Confinada"
        subtitle="Muros portantes de unidades de arcilla con columnas y soleras de confinamiento (NTE E.070)"
        icon={<BrickWall size={20} />}
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
            <SectionCard title="Elevación (vista en vivo)" icon={<Eye size={16} className="text-navy-700" />}>
              <MuroAlbanileriaElevation input={input} />
            </SectionCard>

            <SectionCard title="Vista isométrica del acero (3D)" icon={<Box size={16} className="text-navy-700" />} collapsible>
              <MuroAlbanileriaIsometric input={input} />
            </SectionCard>
        </StickyViewsRow>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
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
                helper={`Mínimo sugerido: ${result.espesorMinimoCm.toFixed(1)} cm (h/20)`}
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

          <SectionCard title="Columnas y soleras de confinamiento" icon={<ShieldCheck size={16} className="text-navy-700" />}>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={input.incluirConfinamiento}
                onChange={(e) => update("incluirConfinamiento", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
              />
              <span className="text-sm font-medium text-navy-800">
                Incluir elementos de confinamiento (obligatorio para muros portantes, E.060 Art. 22)
              </span>
            </label>

            {input.incluirConfinamiento && (
              <div className="mt-4 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    label="N° de columnas (Nc)"
                    unit="und"
                    step={1}
                    value={input.numeroColumnas}
                    onChange={(v) => update("numeroColumnas", v)}
                    helper={`Espaciamiento máx.: ${result.espaciamientoMaximoColumnasM.toFixed(2)} m`}
                  />
                  <NumberField
                    label="Peralte de columna"
                    unit="cm"
                    value={input.peralteColumna}
                    onChange={(v) => update("peralteColumna", v)}
                    helper="Mínimo 25 cm"
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-steel-100 pt-4">
                  <span className="text-sm font-medium text-navy-800">Acero longitudinal de columna (mín. 4 varillas)</span>
                  {input.barrasColumna.map((grupo, i) => (
                    <div key={i} className="flex items-end gap-2">
                      <div className="w-28">
                        <NumberField
                          label={i === 0 ? "Cantidad" : ""}
                          unit="und"
                          step={1}
                          value={grupo.cantidad}
                          onChange={(v) => updateGrupoColumna(i, { cantidad: v })}
                        />
                      </div>
                      <div className="flex-1">
                        <SelectField
                          label={i === 0 ? "Diámetro" : ""}
                          value={grupo.diametroId}
                          onChange={(v) => updateGrupoColumna(i, { diametroId: v })}
                          options={rebarOptions}
                        />
                      </div>
                      <button
                        onClick={() => removeGrupoColumna(i)}
                        disabled={input.barrasColumna.length <= 1}
                        aria-label="Quitar grupo"
                        className="mb-0.5 rounded p-2 text-steel-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addGrupoColumna}
                    className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-steel-300 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-steel-50"
                  >
                    <Plus size={14} />
                    Agregar grupo
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-steel-100 pt-4">
                  <SelectField
                    label="Ø de estribos"
                    value={input.diametroEstribosColumnaId}
                    onChange={(v) => update("diametroEstribosColumnaId", v)}
                    options={rebarOptions}
                  />
                  <NumberField
                    label="Recubrimiento"
                    unit="cm"
                    value={input.recubrimiento}
                    onChange={(v) => update("recubrimiento", v)}
                  />
                  <NumberField
                    label="Separación en extremos"
                    unit="cm"
                    value={input.separacionConfinamiento}
                    onChange={(v) => update("separacionConfinamiento", v)}
                    helper="4 estribos por extremo, máx. 10 cm"
                  />
                  <NumberField
                    label="Separación zona central"
                    unit="cm"
                    value={input.separacionCentral}
                    onChange={(v) => update("separacionCentral", v)}
                    helper="Máx. 25 cm"
                  />
                </div>

                <div className="border-t border-steel-100 pt-4">
                  <NumberField
                    label="Peralte de viga solera"
                    unit="cm"
                    value={input.peralteSolera}
                    onChange={(v) => update("peralteSolera", v)}
                    helper="Mínimo: espesor de la losa de techo"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <span className="text-sm font-medium text-navy-800">Acero longitudinal de solera (mín. 4 varillas)</span>
                  {input.barrasSolera.map((grupo, i) => (
                    <div key={i} className="flex items-end gap-2">
                      <div className="w-28">
                        <NumberField
                          label={i === 0 ? "Cantidad" : ""}
                          unit="und"
                          step={1}
                          value={grupo.cantidad}
                          onChange={(v) => updateGrupoSolera(i, { cantidad: v })}
                        />
                      </div>
                      <div className="flex-1">
                        <SelectField
                          label={i === 0 ? "Diámetro" : ""}
                          value={grupo.diametroId}
                          onChange={(v) => updateGrupoSolera(i, { diametroId: v })}
                          options={rebarOptions}
                        />
                      </div>
                      <button
                        onClick={() => removeGrupoSolera(i)}
                        disabled={input.barrasSolera.length <= 1}
                        aria-label="Quitar grupo"
                        className="mb-0.5 rounded p-2 text-steel-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addGrupoSolera}
                    className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-steel-300 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-steel-50"
                  >
                    <Plus size={14} />
                    Agregar grupo
                  </button>
                </div>

                <SelectField
                  label="Ø de estribos de solera"
                  value={input.diametroEstribosSoleraId}
                  onChange={(v) => update("diametroEstribosSoleraId", v)}
                  options={rebarOptions}
                />

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={input.considerarGanchoEstribo}
                    onChange={(e) => update("considerarGanchoEstribo", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
                  />
                  <span className="text-xs font-medium text-navy-800">
                    Gancho a 135° en estribos de columnas y soleras (según Ø)
                  </span>
                </label>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <WarningsBox warnings={result.warnings} />


          <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <ResultMetric label="Área bruta de muro" value={result.areaMuroBruta} unit="m²" />
              <ResultMetric label="Área neta (sin columnas)" value={result.areaMuroNeta} unit="m²" />
              <ResultMetric label="N° de unidades" value={result.numeroUnidades} unit="und" />
              <ResultMetric label="Volumen de mortero" value={result.volumenMortero} unit="m³" accent="navy" />
              {input.incluirConfinamiento && (
                <>
                  <ResultMetric label="Volumen de concreto (confinamiento)" value={result.volumenConcretoConfinamiento} unit="m³" accent="navy" />
                  <ResultMetric label="Área de encofrado" value={result.encofradoConfinamiento} unit="m²" accent="amber" />
                  <ResultMetric label="Peso acero columnas" value={result.pesoAceroColumnas} unit="kg" accent="steel" />
                  <ResultMetric label="Peso acero soleras" value={result.pesoAceroSoleras} unit="kg" accent="steel" />
                  <ResultMetric label="Peso estribos columnas" value={result.pesoEstribosColumnas} unit="kg" accent="steel" />
                  <ResultMetric label="Peso estribos soleras" value={result.pesoEstribosSoleras} unit="kg" accent="steel" />
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
            <ModuleElementsList module="muroAlbanileria" emptyLabel="Aún no has agregado ningún muro de albañilería. Calcula arriba y presiona 'Agregar a la lista'." />
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

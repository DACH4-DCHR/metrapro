import { useMemo, useState } from "react";
import { RectangleHorizontal, Save, Plus, Trash2, Tag, Ruler, Grid3x3, Eye, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { SelectField } from "../components/ui/SelectField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { VigaCrossSection } from "../components/diagrams/VigaCrossSection";
import { VigaElevation } from "../components/diagrams/VigaElevation";
import {
  calcularViga,
  sugerirConfinamiento,
  type VigaInput,
  type TipoSeccionViga,
  type SistemaSismorresistente,
  type BarraGrupo,
} from "../lib/calc/viga";
import { lineasAceroPorDiametro } from "../lib/calc/aceroResumen";
import { REBAR_SIZES, getRebar } from "../lib/materials";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

const rebarOptions = REBAR_SIZES.map((r) => ({ value: r.id, label: r.label }));
const tipoSeccionOptions: { value: TipoSeccionViga; label: string }[] = [
  { value: "rectangular", label: "Rectangular" },
  { value: "T", label: "T invertida" },
  { value: "personalizada", label: "Personalizada" },
];
const sistemaSismorresistenteOptions: { value: SistemaSismorresistente; label: string }[] = [
  { value: "muros", label: "Muros estructurales (E.060 Art. 21.4.4)" },
  { value: "porticos_dual", label: "Pórticos / sistema dual (E.060 Art. 21.5.3)" },
];

function nextVigaName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "viga").length;
  return `Grupo de Vigas ${count + 1}`;
}

function minDiametroMm(grupos: BarraGrupo[]): number {
  const dbs = grupos.filter((g) => g.cantidad > 0).map((g) => getRebar(g.diametroId).diameterMm);
  return dbs.length > 0 ? Math.min(...dbs) : 16;
}

function grupoLabel(grupos: BarraGrupo[]): string {
  return grupos
    .filter((g) => g.cantidad > 0)
    .map((g) => `${g.cantidad}Ø${getRebar(g.diametroId).diameterMm}mm`)
    .join(" + ");
}

export function VigasPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextVigaName);

  const [input, setInput] = useState<VigaInput>({
    numeroVigas: 4,
    longitud: 6,
    base: 25,
    altura: 40,
    tipoSeccion: "rectangular",
    alaAncho: 60,
    alaEspesor: 20,
    areaSeccionPersonalizada: 0.1,
    perimetroEncofradoPersonalizado: 1.2,
    barrasLongitudinales: [{ diametroId: "16", cantidad: 4 }],
    diametroEstribosId: "8",
    separacionEstribos: 20,
    recubrimiento: 4,
    incluirConfinamiento: false,
    sistemaSismorresistente: "muros",
    longitudConfinamiento: 0,
    separacionConfinamiento: 0,
    incluirAceroPiel: false,
    pielDiametroId: "8",
    pielNumeroBarras: 2,
    considerarGanchoEstribo: true,
    considerarGanchoLongitudinal: false,
    extremosConGancho: 2,
  });

  const result = useMemo(() => calcularViga(input), [input]);

  const lines: MetradoLine[] = [
    { partida: "Concreto f'c=210 kg/cm² en vigas", unidad: "m³", cantidad: result.volumenConcreto },
    ...lineasAceroPorDiametro(result.desgloseAcero),
    { partida: "Encofrado y desencofrado de vigas", unidad: "m²", cantidad: result.areaEncofrado },
  ];

  function update<K extends keyof VigaInput>(key: K, value: VigaInput[K]) {
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

  function calcularSugerencia(sistema: SistemaSismorresistente, base: VigaInput) {
    return sugerirConfinamiento(
      sistema,
      base.altura,
      base.recubrimiento,
      minDiametroMm(base.barrasLongitudinales),
      getRebar(base.diametroEstribosId).diameterMm
    );
  }

  function handleToggleConfinamiento(checked: boolean) {
    setInput((prev) => {
      if (!checked) return { ...prev, incluirConfinamiento: false };
      const sugerido = calcularSugerencia(prev.sistemaSismorresistente, prev);
      return {
        ...prev,
        incluirConfinamiento: true,
        longitudConfinamiento: sugerido.longitudConfinamientoCm,
        separacionConfinamiento: sugerido.separacionConfinamientoCm,
      };
    });
    setSaved(false);
  }

  function handleSistemaChange(sistema: SistemaSismorresistente) {
    setInput((prev) => {
      const sugerido = calcularSugerencia(sistema, prev);
      return {
        ...prev,
        sistemaSismorresistente: sistema,
        longitudConfinamiento: sugerido.longitudConfinamientoCm,
        separacionConfinamiento: sugerido.separacionConfinamientoCm,
      };
    });
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "viga",
      name: nombre || "Vigas",
      createdAt: Date.now(),
      concreteM3: result.volumenConcreto,
      steelKg: result.pesoAceroTotal,
      formworkM2: result.areaEncofrado,
      lines,
      steelByDiameter: result.desgloseAcero,
      inputsSummary: {
        Cantidad: `${input.numeroVigas} vigas`,
        Sección: `${input.base} x ${input.altura} cm`,
        Longitud: `${input.longitud} m`,
        "Acero longitudinal": grupoLabel(input.barrasLongitudinales) || "-",
        ...(input.incluirAceroPiel ? { "Acero de piel": `${input.pielNumeroBarras}Ø${getRebar(input.pielDiametroId).diameterMm}mm` } : {}),
      },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextVigaName());
  }

  return (
    <div>
      <PageHeader
        title="Metrado de Vigas de Concreto Armado"
        subtitle="Vigas rectangulares, T invertida o sección personalizada"
        icon={<RectangleHorizontal size={20} />}
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
                label="N° de vigas"
                unit="und"
                step={1}
                value={input.numeroVigas}
                onChange={(v) => update("numeroVigas", v)}
              />
              <NumberField
                label="Longitud de viga"
                unit="m"
                value={input.longitud}
                onChange={(v) => update("longitud", v)}
              />
              <NumberField label="Base" unit="cm" value={input.base} onChange={(v) => update("base", v)} />
              <NumberField label="Altura" unit="cm" value={input.altura} onChange={(v) => update("altura", v)} />
              <div className="col-span-2">
                <SelectField
                  label="Tipo de sección"
                  value={input.tipoSeccion}
                  onChange={(v) => update("tipoSeccion", v as TipoSeccionViga)}
                  options={tipoSeccionOptions}
                />
              </div>
              {input.tipoSeccion === "T" && (
                <>
                  <NumberField
                    label="Ancho de ala"
                    unit="cm"
                    value={input.alaAncho ?? 0}
                    onChange={(v) => update("alaAncho", v)}
                  />
                  <NumberField
                    label="Espesor de ala"
                    unit="cm"
                    value={input.alaEspesor ?? 0}
                    onChange={(v) => update("alaEspesor", v)}
                  />
                </>
              )}
              {input.tipoSeccion === "personalizada" && (
                <>
                  <NumberField
                    label="Área de sección"
                    unit="m²"
                    value={input.areaSeccionPersonalizada ?? 0}
                    onChange={(v) => update("areaSeccionPersonalizada", v)}
                  />
                  <NumberField
                    label="Perímetro encofrado"
                    unit="m"
                    value={input.perimetroEncofradoPersonalizado ?? 0}
                    onChange={(v) => update("perimetroEncofradoPersonalizado", v)}
                  />
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Acero de refuerzo" icon={<Grid3x3 size={16} className="text-navy-700" />}>
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium text-navy-800">
                Barras longitudinales (varios grupos, para diámetro variable / bastones)
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
                Agregar grupo (ej. bastón / refuerzo adicional)
              </button>

              <label className="mt-1 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={input.considerarGanchoLongitudinal}
                  onChange={(e) => update("considerarGanchoLongitudinal", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
                />
                <span className="text-sm font-medium text-navy-800">
                  Considerar gancho estándar en extremos discontinuos (+12·db por extremo, típico en apoyos simples)
                </span>
              </label>
              {input.considerarGanchoLongitudinal && (
                <div className="w-40">
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

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-steel-100 pt-4">
              <SelectField
                label="Ø de estribos"
                value={input.diametroEstribosId}
                onChange={(v) => update("diametroEstribosId", v)}
                options={rebarOptions}
              />
              <NumberField
                label={input.incluirConfinamiento ? "Separación en zona central" : "Separación de estribos"}
                unit="cm"
                value={input.separacionEstribos}
                onChange={(v) => update("separacionEstribos", v)}
              />
              <NumberField
                label="Recubrimiento"
                unit="cm"
                value={input.recubrimiento}
                onChange={(v) => update("recubrimiento", v)}
              />
              <div className="flex items-end pb-1.5">
                <label className="flex items-start gap-2">
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

            <div className="mt-4 border-t border-steel-100 pt-4">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={input.incluirConfinamiento}
                  onChange={(e) => handleToggleConfinamiento(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
                />
                <span className="text-sm font-medium text-navy-800">
                  Incluir estribos de confinamiento (viga sismorresistente, NTE E.060)
                </span>
              </label>

              {input.incluirConfinamiento && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <SelectField
                      label="Sistema sismorresistente"
                      value={input.sistemaSismorresistente}
                      onChange={(v) => handleSistemaChange(v as SistemaSismorresistente)}
                      options={sistemaSismorresistenteOptions}
                    />
                  </div>
                  <NumberField
                    label="Longitud de confinamiento (Lo)"
                    unit="cm"
                    value={input.longitudConfinamiento}
                    onChange={(v) => update("longitudConfinamiento", v)}
                    helper="Sugerido: 2×h, por extremo"
                  />
                  <NumberField
                    label="Separación en zona confinada (S1)"
                    unit="cm"
                    value={input.separacionConfinamiento}
                    onChange={(v) => update("separacionConfinamiento", v)}
                    helper="Sugerido según norma, verifica tu diseño"
                  />
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-steel-100 pt-4">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={input.incluirAceroPiel}
                  onChange={(e) => update("incluirAceroPiel", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
                />
                <span className="text-sm font-medium text-navy-800">
                  Incluir acero de piel (vigas de gran peralte)
                </span>
              </label>

              {input.incluirAceroPiel && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <NumberField
                    label="N° de barras de piel"
                    unit="und"
                    step={1}
                    value={input.pielNumeroBarras}
                    onChange={(v) => update("pielNumeroBarras", v)}
                    helper="Total, ambas caras del alma"
                  />
                  <SelectField
                    label="Ø de barra de piel"
                    value={input.pielDiametroId}
                    onChange={(v) => update("pielDiametroId", v)}
                    options={rebarOptions}
                  />
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <WarningsBox warnings={result.warnings} />

          <SectionCard title="Sección transversal (vista en vivo)" icon={<Eye size={16} className="text-navy-700" />}>
            <VigaCrossSection input={input} />
          </SectionCard>

          <SectionCard title="Distribución de estribos en elevación" icon={<Eye size={16} className="text-navy-700" />}>
            <VigaElevation input={input} />
          </SectionCard>

          <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <ResultMetric label="Área de sección" value={result.areaSeccion} unit="m²" />
              <ResultMetric label="Volumen de concreto" value={result.volumenConcreto} unit="m³" accent="navy" />
              <ResultMetric label="Área de encofrado" value={result.areaEncofrado} unit="m²" accent="amber" />
              <ResultMetric label="N° barras longitudinales" value={result.numeroBarrasLongitudinales} unit="und" />
              <ResultMetric label="Peso acero longitudinal" value={result.pesoAceroLongitudinal} unit="kg" accent="steel" />
              {input.incluirConfinamiento ? (
                <>
                  <ResultMetric
                    label="Estribos confinamiento (x viga)"
                    value={result.numeroEstribosConfinamientoPorExtremo * 2}
                    unit="und"
                  />
                  <ResultMetric label="Estribos zona central (x viga)" value={result.numeroEstribosCentralPorViga} unit="und" />
                </>
              ) : null}
              <ResultMetric label="N° de estribos (total)" value={result.numeroEstribosTotal} unit="und" />
              <ResultMetric label="Peso de estribos" value={result.pesoEstribos} unit="kg" accent="steel" />
              {input.incluirAceroPiel && <ResultMetric label="Peso acero de piel" value={result.pesoAceroPiel} unit="kg" accent="steel" />}
              <ResultMetric label="Acero total" value={result.pesoAceroTotal} unit="kg" accent="steel" />
              <ResultMetric label="Longitud total de fierro" value={result.longitudTotalFierro} unit="m" accent="steel" />
            </div>
          </SectionCard>

          <SectionCard title="Resumen" icon={<ClipboardList size={16} className="text-navy-700" />}>
            <ResultTable lines={lines} />
          </SectionCard>

          <SectionCard title="Grupos de vigas registrados en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
            <ModuleElementsList module="viga" emptyLabel="Aún no has agregado ningún grupo de vigas. Calcula arriba y presiona 'Agregar a la lista'." />
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

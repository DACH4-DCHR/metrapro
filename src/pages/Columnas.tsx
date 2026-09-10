import { useMemo, useState } from "react";
import { RectangleVertical, Save, Plus, Trash2, Tag, Ruler, Grid3x3, Eye, Box, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { SelectField } from "../components/ui/SelectField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { StickyViewsRow } from "../components/ui/StickyViewsRow";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { ColumnaCrossSection } from "../components/diagrams/ColumnaCrossSection";
import { ColumnaIsometric } from "../components/diagrams/ColumnaIsometric";
import {
  calcularColumna,
  sugerirConfinamientoColumna,
  minDiametroLongitudinalMm,
  type ColumnaInput,
  type TipoSeccionColumna,
  type SistemaSismorresistenteColumna,
  type CaraColumna,
  type TipoEstriboSuplementario,
  type BarraGrupo,
  type EstriboSuplementario,
} from "../lib/calc/columna";
import { lineasAceroPorDiametro } from "../lib/calc/aceroResumen";
import { REBAR_SIZES, getRebar } from "../lib/materials";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

const rebarOptions = REBAR_SIZES.map((r) => ({ value: r.id, label: r.label }));
const tipoSeccionOptions: { value: TipoSeccionColumna; label: string }[] = [
  { value: "rectangular", label: "Rectangular / cuadrada" },
  { value: "circular", label: "Circular" },
];
const sistemaSismorresistenteOptions: { value: SistemaSismorresistenteColumna; label: string }[] = [
  { value: "muros", label: "Muros estructurales (E.060 Art. 21.4.5)" },
  { value: "porticos_dual", label: "Pórticos / sistema dual (E.060 Art. 21.6.4)" },
];
const caraOptions: { value: CaraColumna; label: string }[] = [
  { value: "peralte", label: "Caras de peralte" },
  { value: "base", label: "Caras de base" },
];
const tipoSuplementarioOptions: { value: TipoEstriboSuplementario; label: string }[] = [
  { value: "grapa", label: "Grapa (rama con gancho 90°/135°)" },
  { value: "cerrado", label: "Estribo cerrado (gancho 135° en ambos extremos)" },
];

const numberFormatter = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 });

function nextName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "columna").length;
  return `Grupo de Columnas ${count + 1}`;
}

function grupoLabelSimple(grupos: BarraGrupo[]): string {
  return grupos
    .filter((g) => g.cantidad > 0)
    .map((g) => `${g.cantidad}Ø${getRebar(g.diametroId).diameterMm}mm`)
    .join(" + ");
}

function resumenAceroLongitudinal(input: ColumnaInput): string {
  if (input.tipoSeccion === "circular") {
    return grupoLabelSimple(input.barrasLongitudinalesCirculares) || "-";
  }
  const partes = [`4Ø${getRebar(input.diametroEsquinaId).diameterMm}mm esq.`];
  input.barrasCarasPeralteGrupos
    .filter((g) => g.cantidad > 0)
    .forEach((g) => partes.push(`${g.cantidad}Ø${getRebar(g.diametroId).diameterMm}mm c/cara peralte`));
  input.barrasCarasBaseGrupos
    .filter((g) => g.cantidad > 0)
    .forEach((g) => partes.push(`${g.cantidad}Ø${getRebar(g.diametroId).diameterMm}mm c/cara base`));
  return partes.join(" + ");
}

export function ColumnasPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextName);

  const [input, setInput] = useState<ColumnaInput>({
    numeroColumnas: 4,
    alturaLibre: 2.6,
    tipoSeccion: "rectangular",
    base: 30,
    peralte: 30,
    diametro: 35,
    diametroEsquinaId: "16",
    barrasCarasPeralteGrupos: [{ diametroId: "16", cantidad: 1 }],
    barrasCarasBaseGrupos: [],
    barrasLongitudinalesCirculares: [{ diametroId: "16", cantidad: 6 }],
    diametroEstribosId: "8",
    estribosSuplementarios: [],
    recubrimiento: 4,
    sistemaSismorresistente: "muros",
    incluirConfinamiento: true,
    longitudConfinamiento: 50,
    separacionConfinamiento: 10,
    separacionCentral: 25,
    considerarGanchoEstribo: true,
  });

  const result = useMemo(() => calcularColumna(input), [input]);

  const lines: MetradoLine[] = [
    { partida: "Concreto f'c=210 kg/cm² en columnas", unidad: "m³", cantidad: result.volumenConcreto },
    ...lineasAceroPorDiametro(result.desgloseAcero),
    { partida: "Encofrado y desencofrado de columnas", unidad: "m²", cantidad: result.areaEncofrado },
  ];

  function update<K extends keyof ColumnaInput>(key: K, value: ColumnaInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function makeGrupoHandlers(key: "barrasCarasPeralteGrupos" | "barrasCarasBaseGrupos" | "barrasLongitudinalesCirculares") {
    return {
      update: (index: number, patch: Partial<BarraGrupo>) => {
        setInput((prev) => ({
          ...prev,
          [key]: prev[key].map((g, i) => (i === index ? { ...g, ...patch } : g)),
        }));
        setSaved(false);
      },
      add: () => {
        setInput((prev) => ({ ...prev, [key]: [...prev[key], { diametroId: "12", cantidad: 1 }] }));
        setSaved(false);
      },
      remove: (index: number) => {
        setInput((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
        setSaved(false);
      },
    };
  }

  const peralteHandlers = makeGrupoHandlers("barrasCarasPeralteGrupos");
  const baseHandlers = makeGrupoHandlers("barrasCarasBaseGrupos");
  const circularHandlers = makeGrupoHandlers("barrasLongitudinalesCirculares");

  function updateEstriboSuplementario(index: number, patch: Partial<EstriboSuplementario>) {
    setInput((prev) => ({
      ...prev,
      estribosSuplementarios: prev.estribosSuplementarios.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
    setSaved(false);
  }

  function addEstriboSuplementario() {
    setInput((prev) => ({
      ...prev,
      estribosSuplementarios: [
        ...prev.estribosSuplementarios,
        { diametroId: prev.diametroEstribosId, numeroRamas: 1, cara: "peralte", tipo: "grapa", numeroBarrasEncerradas: 99 },
      ],
    }));
    setSaved(false);
  }

  function removeEstriboSuplementario(index: number) {
    setInput((prev) => ({
      ...prev,
      estribosSuplementarios: prev.estribosSuplementarios.filter((_, i) => i !== index),
    }));
    setSaved(false);
  }

  function calcularSugerencia(sistema: SistemaSismorresistenteColumna, base: ColumnaInput) {
    const mayorDim = base.tipoSeccion === "rectangular" ? Math.max(base.base, base.peralte) : base.diametro;
    const menorDim = base.tipoSeccion === "rectangular" ? Math.min(base.base, base.peralte) : base.diametro;
    return sugerirConfinamientoColumna(sistema, mayorDim, menorDim, base.alturaLibre, minDiametroLongitudinalMm(base));
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
        separacionCentral: sugerido.separacionCentralCm,
      };
    });
    setSaved(false);
  }

  function handleSistemaChange(sistema: SistemaSismorresistenteColumna) {
    setInput((prev) => {
      const sugerido = calcularSugerencia(sistema, prev);
      return {
        ...prev,
        sistemaSismorresistente: sistema,
        longitudConfinamiento: sugerido.longitudConfinamientoCm,
        separacionConfinamiento: sugerido.separacionConfinamientoCm,
        separacionCentral: sugerido.separacionCentralCm,
      };
    });
    setSaved(false);
  }

  function handleSave() {
    const seccionLabel =
      input.tipoSeccion === "rectangular" ? `${input.base} x ${input.peralte} cm` : `Ø${input.diametro} cm`;
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "columna",
      name: nombre || "Columnas",
      createdAt: Date.now(),
      concreteM3: result.volumenConcreto,
      steelKg: result.pesoAceroTotal,
      formworkM2: result.areaEncofrado,
      lines,
      steelByDiameter: result.desgloseAcero,
      inputsSummary: {
        Cantidad: `${input.numeroColumnas} columnas`,
        Sección: seccionLabel,
        "Altura libre": `${input.alturaLibre} m`,
        "Acero longitudinal": resumenAceroLongitudinal(input),
        "Cuantía": `${result.cuantiaPct.toFixed(2)}%`,
        ...(input.estribosSuplementarios.length > 0
          ? {
              "Estribos suplementarios": input.estribosSuplementarios
                .map((s) =>
                  s.tipo === "cerrado"
                    ? `${s.numeroRamas} cerrado(s) Ø${getRebar(s.diametroId).diameterMm}mm (encierra ${s.numeroBarrasEncerradas} barras centrales)`
                    : `${s.numeroRamas} grapa(s) Ø${getRebar(s.diametroId).diameterMm}mm (cara ${s.cara})`
                )
                .join(" + "),
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
        title="Metrado de Columnas de Concreto Armado"
        subtitle="Columnas rectangulares o circulares con confinamiento sismorresistente (NTE E.060 Cap. 21)"
        icon={<RectangleVertical size={20} />}
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
          <SectionCard title="Sección transversal (vista en vivo)" icon={<Eye size={16} className="text-navy-700" />}>
            <ColumnaCrossSection input={input} />
          </SectionCard>

          <SectionCard title="Vista isométrica del acero (3D)" icon={<Box size={16} className="text-navy-700" />} collapsible>
            <ColumnaIsometric input={input} />
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
                label="N° de columnas"
                unit="und"
                step={1}
                value={input.numeroColumnas}
                onChange={(v) => update("numeroColumnas", v)}
              />
              <NumberField
                label="Altura libre de entrepiso"
                unit="m"
                value={input.alturaLibre}
                onChange={(v) => update("alturaLibre", v)}
              />
              <div className="col-span-2">
                <SelectField
                  label="Tipo de sección"
                  value={input.tipoSeccion}
                  onChange={(v) => update("tipoSeccion", v as TipoSeccionColumna)}
                  options={tipoSeccionOptions}
                />
              </div>
              {input.tipoSeccion === "rectangular" ? (
                <>
                  <NumberField label="Base" unit="cm" value={input.base} onChange={(v) => update("base", v)} />
                  <NumberField label="Peralte" unit="cm" value={input.peralte} onChange={(v) => update("peralte", v)} />
                </>
              ) : (
                <NumberField
                  label="Diámetro"
                  unit="cm"
                  value={input.diametro}
                  onChange={(v) => update("diametro", v)}
                />
              )}
            </div>
          </SectionCard>

          <SectionCard title="Acero de refuerzo" icon={<Grid3x3 size={16} className="text-navy-700" />}>
            {input.tipoSeccion === "circular" ? (
              <div className="flex flex-col gap-3">
                <span className="text-sm font-medium text-navy-800">
                  Barras longitudinales (distribuidas en el perímetro)
                </span>
                {input.barrasLongitudinalesCirculares.map((grupo, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="w-28">
                      <NumberField
                        label={i === 0 ? "Cantidad" : ""}
                        unit="und"
                        step={1}
                        value={grupo.cantidad}
                        onChange={(v) => circularHandlers.update(i, { cantidad: v })}
                      />
                    </div>
                    <div className="flex-1">
                      <SelectField
                        label={i === 0 ? "Diámetro" : ""}
                        value={grupo.diametroId}
                        onChange={(v) => circularHandlers.update(i, { diametroId: v })}
                        options={rebarOptions}
                      />
                    </div>
                    <button
                      onClick={() => circularHandlers.remove(i)}
                      disabled={input.barrasLongitudinalesCirculares.length <= 1}
                      aria-label="Quitar grupo"
                      className="mb-0.5 rounded p-2 text-steel-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={circularHandlers.add}
                  className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-steel-300 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-steel-50"
                >
                  <Plus size={14} />
                  Agregar grupo
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <SelectField
                    label="Barra de esquina (siempre 4, una por esquina)"
                    value={input.diametroEsquinaId}
                    onChange={(v) => update("diametroEsquinaId", v)}
                    options={rebarOptions}
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-steel-100 pt-4">
                  <span className="text-sm font-medium text-navy-800">
                    Barras adicionales en caras de peralte (cantidad por cada cara)
                  </span>
                  {input.barrasCarasPeralteGrupos.map((grupo, i) => (
                    <div key={i} className="flex items-end gap-2">
                      <div className="w-28">
                        <NumberField
                          label={i === 0 ? "Cantidad/cara" : ""}
                          unit="und"
                          step={1}
                          min={0}
                          value={grupo.cantidad}
                          onChange={(v) => peralteHandlers.update(i, { cantidad: v })}
                        />
                      </div>
                      <div className="flex-1">
                        <SelectField
                          label={i === 0 ? "Diámetro" : ""}
                          value={grupo.diametroId}
                          onChange={(v) => peralteHandlers.update(i, { diametroId: v })}
                          options={rebarOptions}
                        />
                      </div>
                      <button
                        onClick={() => peralteHandlers.remove(i)}
                        aria-label="Quitar grupo"
                        className="mb-0.5 rounded p-2 text-steel-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={peralteHandlers.add}
                    className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-steel-300 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-steel-50"
                  >
                    <Plus size={14} />
                    Agregar grupo (cara de peralte)
                  </button>
                </div>

                <div className="flex flex-col gap-3 border-t border-steel-100 pt-4">
                  <span className="text-sm font-medium text-navy-800">
                    Barras adicionales en caras de base (cantidad por cada cara)
                  </span>
                  {input.barrasCarasBaseGrupos.map((grupo, i) => (
                    <div key={i} className="flex items-end gap-2">
                      <div className="w-28">
                        <NumberField
                          label={i === 0 ? "Cantidad/cara" : ""}
                          unit="und"
                          step={1}
                          min={0}
                          value={grupo.cantidad}
                          onChange={(v) => baseHandlers.update(i, { cantidad: v })}
                        />
                      </div>
                      <div className="flex-1">
                        <SelectField
                          label={i === 0 ? "Diámetro" : ""}
                          value={grupo.diametroId}
                          onChange={(v) => baseHandlers.update(i, { diametroId: v })}
                          options={rebarOptions}
                        />
                      </div>
                      <button
                        onClick={() => baseHandlers.remove(i)}
                        aria-label="Quitar grupo"
                        className="mb-0.5 rounded p-2 text-steel-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={baseHandlers.add}
                    className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-steel-300 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-steel-50"
                  >
                    <Plus size={14} />
                    Agregar grupo (cara de base)
                  </button>
                </div>
              </div>
            )}
            <p className="mt-3 text-xs text-steel-500">
              Cuantía: {numberFormatter.format(result.cuantiaPct)}% (mín. 1%, máx. 6% — E.060 Art. 21.6.3.1 /
              21.4.5.2)
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-steel-100 pt-4">
              <SelectField
                label="Ø de estribos"
                value={input.diametroEstribosId}
                onChange={(v) => update("diametroEstribosId", v)}
                options={rebarOptions}
              />
              <NumberField
                label={input.incluirConfinamiento ? "Separación fuera de Lo" : "Separación de estribos"}
                unit="cm"
                value={input.separacionCentral}
                onChange={(v) => update("separacionCentral", v)}
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

            {input.tipoSeccion === "rectangular" && (
              <div className="mt-4 flex flex-col gap-3 border-t border-steel-100 pt-4">
                <span className="text-sm font-medium text-navy-800">
                  Estribos suplementarios (grapas/ganchos para barras intermedias, columnas grandes)
                </span>
                {input.estribosSuplementarios.map((s, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-md border border-steel-100 p-2">
                    <div className="flex items-end gap-2">
                      <div className="w-20">
                        <NumberField
                          label={s.tipo === "cerrado" ? "N° estribos" : "N° ramas"}
                          unit="und"
                          step={1}
                          min={1}
                          value={s.numeroRamas}
                          onChange={(v) => updateEstriboSuplementario(i, { numeroRamas: v })}
                        />
                      </div>
                      <div className="flex-1">
                        <SelectField
                          label="Diámetro"
                          value={s.diametroId}
                          onChange={(v) => updateEstriboSuplementario(i, { diametroId: v })}
                          options={rebarOptions}
                        />
                      </div>
                      <button
                        onClick={() => removeEstriboSuplementario(i)}
                        aria-label="Quitar estribo suplementario"
                        className="mb-0.5 rounded p-2 text-steel-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <SelectField
                      label="Tipo"
                      value={s.tipo}
                      onChange={(v) => updateEstriboSuplementario(i, { tipo: v as TipoEstriboSuplementario })}
                      options={tipoSuplementarioOptions}
                    />
                    {s.tipo === "grapa" ? (
                      <SelectField
                        label="Arriostra a la barra intermedia de..."
                        value={s.cara}
                        onChange={(v) => updateEstriboSuplementario(i, { cara: v as CaraColumna })}
                        options={caraOptions}
                      />
                    ) : (
                      <NumberField
                        label="N° de barras a encerrar (desde el centro)"
                        unit="und"
                        step={1}
                        min={2}
                        value={s.numeroBarrasEncerradas}
                        onChange={(v) => updateEstriboSuplementario(i, { numeroBarrasEncerradas: v })}
                        helper="Ej: si hay 4 barras intermedias en una cara, pon 2 para un estribo interior más chico, o 4 (o más) para que las encierre todas"
                      />
                    )}
                  </div>
                ))}
                {input.estribosSuplementarios.length < 2 && (
                  <button
                    onClick={addEstriboSuplementario}
                    className="flex w-fit items-center gap-1.5 rounded-md border border-dashed border-steel-300 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-steel-50"
                  >
                    <Plus size={14} />
                    Agregar estribo suplementario
                  </button>
                )}
              </div>
            )}

            <div className="mt-4 border-t border-steel-100 pt-4">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={input.incluirConfinamiento}
                  onChange={(e) => handleToggleConfinamiento(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
                />
                <span className="text-sm font-medium text-navy-800">
                  Incluir estribos de confinamiento (columna sismorresistente, NTE E.060 Cap. 21)
                </span>
              </label>

              {input.incluirConfinamiento && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <SelectField
                      label="Sistema sismorresistente"
                      value={input.sistemaSismorresistente}
                      onChange={(v) => handleSistemaChange(v as SistemaSismorresistenteColumna)}
                      options={sistemaSismorresistenteOptions}
                    />
                  </div>
                  <NumberField
                    label="Longitud de confinamiento (Lo)"
                    unit="cm"
                    value={input.longitudConfinamiento}
                    onChange={(v) => update("longitudConfinamiento", v)}
                    helper="Por extremo, desde la cara del nudo"
                  />
                  <NumberField
                    label="Separación en zona confinada (So)"
                    unit="cm"
                    value={input.separacionConfinamiento}
                    onChange={(v) => update("separacionConfinamiento", v)}
                    helper="Sugerido según norma, verifica tu diseño"
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
              <ResultMetric label="Área de sección" value={result.areaSeccion} unit="m²" />
              <ResultMetric label="Volumen de concreto" value={result.volumenConcreto} unit="m³" accent="navy" />
              <ResultMetric label="Área de encofrado" value={result.areaEncofrado} unit="m²" accent="amber" />
              <ResultMetric label="N° barras longitudinales" value={result.numeroBarrasLongitudinales} unit="und" />
              <ResultMetric label="Peso acero longitudinal" value={result.pesoAceroLongitudinal} unit="kg" accent="steel" />
              {input.incluirConfinamiento ? (
                <>
                  <ResultMetric
                    label="Estribos confinamiento (x columna)"
                    value={result.numeroEstribosConfinamientoPorExtremo * 2}
                    unit="und"
                  />
                  <ResultMetric label="Estribos zona central (x columna)" value={result.numeroEstribosCentralPorColumna} unit="und" />
                </>
              ) : null}
              <ResultMetric label="N° de estribos (total)" value={result.numeroEstribosTotal} unit="und" />
              <ResultMetric label="Peso de estribos" value={result.pesoEstribos} unit="kg" accent="steel" />
              {result.pesoEstribosSuplementarios > 0 && (
                <ResultMetric label="Peso estribos suplementarios" value={result.pesoEstribosSuplementarios} unit="kg" accent="steel" />
              )}
              <ResultMetric label="Acero total" value={result.pesoAceroTotal} unit="kg" accent="steel" />
              <ResultMetric label="Longitud total de fierro" value={result.longitudTotalFierro} unit="m" accent="steel" />
            </div>
          </SectionCard>

          <SectionCard title="Resumen" icon={<ClipboardList size={16} className="text-navy-700" />}>
            <ResultTable lines={lines} />
          </SectionCard>

          <SectionCard title="Grupos de columnas registrados en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
            <ModuleElementsList module="columna" emptyLabel="Aún no has agregado ningún grupo de columnas. Calcula arriba y presiona 'Agregar a la lista'." />
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

import { useMemo, useState } from "react";
import { MoveUpRight, Save, Tag, Ruler, Footprints, LandPlot, Grid3x3, Eye, Box, Calculator, ClipboardList, ListChecks } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { SelectField } from "../components/ui/SelectField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { StickyViewsRow } from "../components/ui/StickyViewsRow";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { EscaleraProfile } from "../components/diagrams/EscaleraProfile";
import { EscaleraIsometric } from "../components/diagrams/EscaleraIsometric";
import { calcularEscalera, type EscaleraInput, type TipoEscalera } from "../lib/calc/escalera";
import { lineasAceroPorDiametro } from "../lib/calc/aceroResumen";
import { REBAR_SIZES } from "../lib/materials";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

const rebarOptions = REBAR_SIZES.map((r) => ({ value: r.id, label: r.label }));
const tipoOptions: { value: TipoEscalera; label: string }[] = [
  { value: "un_tramo", label: "Un tramo" },
  { value: "dos_tramos", label: "Dos tramos" },
  { value: "L", label: "En L" },
  { value: "U", label: "En U" },
];

function nextEscaleraName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "escalera").length;
  return `Escalera ${count + 1}`;
}

export function EscalerasPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextEscaleraName);

  const [input, setInput] = useState<EscaleraInput>({
    tipo: "un_tramo",
    alturaEntrePisos: 2.7,
    anchoEscalera: 1.2,
    espesorLosaInclinada: 15,
    tramo1: { numeroPeldanos: 16, huella: 25, contrahuella: 16.875 },
    tramo2: { numeroPeldanos: 8, huella: 25, contrahuella: 16.875 },
    descanso: { ancho: 1.2, largo: 1.2, espesor: 15 },
    aceroPrincipalDiametroId: "12",
    aceroPrincipalSeparacion: 20,
    aceroDistribucionDiametroId: "8",
    aceroDistribucionSeparacion: 25,
  });

  const result = useMemo(() => calcularEscalera(input), [input]);
  const esMultiTramo = input.tipo !== "un_tramo";

  const lines: MetradoLine[] = [
    { partida: "Concreto f'c=210 kg/cm² en escalera", unidad: "m³", cantidad: result.volumenConcretoTotal },
    ...lineasAceroPorDiametro(result.desgloseAcero),
    { partida: "Encofrado de escalera (fondo y contrahuellas)", unidad: "m²", cantidad: result.encofradoTotal },
  ];

  function updateRoot<K extends keyof EscaleraInput>(key: K, value: EscaleraInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updateTramo1<K extends keyof EscaleraInput["tramo1"]>(key: K, value: number) {
    setInput((prev) => ({ ...prev, tramo1: { ...prev.tramo1, [key]: value } }));
    setSaved(false);
  }

  function updateTramo2<K extends keyof EscaleraInput["tramo1"]>(key: K, value: number) {
    setInput((prev) => ({
      ...prev,
      tramo2: { ...(prev.tramo2 ?? { numeroPeldanos: 0, huella: 0, contrahuella: 0 }), [key]: value },
    }));
    setSaved(false);
  }

  function updateDescanso<K extends keyof NonNullable<EscaleraInput["descanso"]>>(key: K, value: number) {
    setInput((prev) => ({
      ...prev,
      descanso: { ...(prev.descanso ?? { ancho: 0, largo: 0, espesor: 0 }), [key]: value },
    }));
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "escalera",
      name: nombre || "Escalera",
      createdAt: Date.now(),
      concreteM3: result.volumenConcretoTotal,
      steelKg: result.aceroTotalKg,
      formworkM2: result.encofradoTotal,
      lines,
      steelByDiameter: result.desgloseAcero,
      inputsSummary: {
        Tipo: tipoOptions.find((t) => t.value === input.tipo)?.label ?? input.tipo,
        "Altura entre pisos": `${input.alturaEntrePisos} m`,
        Ancho: `${input.anchoEscalera} m`,
      },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextEscaleraName());
  }

  return (
    <div>
      <PageHeader
        title="Metrado de Escaleras"
        subtitle="Escaleras de concreto armado: un tramo, dos tramos, L o U"
        icon={<MoveUpRight size={20} />}
        actions={
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-navy-950 shadow-sm transition-colors hover:bg-amber-400"
          >
            <Save size={16} />
            {saved ? "Agregada ✓ (puedes calcular otra)" : "Agregar a la lista"}
          </button>
        }
      />

      <div className="p-6">
        <StickyViewsRow>
            <SectionCard title="Perfil de escalera (vista en vivo)" icon={<Eye size={16} className="text-navy-700" />} collapsible>
              <EscaleraProfile input={input} />
            </SectionCard>

            <SectionCard title="Vista isométrica del acero (3D)" icon={<Box size={16} className="text-navy-700" />} collapsible>
              <EscaleraIsometric input={input} />
            </SectionCard>
        </StickyViewsRow>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <div className="flex flex-col gap-6">
          <SectionCard title="Identificación" icon={<Tag size={16} className="text-navy-700" />}>
            <TextField label="Nombre del elemento" value={nombre} onChange={setNombre} />
          </SectionCard>

          <SectionCard title="Datos generales" icon={<Ruler size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <SelectField
                  label="Tipo de escalera"
                  value={input.tipo}
                  onChange={(v) => updateRoot("tipo", v as TipoEscalera)}
                  options={tipoOptions}
                />
              </div>
              <NumberField
                label="Altura entre pisos"
                unit="m"
                value={input.alturaEntrePisos}
                onChange={(v) => updateRoot("alturaEntrePisos", v)}
              />
              <NumberField
                label="Ancho de escalera"
                unit="m"
                value={input.anchoEscalera}
                onChange={(v) => updateRoot("anchoEscalera", v)}
              />
              <NumberField
                label="Espesor losa inclinada"
                unit="cm"
                value={input.espesorLosaInclinada}
                onChange={(v) => updateRoot("espesorLosaInclinada", v)}
                helper="Garganta de la escalera"
              />
            </div>
          </SectionCard>

          <SectionCard title={esMultiTramo ? "Tramo 1" : "Peldaños"} icon={<Footprints size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="N° de peldaños"
                unit="und"
                step={1}
                value={input.tramo1.numeroPeldanos}
                onChange={(v) => updateTramo1("numeroPeldanos", v)}
              />
              <NumberField
                label="Huella"
                unit="cm"
                value={input.tramo1.huella}
                onChange={(v) => updateTramo1("huella", v)}
              />
              <NumberField
                label="Contrahuella"
                unit="cm"
                value={input.tramo1.contrahuella}
                onChange={(v) => updateTramo1("contrahuella", v)}
              />
            </div>
          </SectionCard>

          {esMultiTramo && (
            <>
              <SectionCard title="Tramo 2" icon={<Footprints size={16} className="text-navy-700" />}>
                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    label="N° de peldaños"
                    unit="und"
                    step={1}
                    value={input.tramo2?.numeroPeldanos ?? 0}
                    onChange={(v) => updateTramo2("numeroPeldanos", v)}
                  />
                  <NumberField
                    label="Huella"
                    unit="cm"
                    value={input.tramo2?.huella ?? 0}
                    onChange={(v) => updateTramo2("huella", v)}
                  />
                  <NumberField
                    label="Contrahuella"
                    unit="cm"
                    value={input.tramo2?.contrahuella ?? 0}
                    onChange={(v) => updateTramo2("contrahuella", v)}
                  />
                </div>
              </SectionCard>

              <SectionCard title="Descanso (landing)" icon={<LandPlot size={16} className="text-navy-700" />}>
                <div className="grid grid-cols-2 gap-4">
                  <NumberField
                    label="Ancho"
                    unit="m"
                    value={input.descanso?.ancho ?? 0}
                    onChange={(v) => updateDescanso("ancho", v)}
                  />
                  <NumberField
                    label="Largo"
                    unit="m"
                    value={input.descanso?.largo ?? 0}
                    onChange={(v) => updateDescanso("largo", v)}
                  />
                  <NumberField
                    label="Espesor"
                    unit="cm"
                    value={input.descanso?.espesor ?? 0}
                    onChange={(v) => updateDescanso("espesor", v)}
                  />
                </div>
              </SectionCard>
            </>
          )}

          <SectionCard title="Acero de refuerzo" icon={<Grid3x3 size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Ø acero principal"
                value={input.aceroPrincipalDiametroId}
                onChange={(v) => updateRoot("aceroPrincipalDiametroId", v)}
                options={rebarOptions}
              />
              <NumberField
                label="Separación principal"
                unit="cm"
                value={input.aceroPrincipalSeparacion}
                onChange={(v) => updateRoot("aceroPrincipalSeparacion", v)}
              />
              <SelectField
                label="Ø acero distribución"
                value={input.aceroDistribucionDiametroId}
                onChange={(v) => updateRoot("aceroDistribucionDiametroId", v)}
                options={rebarOptions}
              />
              <NumberField
                label="Separación distribución"
                unit="cm"
                value={input.aceroDistribucionSeparacion}
                onChange={(v) => updateRoot("aceroDistribucionSeparacion", v)}
              />
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <WarningsBox warnings={result.warnings} />


          <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <ResultMetric label="Desarrollo horizontal T1" value={result.tramo1.desarrolloHorizontal} unit="m" />
              <ResultMetric label="Long. inclinada T1" value={result.tramo1.longitudInclinada} unit="m" />
              <ResultMetric label="Área de escalera" value={result.areaEscaleraTotal} unit="m²" />
              {result.tramo2 && (
                <>
                  <ResultMetric label="Desarrollo horizontal T2" value={result.tramo2.desarrolloHorizontal} unit="m" />
                  <ResultMetric label="Long. inclinada T2" value={result.tramo2.longitudInclinada} unit="m" />
                </>
              )}
              <ResultMetric label="Volumen de concreto" value={result.volumenConcretoTotal} unit="m³" accent="navy" />
              <ResultMetric label="Encofrado total" value={result.encofradoTotal} unit="m²" accent="amber" />
              <ResultMetric label="Acero principal" value={result.aceroPrincipalKg} unit="kg" accent="steel" />
              <ResultMetric label="Acero distribución" value={result.aceroDistribucionKg} unit="kg" accent="steel" />
              <ResultMetric label="Acero total" value={result.aceroTotalKg} unit="kg" accent="steel" />
            </div>
          </SectionCard>

          <SectionCard title="Cuadro de metrados" icon={<ClipboardList size={16} className="text-navy-700" />}>
            <ResultTable lines={lines} />
          </SectionCard>

          <SectionCard title="Escaleras registradas en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
            <ModuleElementsList module="escalera" emptyLabel="Aún no has agregado ninguna escalera. Calcula arriba y presiona 'Agregar a la lista'." />
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

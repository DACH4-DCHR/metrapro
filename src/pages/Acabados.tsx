import { useMemo, useState } from "react";
import {
  PaintRoller,
  Save,
  Tag,
  Ruler,
  Eye,
  Layers3,
  Calculator,
  ClipboardList,
  ListChecks,
  DoorOpen,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/ui/SectionCard";
import { NumberField } from "../components/ui/NumberField";
import { ResultTable } from "../components/ui/ResultTable";
import { ResultMetric } from "../components/ui/ResultMetric";
import { WarningsBox } from "../components/ui/WarningsBox";
import { StickyViewsRow } from "../components/ui/StickyViewsRow";
import { ModuleElementsList } from "../components/ModuleElementsList";
import { AcabadosPlanView } from "../components/diagrams/AcabadosPlanView";
import { AcabadosMurosElevation } from "../components/diagrams/AcabadosMurosElevation";
import { calcularAcabados, type AcabadosInput } from "../lib/calc/acabados";
import { calcularVanos, type VanoGrupoInput } from "../lib/calc/derrames";
import {
  calcularAreaTarrajeoColumnas,
  calcularAreaTarrajeoVigas,
  type TarrajeoColumnaInput,
  type TarrajeoVigaInput,
} from "../lib/calc/tarrajeoElementos";
import { useProjectStore } from "../store/projectStore";
import type { CalculatedElement, MetradoLine } from "../lib/types";

function nextName() {
  const count = useProjectStore.getState().elements.filter((e) => e.module === "tarrajeoInteriores").length;
  return `Ambiente ${count + 1}`;
}

export function AcabadosPage() {
  const addElement = useProjectStore((s) => s.addElement);
  const [saved, setSaved] = useState(false);
  const [nombre, setNombre] = useState(nextName);

  const [input, setInput] = useState<Omit<AcabadosInput, "areaVanos">>({
    largo: 4,
    ancho: 3,
    altura: 2.6,
    incluirTarrajeoMuros: true,
    incluirTarrajeoCielorraso: false,
  });

  const [puertas, setPuertas] = useState<VanoGrupoInput>({ cantidad: 1, ancho: 0.9, alto: 2.1 });
  const [ventanas, setVentanas] = useState<VanoGrupoInput>({ cantidad: 1, ancho: 1.2, alto: 1.2 });
  const vanos = useMemo(() => calcularVanos(puertas, ventanas), [puertas, ventanas]);

  const [incluirColumnas, setIncluirColumnas] = useState(false);
  const [columnas, setColumnas] = useState<TarrajeoColumnaInput>({ cantidad: 1, ancho: 0.25, profundidad: 0.25, altura: 2.6 });
  const areaColumnas = useMemo(() => calcularAreaTarrajeoColumnas(columnas), [columnas]);

  const [incluirVigas, setIncluirVigas] = useState(false);
  const [vigas, setVigas] = useState<TarrajeoVigaInput>({ cantidad: 1, ancho: 0.25, peralte: 0.4, longitud: 4 });
  const areaVigas = useMemo(() => calcularAreaTarrajeoVigas(vigas), [vigas]);

  const acabadosInput: AcabadosInput = useMemo(
    () => ({ ...input, areaVanos: vanos.areaTotal }),
    [input, vanos.areaTotal]
  );
  const result = useMemo(() => calcularAcabados(acabadosInput), [acabadosInput]);

  const lines: MetradoLine[] = [];
  if (input.incluirTarrajeoMuros) {
    lines.push({
      partida: "Tarrajeo de muros interiores, mezcla C:A 1:5, e=1.5cm",
      unidad: "m²",
      cantidad: result.areaMurosNeta,
    });
  }
  if (input.incluirTarrajeoCielorraso) {
    lines.push({
      partida: "Tarrajeo de cielorraso, mezcla C:A 1:5, e=1.5cm",
      unidad: "m²",
      cantidad: result.areaCielorraso,
    });
  }
  if (incluirColumnas) {
    lines.push({ partida: "Tarrajeo de columnas, mezcla C:A 1:5, e=1.5cm", unidad: "m²", cantidad: areaColumnas });
  }
  if (incluirVigas) {
    lines.push({ partida: "Tarrajeo de vigas, mezcla C:A 1:5, e=1.5cm", unidad: "m²", cantidad: areaVigas });
  }
  if (vanos.perimetroDerramesTotal > 0) {
    lines.push({
      partida: "Vestidura de derrames en puertas y ventanas",
      unidad: "m",
      cantidad: vanos.perimetroDerramesTotal,
    });
  }

  function update<K extends keyof typeof input>(key: K, value: (typeof input)[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updatePuertas<K extends keyof VanoGrupoInput>(key: K, value: number) {
    setPuertas((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updateVentanas<K extends keyof VanoGrupoInput>(key: K, value: number) {
    setVentanas((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updateColumnas<K extends keyof TarrajeoColumnaInput>(key: K, value: number) {
    setColumnas((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function updateVigas<K extends keyof TarrajeoVigaInput>(key: K, value: number) {
    setVigas((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    const el: CalculatedElement = {
      id: crypto.randomUUID(),
      module: "tarrajeoInteriores",
      name: nombre || "Ambiente",
      createdAt: Date.now(),
      concreteM3: 0,
      steelKg: 0,
      formworkM2: 0,
      lines,
      inputsSummary: {
        Dimensiones: `${input.largo} x ${input.ancho} x ${input.altura} m`,
        "Área de vanos": `${vanos.areaTotal.toFixed(2)} m²`,
        Partidas:
          [
            input.incluirTarrajeoMuros && "tarrajeo de muros",
            input.incluirTarrajeoCielorraso && "tarrajeo de cielorraso",
            incluirColumnas && "tarrajeo de columnas",
            incluirVigas && "tarrajeo de vigas",
            vanos.perimetroDerramesTotal > 0 && "vestidura de derrames",
          ]
            .filter(Boolean)
            .join(", ") || "ninguna seleccionada",
      },
    };
    addElement(el);
    setSaved(true);
    setNombre(nextName());
  }

  return (
    <div>
      <PageHeader
        title="Tarrajeo de Interiores"
        subtitle="Tarrajeo de muros y cielorraso, por ambiente (cuarto, baño, sala, etc.)"
        icon={<PaintRoller size={20} />}
        helpKey="tarrajeoInteriores"
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
          <SectionCard title="Vista en planta (vista en vivo)" icon={<Eye size={16} className="text-navy-700" />} collapsible>
            <AcabadosPlanView input={acabadosInput} />
          </SectionCard>

          <SectionCard title="Desarrollo de muros" icon={<Layers3 size={16} className="text-navy-700" />} collapsible>
            <AcabadosMurosElevation input={acabadosInput} />
          </SectionCard>
        </StickyViewsRow>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
          <div className="flex flex-col gap-6">
            <SectionCard title="Identificación" icon={<Tag size={16} className="text-navy-700" />}>
              <TextField label="Nombre del ambiente" value={nombre} onChange={setNombre} />
            </SectionCard>

            <SectionCard title="Dimensiones del ambiente" icon={<Ruler size={16} className="text-navy-700" />}>
              <div className="grid grid-cols-2 gap-4">
                <NumberField label="Largo" unit="m" value={input.largo} onChange={(v) => update("largo", v)} />
                <NumberField label="Ancho" unit="m" value={input.ancho} onChange={(v) => update("ancho", v)} />
                <NumberField
                  label="Altura"
                  unit="m"
                  value={input.altura}
                  onChange={(v) => update("altura", v)}
                  helper="Del piso terminado al cielorraso"
                />
              </div>
            </SectionCard>

            <SectionCard title="Vanos (puertas y ventanas)" icon={<DoorOpen size={16} className="text-navy-700" />}>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="mb-2 text-sm font-semibold text-navy-800">Puertas</p>
                  <div className="grid grid-cols-3 gap-3">
                    <NumberField
                      label="Cantidad"
                      unit="und"
                      step={1}
                      value={puertas.cantidad}
                      onChange={(v) => updatePuertas("cantidad", v)}
                    />
                    <NumberField label="Ancho" unit="m" value={puertas.ancho} onChange={(v) => updatePuertas("ancho", v)} />
                    <NumberField label="Alto" unit="m" value={puertas.alto} onChange={(v) => updatePuertas("alto", v)} />
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-navy-800">Ventanas</p>
                  <div className="grid grid-cols-3 gap-3">
                    <NumberField
                      label="Cantidad"
                      unit="und"
                      step={1}
                      value={ventanas.cantidad}
                      onChange={(v) => updateVentanas("cantidad", v)}
                    />
                    <NumberField
                      label="Ancho"
                      unit="m"
                      value={ventanas.ancho}
                      onChange={(v) => updateVentanas("ancho", v)}
                    />
                    <NumberField label="Alto" unit="m" value={ventanas.alto} onChange={(v) => updateVentanas("alto", v)} />
                  </div>
                </div>
                <p className="text-xs text-steel-500">
                  El área se descuenta del tarrajeo de muros; la vestidura de derrames (jambas y dintel) se agrega sola al
                  resumen, en metros lineales.
                </p>
              </div>
            </SectionCard>

            <SectionCard title="Partidas a incluir" icon={<PaintRoller size={16} className="text-navy-700" />}>
              <div className="flex flex-col gap-4">
                <CheckboxField
                  label="Tarrajeo de muros interiores"
                  checked={input.incluirTarrajeoMuros}
                  onChange={(v) => update("incluirTarrajeoMuros", v)}
                />
                <CheckboxField
                  label="Tarrajeo de cielorraso"
                  checked={input.incluirTarrajeoCielorraso}
                  onChange={(v) => update("incluirTarrajeoCielorraso", v)}
                />

                <div className="border-t border-steel-200 pt-3">
                  <CheckboxField label="Tarrajeo de columnas" checked={incluirColumnas} onChange={setIncluirColumnas} />
                  {incluirColumnas && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <NumberField
                        label="Cantidad"
                        unit="und"
                        step={1}
                        value={columnas.cantidad}
                        onChange={(v) => updateColumnas("cantidad", v)}
                      />
                      <NumberField
                        label="Altura"
                        unit="m"
                        value={columnas.altura}
                        onChange={(v) => updateColumnas("altura", v)}
                      />
                      <NumberField
                        label="Ancho de sección"
                        unit="m"
                        value={columnas.ancho}
                        onChange={(v) => updateColumnas("ancho", v)}
                      />
                      <NumberField
                        label="Profundidad de sección"
                        unit="m"
                        value={columnas.profundidad}
                        onChange={(v) => updateColumnas("profundidad", v)}
                      />
                    </div>
                  )}
                </div>

                <div className="border-t border-steel-200 pt-3">
                  <CheckboxField label="Tarrajeo de vigas" checked={incluirVigas} onChange={setIncluirVigas} />
                  {incluirVigas && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <NumberField
                        label="Cantidad"
                        unit="und"
                        step={1}
                        value={vigas.cantidad}
                        onChange={(v) => updateVigas("cantidad", v)}
                      />
                      <NumberField
                        label="Longitud"
                        unit="m"
                        value={vigas.longitud}
                        onChange={(v) => updateVigas("longitud", v)}
                      />
                      <NumberField label="Ancho" unit="m" value={vigas.ancho} onChange={(v) => updateVigas("ancho", v)} />
                      <NumberField
                        label="Peralte"
                        unit="m"
                        value={vigas.peralte}
                        onChange={(v) => updateVigas("peralte", v)}
                        helper="Solo se tarrajean fondo y caras laterales"
                      />
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="flex flex-col gap-6">
            <WarningsBox warnings={result.warnings} />

            <SectionCard title="Resultados de cálculo" icon={<Calculator size={16} className="text-navy-700" />}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <ResultMetric label="Perímetro" value={result.perimetro} unit="m" />
                <ResultMetric label="Área de muros (bruta)" value={result.areaMurosBruta} unit="m²" />
                <ResultMetric label="Área de muros (neta)" value={result.areaMurosNeta} unit="m²" accent="navy" />
                <ResultMetric label="Área de cielorraso" value={result.areaCielorraso} unit="m²" accent="amber" />
                <ResultMetric label="Área de vanos" value={vanos.areaTotal} unit="m²" />
                <ResultMetric label="Derrames (perímetro)" value={vanos.perimetroDerramesTotal} unit="m" />
              </div>
            </SectionCard>

            <SectionCard title="Resumen" icon={<ClipboardList size={16} className="text-navy-700" />}>
              <ResultTable lines={lines} />
            </SectionCard>

            <SectionCard title="Ambientes registrados en este proyecto" icon={<ListChecks size={16} className="text-navy-700" />}>
              <ModuleElementsList
                module="tarrajeoInteriores"
                emptyLabel="Aún no has agregado ningún ambiente. Calcula arriba y presiona 'Agregar a la lista'."
              />
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

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-600"
      />
      <span className="text-sm font-medium text-navy-800">{label}</span>
    </label>
  );
}

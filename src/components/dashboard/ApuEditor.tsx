import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { currencyFormatter } from "../../lib/formatters";
import {
  calcularApu,
  JORNAL,
  type ApuDef,
  type ApuEquipoItem,
  type ApuManoObraItem,
  type ApuMaterialItem,
  type CategoriaManoObra,
} from "../../lib/apu";

// Celda de número editable, compacta, para usar dentro de las tablas del
// APU — a diferencia de PriceInput (que es específico para precios en
// soles), esta sirve para cualquier campo numérico (cantidad, jornal,
// rendimiento, cuadrilla...).
function NumCell({ value, onChange, step = 0.01 }: { value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <input
      type="number"
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="w-20 rounded border border-steel-200 px-1.5 py-1 text-right font-mono text-xs text-navy-900 outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600/20"
    />
  );
}

// Celda de texto editable para nombres de insumo / unidad.
function TextCell({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded border border-steel-200 px-1.5 py-1 text-xs text-navy-900 outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600/20 ${className}`}
    />
  );
}

function CategoriaSelect({ value, onChange }: { value: CategoriaManoObra; onChange: (v: CategoriaManoObra) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CategoriaManoObra)}
      className="rounded border border-steel-200 px-1 py-1 text-xs text-navy-900 outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600/20"
    >
      <option value="Operario">Operario</option>
      <option value="Oficial">Oficial</option>
      <option value="Peón">Peón</option>
    </select>
  );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="rounded p-1 text-steel-400 hover:bg-red-50 hover:text-red-600"
    >
      <Trash2 size={12} />
    </button>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-navy-700 hover:text-navy-900"
    >
      <Plus size={12} />
      {label}
    </button>
  );
}

// Panel de Análisis de Precios Unitarios de una partida: desglosa su precio
// en materiales + mano de obra + equipos/herramientas, cada insumo editable,
// con posibilidad de agregar o quitar insumos de cualquiera de los 3 grupos.
// Reemplaza al precio unitario manual mientras la partida tenga un APU (ver
// lib/apu.ts) — "Volver a precio manual" lo desactiva explícitamente.
export function ApuEditor({ apu, onChange, onRemove }: { apu: ApuDef; onChange: (apu: ApuDef) => void; onRemove: () => void }) {
  const totales = calcularApu(apu);

  function updateMaterial(idx: number, patch: Partial<ApuMaterialItem>) {
    const materiales = apu.materiales.map((m, i) => (i === idx ? { ...m, ...patch } : m));
    onChange({ ...apu, materiales });
  }
  function addMaterial() {
    onChange({ ...apu, materiales: [...apu.materiales, { insumo: "", unidad: "", cantidad: 0, precio: 0 }] });
  }
  function removeMaterial(idx: number) {
    onChange({ ...apu, materiales: apu.materiales.filter((_, i) => i !== idx) });
  }

  function updateManoObra(idx: number, patch: Partial<ApuManoObraItem>) {
    const manoObra = apu.manoObra.map((m, i) => (i === idx ? { ...m, ...patch } : m));
    onChange({ ...apu, manoObra });
  }
  function addManoObra() {
    onChange({
      ...apu,
      manoObra: [...apu.manoObra, { categoria: "Peón", cuadrilla: 1, rendimiento: 1, jornal: JORNAL.Peón }],
    });
  }
  function removeManoObra(idx: number) {
    onChange({ ...apu, manoObra: apu.manoObra.filter((_, i) => i !== idx) });
  }

  function updateEquipo(idx: number, patch: Partial<ApuEquipoItem>) {
    const equipos = apu.equipos.map((e, i) => (i === idx ? { ...e, ...patch } : e));
    onChange({ ...apu, equipos });
  }
  function addEquipo() {
    onChange({ ...apu, equipos: [...apu.equipos, { insumo: "", cantidad: 0, precio: 0 }] });
  }
  function removeEquipo(idx: number) {
    onChange({ ...apu, equipos: apu.equipos.filter((_, i) => i !== idx) });
  }

  return (
    <div className="rounded-md border border-steel-200 bg-steel-50 p-3">
      <div className="mb-3">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-steel-500">Materiales</p>
        {apu.materiales.length > 0 && (
          <div className="flex flex-col gap-1">
            {apu.materiales.map((m, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-2 text-xs">
                <TextCell value={m.insumo} onChange={(v) => updateMaterial(idx, { insumo: v })} placeholder="Insumo" className="w-full" />
                <NumCell value={m.cantidad} onChange={(v) => updateMaterial(idx, { cantidad: v })} />
                <TextCell value={m.unidad} onChange={(v) => updateMaterial(idx, { unidad: v })} placeholder="und" className="w-14" />
                <NumCell value={m.precio} onChange={(v) => updateMaterial(idx, { precio: v })} />
                <span className="w-20 text-right font-mono text-navy-900">
                  {currencyFormatter.format(m.cantidad * m.precio)}
                </span>
                <RemoveButton onClick={() => removeMaterial(idx)} label="Quitar material" />
              </div>
            ))}
          </div>
        )}
        <AddButton onClick={addMaterial} label="Agregar material" />
      </div>

      <div className="mb-3 border-t border-dashed border-steel-300 pt-3">
        {apu.manoObra.length > 0 && (
          <>
            <div className="mb-1 grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 text-[10px] font-bold uppercase tracking-wide text-steel-500">
              <span>Mano de obra</span>
              <span className="text-center">Cuadrilla</span>
              <span className="text-center">Rend./día</span>
              <span className="text-center">Jornal S/.</span>
              <span className="w-20 text-right">Parcial</span>
              <span />
            </div>
            <div className="flex flex-col gap-1">
              {apu.manoObra.map((m, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-2 text-xs">
                  <CategoriaSelect value={m.categoria} onChange={(v) => updateManoObra(idx, { categoria: v })} />
                  <NumCell value={m.cuadrilla} onChange={(v) => updateManoObra(idx, { cuadrilla: v })} step={0.1} />
                  <NumCell value={m.rendimiento} onChange={(v) => updateManoObra(idx, { rendimiento: v })} step={0.1} />
                  <NumCell value={m.jornal} onChange={(v) => updateManoObra(idx, { jornal: v })} />
                  <span className="w-20 text-right font-mono text-navy-900">
                    {currencyFormatter.format((m.cuadrilla * m.jornal) / Math.max(m.rendimiento, 0.0001))}
                  </span>
                  <RemoveButton onClick={() => removeManoObra(idx)} label="Quitar mano de obra" />
                </div>
              ))}
            </div>
          </>
        )}
        {apu.manoObra.length === 0 && (
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-steel-500">Mano de obra</p>
        )}
        <AddButton onClick={addManoObra} label="Agregar mano de obra" />
      </div>

      <div className="mb-2 border-t border-dashed border-steel-300 pt-3">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-steel-500">Equipos y herramientas</p>
        {apu.equipos.length > 0 && (
          <div className="flex flex-col gap-1">
            {apu.equipos.map((e, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 text-xs">
                <TextCell value={e.insumo} onChange={(v) => updateEquipo(idx, { insumo: v })} placeholder="Insumo" className="w-full" />
                {e.pctManoObra != null ? (
                  <>
                    <NumCell
                      value={e.pctManoObra * 100}
                      onChange={(v) => updateEquipo(idx, { pctManoObra: v / 100 })}
                      step={1}
                    />
                    <span className="text-steel-500">% M.O.</span>
                  </>
                ) : (
                  <>
                    <NumCell value={e.cantidad ?? 0} onChange={(v) => updateEquipo(idx, { cantidad: v })} />
                    <NumCell value={e.precio ?? 0} onChange={(v) => updateEquipo(idx, { precio: v })} />
                  </>
                )}
                <span className="w-20 text-right font-mono text-navy-900">
                  {currencyFormatter.format(
                    e.pctManoObra != null ? e.pctManoObra * totales.manoObra : (e.cantidad ?? 0) * (e.precio ?? 0)
                  )}
                </span>
                <RemoveButton onClick={() => removeEquipo(idx)} label="Quitar equipo" />
              </div>
            ))}
          </div>
        )}
        <AddButton onClick={addEquipo} label="Agregar equipo" />
      </div>

      <div className="flex items-center justify-between border-t border-steel-300 pt-2">
        <button
          onClick={onRemove}
          className="flex items-center gap-1 text-[11px] font-medium text-steel-500 hover:text-navy-800"
        >
          <RotateCcw size={12} />
          Volver a precio manual
        </button>
        <span className="text-xs text-steel-500">
          M.O. {((totales.manoObra / Math.max(totales.total, 0.0001)) * 100).toFixed(0)}% · Mat.{" "}
          {((totales.materiales / Math.max(totales.total, 0.0001)) * 100).toFixed(0)}% · Equipo{" "}
          {((totales.equipos / Math.max(totales.total, 0.0001)) * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

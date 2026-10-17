import { RotateCcw } from "lucide-react";
import { currencyFormatter } from "../../lib/formatters";
import { calcularApu, type ApuDef, type ApuEquipoItem, type ApuManoObraItem, type ApuMaterialItem } from "../../lib/apu";

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

// Panel de Análisis de Precios Unitarios de una partida: desglosa su precio
// en materiales + mano de obra + equipos/herramientas, cada insumo editable.
// Reemplaza al precio unitario manual mientras la partida tenga un APU (ver
// lib/apu.ts) — "Volver a precio manual" lo desactiva explícitamente.
export function ApuEditor({ apu, onChange, onRemove }: { apu: ApuDef; onChange: (apu: ApuDef) => void; onRemove: () => void }) {
  const totales = calcularApu(apu);

  function updateMaterial(idx: number, patch: Partial<ApuMaterialItem>) {
    const materiales = apu.materiales.map((m, i) => (i === idx ? { ...m, ...patch } : m));
    onChange({ ...apu, materiales });
  }
  function updateManoObra(idx: number, patch: Partial<ApuManoObraItem>) {
    const manoObra = apu.manoObra.map((m, i) => (i === idx ? { ...m, ...patch } : m));
    onChange({ ...apu, manoObra });
  }
  function updateEquipo(idx: number, patch: Partial<ApuEquipoItem>) {
    const equipos = apu.equipos.map((e, i) => (i === idx ? { ...e, ...patch } : e));
    onChange({ ...apu, equipos });
  }

  return (
    <div className="rounded-md border border-steel-200 bg-steel-50 p-3">
      {apu.materiales.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-steel-500">Materiales</p>
          <div className="flex flex-col gap-1">
            {apu.materiales.map((m, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 text-xs">
                <span className="truncate text-navy-900">{m.insumo}</span>
                <NumCell value={m.cantidad} onChange={(v) => updateMaterial(idx, { cantidad: v })} />
                <span className="text-steel-500">{m.unidad}</span>
                <NumCell value={m.precio} onChange={(v) => updateMaterial(idx, { precio: v })} />
                <span className="w-20 text-right font-mono text-navy-900">
                  {currencyFormatter.format(m.cantidad * m.precio)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {apu.manoObra.length > 0 && (
        <div className="mb-3 border-t border-dashed border-steel-300 pt-3">
          <div className="mb-1 grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 text-[10px] font-bold uppercase tracking-wide text-steel-500">
            <span>Mano de obra</span>
            <span className="text-center">Cuadrilla</span>
            <span className="text-center">Rend./día</span>
            <span className="text-center">Jornal S/.</span>
            <span className="w-20 text-right">Parcial</span>
          </div>
          <div className="flex flex-col gap-1">
            {apu.manoObra.map((m, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 text-xs">
                <span className="truncate text-navy-900">{m.categoria}</span>
                <NumCell value={m.cuadrilla} onChange={(v) => updateManoObra(idx, { cuadrilla: v })} step={0.1} />
                <NumCell value={m.rendimiento} onChange={(v) => updateManoObra(idx, { rendimiento: v })} step={0.1} />
                <NumCell value={m.jornal} onChange={(v) => updateManoObra(idx, { jornal: v })} />
                <span className="w-20 text-right font-mono text-navy-900">
                  {currencyFormatter.format((m.cuadrilla * m.jornal) / Math.max(m.rendimiento, 0.0001))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {apu.equipos.length > 0 && (
        <div className="mb-2 border-t border-dashed border-steel-300 pt-3">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-steel-500">Equipos y herramientas</p>
          <div className="flex flex-col gap-1">
            {apu.equipos.map((e, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 text-xs">
                <span className="truncate text-navy-900">{e.insumo}</span>
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
              </div>
            ))}
          </div>
        </div>
      )}

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

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import type { PresupuestoCustomGrupo } from "../../lib/presupuesto";

// Unidades más comunes en metrados y presupuestos de construcción en Perú —
// cubre la gran mayoría de partidas; "Otra..." deja escribir una unidad que
// no esté en la lista (ej. "millar", "rollo").
const UNIDADES_COMUNES = ["und", "m", "m²", "m³", "kg", "glb", "bolsas", "gal", "p2", "día", "viaje"];
const OTRA_UNIDAD = "__otra__";

// Formulario genérico para agregar una línea que no viene del metrado
// automático — lo usan tanto Metrado de Materiales (clavos, alambre, madera,
// etc., para completar la lista de compra) como Presupuesto Referencial
// (partidas que ningún módulo cubre, como movilización de personal o cerco
// perimétrico).
export function AddCustomLineForm({
  itemLabel,
  placeholder,
  buttonLabel,
  onAdd,
  showGroupSelector = false,
}: {
  itemLabel: string;
  placeholder: string;
  buttonLabel: string;
  onAdd: (partida: string, unidad: string, cantidad: number, grupo?: PresupuestoCustomGrupo) => void;
  // Solo el "Agregar partida" del Presupuesto Referencial lo necesita — ahí
  // sí importa si la partida es de Metrados Estructurales o de Acabados.
  // "Agregar material" (Metrado de Materiales) no lo usa.
  showGroupSelector?: boolean;
}) {
  const [partida, setPartida] = useState("");
  const [unidadSel, setUnidadSel] = useState("und");
  const [unidadOtra, setUnidadOtra] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [grupo, setGrupo] = useState<PresupuestoCustomGrupo>("estructural");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const unidad = unidadSel === OTRA_UNIDAD ? unidadOtra.trim() : unidadSel;
    if (!partida.trim() || !unidad || cantidad <= 0) return;
    onAdd(partida.trim(), unidad, cantidad, showGroupSelector ? grupo : undefined);
    setPartida("");
    setUnidadSel("und");
    setUnidadOtra("");
    setCantidad(1);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-dashed border-steel-300 p-3">
      <div className="min-w-[160px] flex-1">
        <label className="mb-1 block text-xs font-medium text-navy-800">{itemLabel}</label>
        <input
          type="text"
          value={partida}
          onChange={(e) => setPartida(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-steel-200 px-2 py-1.5 text-sm text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
        />
      </div>
      <div className="w-28">
        <label className="mb-1 block text-xs font-medium text-navy-800">Unidad</label>
        <select
          value={unidadSel}
          onChange={(e) => setUnidadSel(e.target.value)}
          className="w-full rounded-md border border-steel-200 bg-white px-2 py-1.5 text-sm text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
        >
          {UNIDADES_COMUNES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
          <option value={OTRA_UNIDAD}>Otra...</option>
        </select>
      </div>
      {unidadSel === OTRA_UNIDAD && (
        <div className="w-24">
          <label className="mb-1 block text-xs font-medium text-navy-800">¿Cuál?</label>
          <input
            type="text"
            value={unidadOtra}
            onChange={(e) => setUnidadOtra(e.target.value)}
            placeholder="ej. rollo"
            className="w-full rounded-md border border-steel-200 px-2 py-1.5 text-sm text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
          />
        </div>
      )}
      <div className="w-24">
        <label className="mb-1 block text-xs font-medium text-navy-800">Cantidad</label>
        <input
          type="number"
          step="0.01"
          min={0}
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value) || 0)}
          className="w-full rounded-md border border-steel-200 px-2 py-1.5 text-sm text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
        />
      </div>
      {showGroupSelector && (
        <div className="w-44">
          <label className="mb-1 block text-xs font-medium text-navy-800">Grupo</label>
          <select
            value={grupo}
            onChange={(e) => setGrupo(e.target.value as PresupuestoCustomGrupo)}
            className="w-full rounded-md border border-steel-200 bg-white px-2 py-1.5 text-sm text-navy-900 outline-none focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20"
          >
            <option value="estructural">Metrados Estructurales</option>
            <option value="acabados">Acabados y Adicionales</option>
            <option value="libre">Libre / Otros</option>
          </select>
        </div>
      )}
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-md bg-navy-900 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-700"
      >
        <Plus size={14} />
        {buttonLabel}
      </button>
    </form>
  );
}

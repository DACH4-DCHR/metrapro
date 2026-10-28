import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { CATALOGO_PARTIDAS } from "../../lib/catalogoPartidas";

// Catálogo de referencia completo (14 capítulos, mismo orden/numeración que
// una estructura de presupuesto típica) para que el usuario vea de entrada
// qué partidas ya calcula MetraPro — y a qué módulo ir — y cuáles todavía no
// tienen módulo propio (se cargan a mano en Presupuesto mientras tanto).
export function CatalogoPartidasSection() {
  return (
    <div className="flex flex-col gap-5">
      {CATALOGO_PARTIDAS.map((capitulo) => (
        <div key={capitulo.codigo}>
          <div className="mb-1.5 flex items-baseline gap-2 border-b border-steel-200 pb-1">
            <span className="font-mono text-xs font-bold text-amber-600">{capitulo.codigo}</span>
            <h3 className="text-xs font-bold uppercase tracking-wide text-navy-900">{capitulo.titulo}</h3>
          </div>
          <div className="flex flex-col divide-y divide-steel-100">
            {capitulo.partidas.map((partida) => (
              <div key={partida.codigo} className="flex items-center gap-3 py-1.5 text-sm">
                <span className="w-16 shrink-0 font-mono text-xs text-steel-500">{partida.codigo}</span>
                <span className="min-w-0 flex-1 text-navy-900">{partida.descripcion}</span>
                <span className="w-10 shrink-0 text-right text-xs text-steel-500">{partida.unidad}</span>
                <span className="w-44 shrink-0 text-right">
                  {partida.modulo ? (
                    <Link
                      to={partida.modulo.path}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-navy-700 hover:bg-navy-900/10 hover:text-navy-900"
                    >
                      {partida.modulo.label}
                      <ArrowRight size={11} />
                    </Link>
                  ) : (
                    <Link
                      to="/presupuesto"
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-steel-400 hover:bg-steel-100 hover:text-steel-600"
                      title="Todavía no tiene módulo propio — cárgala a mano en Presupuesto"
                    >
                      Sin módulo
                      <ArrowRight size={11} />
                    </Link>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

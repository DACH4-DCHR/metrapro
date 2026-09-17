import { HardHat, Check, Sparkles } from "lucide-react";
import { CONTACT_EMAIL, CONTACT_WHATSAPP } from "../lib/contact";

const LICENCIA_PRECIO = 95;
const RENOVACION_PRECIO = 57; // 60% del precio de la licencia

const CARACTERISTICAS = [
  "Metrados automáticos para 13 tipos de elementos (zapatas, columnas, placas, vigas, losas, muros, escaleras, etc.)",
  "Cumple la NTE E.060 y E.070 del Reglamento Nacional de Edificaciones",
  "Presupuesto referencial agrupado por elemento, con Gastos Generales, Utilidad e IGV",
  "Exportación a PDF y Excel, listos para compartir",
  "Dashboard con gráficos de costos y metrados",
  "Varios proyectos por cuenta, con catálogo de precios propio",
];

// Página pública (no requiere sesión) — para que alguien nuevo vea el precio
// antes de registrarse, sin tener que escribirle al dueño de la app primero.
export function PricingPage() {
  return (
    <div className="min-h-screen bg-steel-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <a href="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500 text-white">
            <HardHat size={20} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-navy-900">MetraPro</p>
            <p className="text-[11px] leading-tight text-steel-500">Metrados Estructurales</p>
          </div>
        </a>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-navy-900">Precio simple, sin sorpresas</h1>
          <p className="mt-2 text-sm text-steel-600">
            Prueba gratis 14 días. Si te sirve, una sola licencia y listo — sin mensualidades.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-steel-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-navy-950 px-6 py-3 text-white">
            <Sparkles size={16} className="text-amber-400" />
            <span className="text-sm font-semibold">Licencia MetraPro</span>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-1 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-navy-900">S/ {LICENCIA_PRECIO}</span>
              <span className="text-sm text-steel-500">pago único</span>
            </div>
            <p className="mb-6 text-sm text-steel-600">Acceso completo, para siempre — sin fecha de vencimiento.</p>

            <ul className="mb-6 flex flex-col gap-2.5">
              {CARACTERISTICAS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-steel-700">
                  <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="rounded-md bg-steel-50 px-4 py-3 text-xs text-steel-600">
              <strong className="text-navy-900">Actualizaciones opcionales:</strong> pasado un año de tu
              licencia, puedes renovar por S/ {RENOVACION_PRECIO}/año para seguir recibiendo funciones
              nuevas. Si no renuevas, tu cuenta sigue funcionando exactamente igual — no se bloquea.
            </div>

            <a
              href="/"
              className="mt-6 flex items-center justify-center rounded-md bg-navy-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
            >
              Empezar prueba gratuita de 14 días
            </a>
            <p className="mt-3 text-center text-xs text-steel-500">
              ¿Preguntas antes de registrarte? Escríbenos por{" "}
              <a
                href={`https://wa.me/${CONTACT_WHATSAPP}`}
                className="font-semibold text-navy-800 hover:underline"
              >
                WhatsApp
              </a>{" "}
              o{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-navy-800 hover:underline">
                correo
              </a>
              .
            </p>
          </div>
        </div>

        <a href="/" className="mt-6 inline-block text-sm font-semibold text-navy-800 hover:underline">
          ← Volver a MetraPro
        </a>
      </div>
    </div>
  );
}

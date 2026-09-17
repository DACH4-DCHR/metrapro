import type { ReactNode } from "react";
import { HardHat } from "lucide-react";
import { CONTACT_EMAIL, CONTACT_WHATSAPP } from "../lib/contact";

const ULTIMA_ACTUALIZACION = "17 de septiembre de 2026";

// Layout compartido por Términos de Uso y Política de Privacidad — páginas
// públicas, independientes de la sesión (se llega desde el pie del login o
// desde un enlace directo), con el mismo estilo del resto de la app.
function LegalPageLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-steel-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <a href="/" className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500 text-white">
            <HardHat size={20} />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-navy-900">MetraPro</p>
            <p className="text-[11px] leading-tight text-steel-500">Metrados Estructurales</p>
          </div>
        </a>

        <div className="rounded-lg border border-steel-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="mb-1 text-xl font-bold text-navy-900">{title}</h1>
          <p className="mb-6 text-xs text-steel-500">Última actualización: {ULTIMA_ACTUALIZACION}</p>
          <div className="flex flex-col gap-5 text-sm leading-relaxed text-steel-700 [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-navy-900 [&_li]:ml-4 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
            {children}
          </div>
        </div>

        <a href="/" className="mt-6 inline-block text-sm font-semibold text-navy-800 hover:underline">
          ← Volver a MetraPro
        </a>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <LegalPageLayout title="Términos de Uso">
      <p>
        Estos términos regulan el uso de <strong>MetraPro</strong>, una aplicación web para calcular
        metrados de elementos estructurales de concreto armado (zapatas, columnas, placas, vigas,
        losas, muros, escaleras, etc.) conforme a la Norma Técnica de Edificación E.060 y E.070 del
        Reglamento Nacional de Edificaciones del Perú. Al crear una cuenta o usar la aplicación,
        aceptas estos términos.
      </p>

      <h2>1. Qué es MetraPro y qué no es</h2>
      <p>
        MetraPro es una herramienta de apoyo para acelerar el cálculo de metrados y presupuestos
        referenciales. Los resultados dependen enteramente de los datos que ingreses (dimensiones,
        resistencias, cuantías, precios) y no reemplazan el criterio profesional de un ingeniero
        colegiado ni una revisión estructural formal. El usuario es responsable de verificar que
        los resultados sean correctos antes de usarlos en un expediente técnico, presupuesto o
        construcción real.
      </p>

      <h2>2. Cuenta y responsabilidad del usuario</h2>
      <ul>
        <li>Debes dar un correo electrónico válido y una contraseña de al menos 8 caracteres.</li>
        <li>Eres responsable de mantener tu contraseña en privado y de la actividad en tu cuenta.</li>
        <li>Los proyectos, elementos y precios que ingreses son tu responsabilidad — verifica los datos antes de exportarlos o compartirlos con un cliente.</li>
      </ul>

      <h2>3. Prueba gratuita y pago</h2>
      <ul>
        <li>Cada cuenta nueva tiene 14 días de acceso completo desde el registro, sin costo.</li>
        <li>Al vencer la prueba sin activar la cuenta, queda en modo de solo lectura: puedes ver y exportar tus proyectos existentes, pero no crear ni editar nada nuevo.</li>
        <li>La activación es manual: se realiza fuera de la aplicación (transferencia, Yape o Plin) y no se procesa ningún pago con tarjeta dentro de MetraPro.</li>
        <li>Una vez activada, la cuenta queda con acceso completo sin fecha de vencimiento. MetraPro puede mostrarte un aviso, pasado un año, invitándote a renovar para seguir recibiendo actualizaciones — esto es solo informativo y no bloquea tu acceso.</li>
      </ul>

      <h2>4. Disponibilidad del servicio</h2>
      <p>
        MetraPro se ofrece "tal cual", sin garantía de disponibilidad ininterrumpida. Podemos
        realizar mantenimiento, actualizaciones o cambios en cualquier momento. No garantizamos que
        la aplicación esté libre de errores.
      </p>

      <h2>5. Límite de responsabilidad</h2>
      <p>
        MetraPro no se hace responsable por decisiones de diseño, construcción o presupuesto
        tomadas a partir de los resultados de la aplicación. El uso de estos resultados en un
        proyecto real es decisión y responsabilidad exclusiva del usuario.
      </p>

      <h2>6. Cancelación</h2>
      <p>
        Puedes dejar de usar MetraPro cuando quieras. Si quieres que eliminemos tu cuenta y tus
        datos, escríbenos por los medios de contacto abajo.
      </p>

      <h2>7. Contacto</h2>
      <p>
        Para consultas sobre estos términos: WhatsApp{" "}
        <a href={`https://wa.me/${CONTACT_WHATSAPP}`} className="font-semibold text-navy-800 hover:underline">
          +{CONTACT_WHATSAPP}
        </a>{" "}
        o correo{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-navy-800 hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalPageLayout>
  );
}

export function PrivacyPage() {
  return (
    <LegalPageLayout title="Política de Privacidad">
      <p>
        Esta política explica qué datos recopila <strong>MetraPro</strong> y cómo los usa, conforme
        a la Ley N° 29733, Ley de Protección de Datos Personales del Perú.
      </p>

      <h2>1. Qué datos recopilamos</h2>
      <ul>
        <li>Correo electrónico y contraseña (la contraseña se guarda cifrada con scrypt, nunca en texto plano — ni siquiera nosotros podemos leerla).</li>
        <li>Los datos de tus proyectos: nombre de obra, cliente, ubicación, elementos calculados, precios y logo que subas.</li>
        <li>Datos técnicos básicos de la sesión (dirección IP, para prevenir el uso indebido de la aplicación mediante límites de intentos de acceso).</li>
      </ul>

      <h2>2. Para qué usamos tus datos</h2>
      <ul>
        <li>Para darte acceso a tu cuenta y tus proyectos guardados.</li>
        <li>Para enviarte correos operativos: recuperación de contraseña, avisos sobre tu período de prueba.</li>
        <li>Para prevenir abuso (intentos de acceso masivos, cuentas falsas).</li>
      </ul>
      <p>No usamos tus datos para publicidad ni los vendemos a terceros.</p>

      <h2>3. Con quién compartimos tus datos</h2>
      <p>
        Tus datos se almacenan en Railway (base de datos) y el correo transaccional se envía a
        través de Brevo — ambos actúan solo como proveedores de infraestructura, no tienen acceso
        independiente a tus proyectos ni los usan para ningún otro fin. No compartimos tus datos
        con nadie más.
      </p>

      <h2>4. Tus derechos (ARCO)</h2>
      <p>
        Puedes pedirnos en cualquier momento: acceder a tus datos, rectificarlos, cancelarlos
        (eliminar tu cuenta) u oponerte a un uso puntual. Escríbenos por los medios de contacto
        abajo y lo resolvemos directamente contigo.
      </p>

      <h2>5. Cuánto tiempo guardamos tus datos</h2>
      <p>
        Mientras tu cuenta exista. Si pides eliminarla, borramos tu cuenta y tus proyectos de forma
        permanente.
      </p>

      <h2>6. Contacto</h2>
      <p>
        Para ejercer tus derechos o cualquier consulta sobre tus datos: WhatsApp{" "}
        <a href={`https://wa.me/${CONTACT_WHATSAPP}`} className="font-semibold text-navy-800 hover:underline">
          +{CONTACT_WHATSAPP}
        </a>{" "}
        o correo{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-navy-800 hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalPageLayout>
  );
}

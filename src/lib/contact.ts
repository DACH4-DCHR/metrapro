// Datos de contacto para activar/renovar una cuenta — se muestran en los
// avisos de prueba vencida, por vencer, y renovación de actualizaciones
// (ver Layout.tsx). Único lugar donde cambiarlos si el número o correo cambian.
export const CONTACT_WHATSAPP = "51980623649";
export const CONTACT_TELEGRAM = "51980623649";
export const CONTACT_EMAIL = "danielchavezro@gmail.com";

export function whatsappLink(message: string): string {
  return `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

// Telegram identifica el chat por número de teléfono (con "+" y código de
// país) en vez de por link de invitación — a diferencia de WhatsApp, no
// soporta precargar un mensaje en este formato de enlace.
export function telegramLink(): string {
  return `https://t.me/+${CONTACT_TELEGRAM}`;
}

export function mailtoLink(subject: string, body: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

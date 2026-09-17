import nodemailer from "nodemailer";

// Correo transaccional vía SMTP de Gmail (cuenta propia + contraseña de
// aplicación) — evita depender de un proveedor externo que exija verificar un
// dominio propio (no lo hay: la app vive en subdominios de Vercel/Railway).
// Sin GMAIL_USER/GMAIL_APP_PASSWORD configurados (ej. en desarrollo local),
// no falla: solo deja el correo en el log, para poder probar el flujo de
// recuperación sin enviar nada de verdad.
let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    // Railway no tiene salida de red IPv6 utilizable — sin esto, Node intenta
    // conectar a smtp.gmail.com por IPv6 primero y tarda minutos en fallar
    // (ENETUNREACH) antes de caer a IPv4. Forzar IPv4 evita esa demora.
    family: 4,
  });
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[mail] GMAIL_USER/GMAIL_APP_PASSWORD no configurados — correo no enviado a ${to}: ${subject}`);
    console.log(text);
    return;
  }
  await t.sendMail({ from: `MetraPro <${process.env.GMAIL_USER}>`, to, subject, html, text });
}

export async function sendPasswordResetEmail(toEmail, resetLink) {
  await sendMail({
    to: toEmail,
    subject: "Recupera tu contraseña de MetraPro",
    text: `Recibimos una solicitud para restablecer tu contraseña de MetraPro.\n\nAbre este enlace para elegir una nueva (válido por 1 hora):\n${resetLink}\n\nSi no fuiste tú, ignora este correo — tu contraseña actual sigue funcionando.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0b1f3a;">Recupera tu contraseña</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña de <strong>MetraPro</strong>.</p>
        <p>
          <a href="${resetLink}" style="display: inline-block; background: #0b1f3a; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">
            Elegir nueva contraseña
          </a>
        </p>
        <p style="color: #52514e; font-size: 13px;">Este enlace vale por 1 hora. Si no fuiste tú, ignora este correo — tu contraseña actual sigue funcionando.</p>
      </div>
    `,
  });
}

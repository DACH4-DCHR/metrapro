// Correo transaccional vía la API HTTPS de Brevo (antes Sendinblue). Se probó
// primero con SMTP de Gmail, pero Railway bloquea las conexiones SMTP
// salientes (confirmado en producción: ETIMEDOUT en el puerto 465) — un
// bloqueo común en varios hosting en la nube para prevenir spam. La API de
// Brevo se llama por HTTPS normal, sin ese problema.
// Sin BREVO_API_KEY configurada (ej. en desarrollo local), no falla: solo
// deja el correo en el log, para poder probar el flujo de recuperación sin
// enviar nada de verdad.
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const SENDER_EMAIL = process.env.MAIL_FROM_EMAIL || "no-reply@metrapro.app";

async function sendMail({ to, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.log(`[mail] BREVO_API_KEY no configurada — correo no enviado a ${to}: ${subject}`);
    console.log(text);
    return;
  }
  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "MetraPro", email: SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo respondió ${res.status}: ${body}`);
  }
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

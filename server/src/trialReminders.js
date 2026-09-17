import {
  getUsersNeedingTrialReminder,
  getUsersNeedingTrialExpiredEmail,
  markTrialReminderSent,
  markTrialExpiredEmailSent,
} from "./db.js";
import { sendTrialEndingSoonEmail, sendTrialExpiredEmail } from "./mail.js";

const MS_POR_DIA = 24 * 60 * 60 * 1000;
// Cada cuánto se revisa quién necesita un aviso — no hace falta más
// frecuencia: llegar unas horas después de entrar a la ventana de 3 días, o
// de vencer la prueba, no cambia nada para el usuario.
const CHECK_INTERVAL_MS = 3 * 60 * 60 * 1000;

async function checkTrialReminders() {
  try {
    const porVencer = await getUsersNeedingTrialReminder();
    for (const user of porVencer) {
      const diasRestantes = Math.max(1, Math.ceil((Number(user.trial_ends_at) - Date.now()) / MS_POR_DIA));
      try {
        await sendTrialEndingSoonEmail(user.email, diasRestantes);
        await markTrialReminderSent(user.id);
      } catch (err) {
        console.error(`No se pudo enviar el aviso de prueba por vencer a ${user.email}:`, err);
      }
    }

    const vencidos = await getUsersNeedingTrialExpiredEmail();
    for (const user of vencidos) {
      try {
        await sendTrialExpiredEmail(user.email);
        await markTrialExpiredEmailSent(user.id);
      } catch (err) {
        console.error(`No se pudo enviar el aviso de prueba vencida a ${user.email}:`, err);
      }
    }
  } catch (err) {
    console.error("Error revisando avisos de prueba:", err);
  }
}

// Se llama una vez al arrancar el servidor y luego cada CHECK_INTERVAL_MS —
// la ventana de "está por vencer" (3 días) vive en db.js, junto a las
// consultas que la usan.
export function startTrialReminderJob() {
  checkTrialReminders();
  setInterval(checkTrialReminders, CHECK_INTERVAL_MS);
}

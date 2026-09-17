import pg from "pg";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST ?? "localhost",
        port: Number(process.env.PGPORT ?? 5432),
        database: process.env.PGDATABASE ?? "metrapro",
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
      }
);

export async function initSchema() {
  const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
}

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function rowToProjectInfo(row) {
  return {
    id: row.id,
    nombreObra: row.nombre_obra,
    cliente: row.cliente,
    ubicacion: row.ubicacion,
    responsable: row.responsable,
    fecha: row.fecha,
    logoDataUrl: row.logo_data_url ?? undefined,
  };
}

function rowToElement(row) {
  return {
    id: row.id,
    module: row.module,
    name: row.name,
    createdAt: Number(row.created_at),
    concreteM3: row.concrete_m3,
    steelKg: row.steel_kg,
    formworkM2: row.formwork_m2,
    lines: row.lines_json,
    inputsSummary: row.inputs_summary_json,
    steelByDiameter: row.steel_by_diameter_json ?? [],
  };
}

async function createProjectRow(userId) {
  const today = new Date().toISOString().slice(0, 10);
  // Un proyecto nuevo arranca con los precios del catálogo del usuario (los
  // últimos que usó en cualquier otro proyecto), en vez de en blanco — así no
  // hay que volver a escribir los mismos precios unitarios en cada obra.
  const catalog = await getPriceCatalog(userId);
  const { rows } = await pool.query(
    `INSERT INTO projects (user_id, nombre_obra, cliente, ubicacion, responsable, fecha, prices_json, created_at)
     VALUES ($1, '', '', '', '', $2, $3::jsonb, $4)
     RETURNING id`,
    [userId, today, JSON.stringify(catalog), Date.now()]
  );
  return rows[0].id;
}

// Las llaves reservadas (Gastos Generales/Utilidad/IGV, ver GG_ON_KEY etc. en
// presupuesto.ts del frontend) empiezan con "__" y son ajustes por proyecto,
// no precios unitarios — se excluyen del catálogo a propósito.
function isReservedPriceKey(key) {
  return key.startsWith("__");
}

export async function getPriceCatalog(userId) {
  const { rows } = await pool.query("SELECT price_catalog_json FROM users WHERE id = $1", [userId]);
  return rows[0]?.price_catalog_json ?? {};
}

// Mezcla (no reemplaza) los precios de partida de "prices" dentro del catálogo
// del usuario, usando el operador de concatenación jsonb de Postgres para que
// sea una sola operación atómica (sin leer-modificar-escribir por separado).
export async function mergeIntoPriceCatalog(userId, prices) {
  const entries = {};
  for (const [key, value] of Object.entries(prices ?? {})) {
    if (!isReservedPriceKey(key)) entries[key] = value;
  }
  if (Object.keys(entries).length === 0) return;
  await pool.query("UPDATE users SET price_catalog_json = price_catalog_json || $1::jsonb WHERE id = $2", [
    JSON.stringify(entries),
    userId,
  ]);
}

// --- Usuarios y contraseñas ---

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// --- Prueba gratuita y activación manual ---

export const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000;
// Una vez pagada, la cuenta queda activa para siempre (nunca se vuelve a
// bloquear por tiempo) — este plazo es solo para el AVISO de que hay
// actualizaciones nuevas, no una fecha de corte. Reactivar la cuenta
// (POST /api/admin/activate de nuevo) reinicia este año, como una renovación.
export const UPDATES_REMINDER_MS = 365 * 24 * 60 * 60 * 1000;

// true si el usuario puede crear/editar (pagó, o su prueba de 14 días sigue
// vigente); false = modo de solo lectura. Se calcula al vuelo (nunca se
// guarda) para que nunca quede desactualizado por un reloj de servidor viejo.
export function hasFullAccess(user) {
  return user.is_paid || Date.now() < Number(user.trial_ends_at);
}

export function accessFieldsFor(user) {
  const paidAt = user.paid_at ? Number(user.paid_at) : null;
  return {
    trialEndsAt: Number(user.trial_ends_at),
    isPaid: user.is_paid,
    paidAt,
    // Solo informativo — nunca bloquea nada, a diferencia de hasFullAccess.
    updatesReminderDue: user.is_paid && paidAt != null && Date.now() > paidAt + UPDATES_REMINDER_MS,
    hasFullAccess: hasFullAccess(user),
  };
}

export async function createUser(email, password) {
  const { salt, hash } = hashPassword(password);
  const now = Date.now();
  const { rows } = await pool.query(
    "INSERT INTO users (email, password_hash, password_salt, created_at, trial_ends_at) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [email, hash, salt, now, now + TRIAL_DURATION_MS]
  );
  const userId = rows[0].id;
  await createProjectRow(userId);
  return { id: userId, email };
}

export async function findUserByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return rows[0] ?? null;
}

export async function getUserById(id) {
  const { rows } = await pool.query(
    "SELECT id, email, created_at, trial_ends_at, is_paid, paid_at FROM users WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

export function verifyUserPassword(user, password) {
  return verifyPassword(password, user.password_salt, user.password_hash);
}

// Activación/desactivación manual (el dueño de la app la ejecuta después de
// recibir el pago por transferencia/Yape/Plin — ver POST /api/admin/activate).
export async function setUserPaid(email, isPaid) {
  const { rows } = await pool.query(
    "UPDATE users SET is_paid = $1, paid_at = $2 WHERE email = $3 RETURNING id, email",
    [isPaid, isPaid ? Date.now() : null, email]
  );
  return rows[0] ?? null;
}

export async function listUsersWithAccessStatus() {
  const { rows } = await pool.query(
    "SELECT id, email, created_at, trial_ends_at, is_paid, paid_at FROM users ORDER BY created_at DESC"
  );
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    createdAt: Number(row.created_at),
    ...accessFieldsFor(row),
  }));
}

// --- Avisos de prueba por correo (ver trialReminders.js) ---

export const TRIAL_REMINDER_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

// Cuentas sin pagar, dentro de los últimos 3 días de prueba, a las que
// todavía no se les mandó el aviso de "tu prueba está por terminar".
export async function getUsersNeedingTrialReminder() {
  const now = Date.now();
  const { rows } = await pool.query(
    `SELECT id, email, trial_ends_at FROM users
     WHERE is_paid = false
       AND trial_reminder_sent_at IS NULL
       AND trial_ends_at > $1
       AND trial_ends_at <= $2`,
    [now, now + TRIAL_REMINDER_WINDOW_MS]
  );
  return rows;
}

// Cuentas sin pagar cuya prueba ya venció, a las que todavía no se les mandó
// el aviso de "tu prueba terminó".
export async function getUsersNeedingTrialExpiredEmail() {
  const { rows } = await pool.query(
    `SELECT id, email FROM users
     WHERE is_paid = false
       AND trial_expired_email_sent_at IS NULL
       AND trial_ends_at <= $1`,
    [Date.now()]
  );
  return rows;
}

export async function markTrialReminderSent(userId) {
  await pool.query("UPDATE users SET trial_reminder_sent_at = $1 WHERE id = $2", [Date.now(), userId]);
}

export async function markTrialExpiredEmailSent(userId) {
  await pool.query("UPDATE users SET trial_expired_email_sent_at = $1 WHERE id = $2", [Date.now(), userId]);
}

// --- Sesiones ---

export async function createSession(userId) {
  const id = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  await pool.query("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)", [
    id,
    userId,
    expiresAt,
    Date.now(),
  ]);
  return { id, expiresAt };
}

export async function getSession(sessionId) {
  const { rows } = await pool.query("SELECT * FROM sessions WHERE id = $1", [sessionId]);
  const row = rows[0];
  if (!row) return null;
  if (Number(row.expires_at) < Date.now()) {
    await pool.query("DELETE FROM sessions WHERE id = $1", [sessionId]);
    return null;
  }
  return row;
}

export async function deleteSession(sessionId) {
  await pool.query("DELETE FROM sessions WHERE id = $1", [sessionId]);
}

export async function deleteSessionsForUser(userId) {
  await pool.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
}

// --- Recuperación de contraseña ---

const PASSWORD_RESET_DURATION_MS = 60 * 60 * 1000;

export async function createPasswordReset(userId) {
  const id = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + PASSWORD_RESET_DURATION_MS;
  await pool.query("INSERT INTO password_resets (id, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)", [
    id,
    userId,
    expiresAt,
    Date.now(),
  ]);
  return { id, expiresAt };
}

export async function getPasswordReset(token) {
  const { rows } = await pool.query("SELECT * FROM password_resets WHERE id = $1", [token]);
  const row = rows[0];
  if (!row) return null;
  if (Number(row.expires_at) < Date.now()) {
    await pool.query("DELETE FROM password_resets WHERE id = $1", [token]);
    return null;
  }
  return row;
}

export async function deletePasswordReset(token) {
  await pool.query("DELETE FROM password_resets WHERE id = $1", [token]);
}

export async function updateUserPassword(userId, password) {
  const { salt, hash } = hashPassword(password);
  await pool.query("UPDATE users SET password_hash = $1, password_salt = $2 WHERE id = $3", [hash, salt, userId]);
}

// --- Proyectos (varios por usuario) ---

export async function listProjectsForUser(userId) {
  const { rows } = await pool.query(
    "SELECT id, nombre_obra, cliente, fecha, created_at FROM projects WHERE user_id = $1 ORDER BY created_at ASC",
    [userId]
  );
  return rows.map((row) => ({
    id: row.id,
    nombreObra: row.nombre_obra,
    cliente: row.cliente,
    fecha: row.fecha,
    createdAt: Number(row.created_at),
  }));
}

export async function createProjectForUser(userId) {
  return createProjectRow(userId);
}

// Devuelve el user_id dueño del proyecto, o null si no existe — se usa para
// verificar que el proyecto pedido pertenece a quien hace la petición antes de
// leer o modificar nada (evita que un usuario acceda a proyectos ajenos por id).
export async function getProjectOwnerId(projectId) {
  const { rows } = await pool.query("SELECT user_id FROM projects WHERE id = $1", [projectId]);
  return rows[0]?.user_id ?? null;
}

export async function deleteProjectRow(projectId) {
  await pool.query("DELETE FROM projects WHERE id = $1", [projectId]);
}

export async function getProject(projectId) {
  const { rows } = await pool.query("SELECT * FROM projects WHERE id = $1", [projectId]);
  const row = rows[0];
  if (!row) return null;
  const { rows: elementRows } = await pool.query(
    "SELECT * FROM elements WHERE project_id = $1 ORDER BY created_at DESC",
    [projectId]
  );
  return {
    projectInfo: rowToProjectInfo(row),
    prices: row.prices_json,
    materialesCustom: row.materiales_custom_json,
    presupuestoCustom: row.presupuesto_custom_json,
    elements: elementRows.map(rowToElement),
  };
}

export async function updateProjectInfo(projectId, fields) {
  const columnMap = {
    nombreObra: "nombre_obra",
    cliente: "cliente",
    ubicacion: "ubicacion",
    responsable: "responsable",
    fecha: "fecha",
    logoDataUrl: "logo_data_url",
  };
  const setClauses = [];
  const values = [];
  let i = 1;
  for (const [key, column] of Object.entries(columnMap)) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      setClauses.push(`${column} = $${i++}`);
      values.push(fields[key] ?? null);
    }
  }
  if (setClauses.length === 0) return;
  values.push(projectId);
  await pool.query(`UPDATE projects SET ${setClauses.join(", ")} WHERE id = $${i}`, values);
}

export async function setPrices(projectId, prices) {
  await pool.query("UPDATE projects SET prices_json = $1::jsonb WHERE id = $2", [
    JSON.stringify(prices),
    projectId,
  ]);
}

export async function setMaterialesCustom(projectId, materialesCustom) {
  await pool.query("UPDATE projects SET materiales_custom_json = $1::jsonb WHERE id = $2", [
    JSON.stringify(materialesCustom),
    projectId,
  ]);
}

export async function setPresupuestoCustom(projectId, presupuestoCustom) {
  await pool.query("UPDATE projects SET presupuesto_custom_json = $1::jsonb WHERE id = $2", [
    JSON.stringify(presupuestoCustom),
    projectId,
  ]);
}

export async function addElement(projectId, element) {
  // ON CONFLICT (upsert), no un INSERT simple: el frontend puede reintentar este POST
  // tras recuperar la conexión sin saber si la petición original ya había llegado al
  // servidor, así que el mismo id debe poder reenviarse sin producir un error.
  await pool.query(
    `INSERT INTO elements (id, project_id, module, name, created_at, concrete_m3, steel_kg, formwork_m2, lines_json, inputs_summary_json, steel_by_diameter_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb)
     ON CONFLICT (id) DO UPDATE SET
       project_id = EXCLUDED.project_id,
       module = EXCLUDED.module,
       name = EXCLUDED.name,
       created_at = EXCLUDED.created_at,
       concrete_m3 = EXCLUDED.concrete_m3,
       steel_kg = EXCLUDED.steel_kg,
       formwork_m2 = EXCLUDED.formwork_m2,
       lines_json = EXCLUDED.lines_json,
       inputs_summary_json = EXCLUDED.inputs_summary_json,
       steel_by_diameter_json = EXCLUDED.steel_by_diameter_json`,
    [
      element.id,
      projectId,
      element.module,
      element.name,
      element.createdAt,
      element.concreteM3,
      element.steelKg,
      element.formworkM2,
      JSON.stringify(element.lines),
      JSON.stringify(element.inputsSummary),
      JSON.stringify(element.steelByDiameter ?? []),
    ]
  );
  return element;
}

export async function removeElement(projectId, elementId) {
  await pool.query("DELETE FROM elements WHERE id = $1 AND project_id = $2", [elementId, projectId]);
}

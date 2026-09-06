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
  };
}

async function createProjectRow(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const { rows } = await pool.query(
    `INSERT INTO projects (user_id, nombre_obra, cliente, ubicacion, responsable, fecha, prices_json, created_at)
     VALUES ($1, '', '', '', '', $2, '{}'::jsonb, $3)
     RETURNING id`,
    [userId, today, Date.now()]
  );
  return rows[0].id;
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

export async function createUser(email, password) {
  const { salt, hash } = hashPassword(password);
  const { rows } = await pool.query(
    "INSERT INTO users (email, password_hash, password_salt, created_at) VALUES ($1, $2, $3, $4) RETURNING id",
    [email, hash, salt, Date.now()]
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
  const { rows } = await pool.query("SELECT id, email, created_at FROM users WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export function verifyUserPassword(user, password) {
  return verifyPassword(password, user.password_salt, user.password_hash);
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

// --- Proyectos (uno por usuario) ---

export async function getOrCreateProjectForUser(userId) {
  const { rows } = await pool.query(
    "SELECT id FROM projects WHERE user_id = $1 ORDER BY id ASC LIMIT 1",
    [userId]
  );
  if (rows[0]) return rows[0].id;
  return createProjectRow(userId);
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

export async function addElement(projectId, element) {
  // ON CONFLICT (upsert), no un INSERT simple: el frontend puede reintentar este POST
  // tras recuperar la conexión sin saber si la petición original ya había llegado al
  // servidor, así que el mismo id debe poder reenviarse sin producir un error.
  await pool.query(
    `INSERT INTO elements (id, project_id, module, name, created_at, concrete_m3, steel_kg, formwork_m2, lines_json, inputs_summary_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)
     ON CONFLICT (id) DO UPDATE SET
       project_id = EXCLUDED.project_id,
       module = EXCLUDED.module,
       name = EXCLUDED.name,
       created_at = EXCLUDED.created_at,
       concrete_m3 = EXCLUDED.concrete_m3,
       steel_kg = EXCLUDED.steel_kg,
       formwork_m2 = EXCLUDED.formwork_m2,
       lines_json = EXCLUDED.lines_json,
       inputs_summary_json = EXCLUDED.inputs_summary_json`,
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
    ]
  );
  return element;
}

export async function removeElement(projectId, elementId) {
  await pool.query("DELETE FROM elements WHERE id = $1 AND project_id = $2", [elementId, projectId]);
}

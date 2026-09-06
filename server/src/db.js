import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");
mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(join(dataDir, "metrados.sqlite"));
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nombre_obra TEXT NOT NULL DEFAULT '',
    cliente TEXT NOT NULL DEFAULT '',
    ubicacion TEXT NOT NULL DEFAULT '',
    responsable TEXT NOT NULL DEFAULT '',
    fecha TEXT NOT NULL DEFAULT '',
    logo_data_url TEXT,
    prices_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS elements (
    id TEXT PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    module TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    concrete_m3 REAL NOT NULL,
    steel_kg REAL NOT NULL,
    formwork_m2 REAL NOT NULL,
    lines_json TEXT NOT NULL,
    inputs_summary_json TEXT NOT NULL
  );
`);

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
    createdAt: row.created_at,
    concreteM3: row.concrete_m3,
    steelKg: row.steel_kg,
    formworkM2: row.formwork_m2,
    lines: JSON.parse(row.lines_json),
    inputsSummary: JSON.parse(row.inputs_summary_json),
  };
}

function createProjectRow(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const info = db
    .prepare(
      "INSERT INTO projects (user_id, nombre_obra, cliente, ubicacion, responsable, fecha, prices_json, created_at) VALUES (?, '', '', '', '', ?, '{}', ?)"
    )
    .run(userId, today, Date.now());
  return Number(info.lastInsertRowid);
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

export function createUser(email, password) {
  const { salt, hash } = hashPassword(password);
  const info = db
    .prepare("INSERT INTO users (email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?)")
    .run(email, hash, salt, Date.now());
  const userId = Number(info.lastInsertRowid);
  createProjectRow(userId);
  return { id: userId, email };
}

export function findUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

export function getUserById(id) {
  return db.prepare("SELECT id, email, created_at FROM users WHERE id = ?").get(id);
}

export function verifyUserPassword(user, password) {
  return verifyPassword(password, user.password_salt, user.password_hash);
}

// --- Sesiones ---

export function createSession(userId) {
  const id = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  db.prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
    id,
    userId,
    expiresAt,
    Date.now()
  );
  return { id, expiresAt };
}

export function getSession(sessionId) {
  const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(sessionId);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
    return null;
  }
  return row;
}

export function deleteSession(sessionId) {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

// --- Proyectos (uno por usuario) ---

export function getOrCreateProjectForUser(userId) {
  const existing = db.prepare("SELECT id FROM projects WHERE user_id = ? ORDER BY id ASC LIMIT 1").get(userId);
  if (existing) return existing.id;
  return createProjectRow(userId);
}

export function getProject(projectId) {
  const row = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
  if (!row) return null;
  const elementRows = db
    .prepare("SELECT * FROM elements WHERE project_id = ? ORDER BY created_at DESC")
    .all(projectId);
  return {
    projectInfo: rowToProjectInfo(row),
    prices: JSON.parse(row.prices_json),
    elements: elementRows.map(rowToElement),
  };
}

export function updateProjectInfo(projectId, fields) {
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
  for (const [key, column] of Object.entries(columnMap)) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      setClauses.push(`${column} = ?`);
      values.push(fields[key] ?? null);
    }
  }
  if (setClauses.length === 0) return;
  values.push(projectId);
  db.prepare(`UPDATE projects SET ${setClauses.join(", ")} WHERE id = ?`).run(...values);
}

export function setPrices(projectId, prices) {
  db.prepare("UPDATE projects SET prices_json = ? WHERE id = ?").run(JSON.stringify(prices), projectId);
}

export function addElement(projectId, element) {
  db.prepare(
    `INSERT INTO elements (id, project_id, module, name, created_at, concrete_m3, steel_kg, formwork_m2, lines_json, inputs_summary_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    element.id,
    projectId,
    element.module,
    element.name,
    element.createdAt,
    element.concreteM3,
    element.steelKg,
    element.formworkM2,
    JSON.stringify(element.lines),
    JSON.stringify(element.inputsSummary)
  );
  return element;
}

export function removeElement(projectId, elementId) {
  db.prepare("DELETE FROM elements WHERE id = ? AND project_id = ?").run(elementId, projectId);
}

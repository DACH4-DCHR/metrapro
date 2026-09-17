CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  price_catalog_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS price_catalog_json JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Prueba gratuita de 14 días desde el registro; is_paid se activa a mano
-- (transferencia/Yape/Plin fuera de la app) vía POST /api/admin/activate.
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paid_at BIGINT;

-- Evitan reenviar el mismo correo de aviso de prueba una y otra vez cada vez
-- que corre el chequeo periódico (ver trialReminders.js) — una vez marcado,
-- ese correo puntual no se vuelve a mandar.
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_reminder_sent_at BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_expired_email_sent_at BIGINT;

-- Migración única: las cuentas creadas ANTES de este sistema de prueba (donde
-- trial_ends_at todavía es NULL — la señal de que nunca pasaron por esta
-- migración) se activan automáticamente para no cortarles el acceso
-- retroactivamente. Después de esta pasada trial_ends_at nunca vuelve a ser
-- NULL (createUser siempre lo fija al crear la cuenta), así que esto no se
-- repite en cuentas nuevas ni en próximos arranques del servidor.
UPDATE users SET is_paid = true, paid_at = created_at WHERE trial_ends_at IS NULL;
UPDATE users SET trial_ends_at = created_at + 1209600000 WHERE trial_ends_at IS NULL;

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

-- Token de un solo uso para "olvidé mi contraseña", enviado por correo.
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nombre_obra TEXT NOT NULL DEFAULT '',
  cliente TEXT NOT NULL DEFAULT '',
  ubicacion TEXT NOT NULL DEFAULT '',
  responsable TEXT NOT NULL DEFAULT '',
  fecha TEXT NOT NULL DEFAULT '',
  logo_data_url TEXT,
  prices_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  materiales_custom_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  presupuesto_custom_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at BIGINT NOT NULL
);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS materiales_custom_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS presupuesto_custom_json JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS elements (
  id TEXT PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  concrete_m3 DOUBLE PRECISION NOT NULL,
  steel_kg DOUBLE PRECISION NOT NULL,
  formwork_m2 DOUBLE PRECISION NOT NULL,
  lines_json JSONB NOT NULL,
  inputs_summary_json JSONB NOT NULL,
  steel_by_diameter_json JSONB NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE elements ADD COLUMN IF NOT EXISTS steel_by_diameter_json JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_elements_project_id ON elements(project_id);

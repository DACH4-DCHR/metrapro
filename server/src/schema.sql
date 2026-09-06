CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

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
  created_at BIGINT NOT NULL
);

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
  inputs_summary_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_elements_project_id ON elements(project_id);

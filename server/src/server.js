import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {
  initSchema,
  createUser,
  findUserByEmail,
  getUserById,
  verifyUserPassword,
  createSession,
  getSession,
  deleteSession,
  getOrCreateProjectForUser,
  getProject,
  updateProjectInfo,
  setPrices,
  addElement,
  removeElement,
} from "./db.js";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

const SESSION_COOKIE = "mp_sid";
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setSessionCookie(res, sessionId) {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_MS,
    path: "/",
  });
}

async function requireAuth(req, res, next) {
  const sid = req.cookies?.[SESSION_COOKIE];
  if (!sid) return res.status(401).json({ error: "No autenticado" });
  const session = await getSession(sid);
  if (!session) return res.status(401).json({ error: "Sesión expirada, vuelve a iniciar sesión" });
  req.userId = session.user_id;
  next();
}

// --- Autenticación ---

app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Correo electrónico inválido" });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
  }
  if (await findUserByEmail(email)) {
    return res.status(409).json({ error: "Ya existe una cuenta con ese correo" });
  }
  const user = await createUser(email, password);
  const session = await createSession(user.id);
  setSessionCookie(res, session.id);
  res.status(201).json({ id: user.id, email: user.email });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = typeof email === "string" ? await findUserByEmail(email) : null;
  if (!user || typeof password !== "string" || !verifyUserPassword(user, password)) {
    return res.status(401).json({ error: "Correo o contraseña incorrectos" });
  }
  const session = await createSession(user.id);
  setSessionCookie(res, session.id);
  res.json({ id: user.id, email: user.email });
});

app.post("/api/auth/logout", async (req, res) => {
  const sid = req.cookies?.[SESSION_COOKIE];
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  const user = await getUserById(req.userId);
  if (!user) return res.status(401).json({ error: "No autenticado" });
  res.json({ id: user.id, email: user.email });
});

// --- Proyecto (uno por usuario autenticado) ---

app.use("/api/project", requireAuth);

app.get("/api/project", async (req, res) => {
  const id = await getOrCreateProjectForUser(req.userId);
  res.json(await getProject(id));
});

app.patch("/api/project", async (req, res) => {
  const id = await getOrCreateProjectForUser(req.userId);
  await updateProjectInfo(id, req.body ?? {});
  res.json(await getProject(id));
});

app.put("/api/project/prices", async (req, res) => {
  const id = await getOrCreateProjectForUser(req.userId);
  await setPrices(id, req.body ?? {});
  res.json(await getProject(id));
});

app.post("/api/project/elements", async (req, res) => {
  const id = await getOrCreateProjectForUser(req.userId);
  const el = req.body;
  if (!el || !el.id || !el.module || !el.name) {
    return res.status(400).json({ error: "Elemento inválido" });
  }
  await addElement(id, el);
  res.status(201).json(await getProject(id));
});

app.delete("/api/project/elements/:elementId", async (req, res) => {
  const id = await getOrCreateProjectForUser(req.userId);
  await removeElement(id, req.params.elementId);
  res.json(await getProject(id));
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

const PORT = process.env.PORT || 4000;

initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`MetraPro API escuchando en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("No se pudo inicializar el esquema de la base de datos:", err);
    process.exit(1);
  });

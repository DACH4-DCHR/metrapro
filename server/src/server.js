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
  listProjectsForUser,
  createProjectForUser,
  getProjectOwnerId,
  deleteProjectRow,
  getProject,
  updateProjectInfo,
  setPrices,
  mergeIntoPriceCatalog,
  setMaterialesCustom,
  setPresupuestoCustom,
  addElement,
  removeElement,
} from "./db.js";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const app = express();
// CORS_ORIGIN: en producción, la URL exacta del frontend (ej. https://mi-app.vercel.app).
// Sin ella, se refleja cualquier origen (cómodo en desarrollo, pero menos estricto).
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

const SESSION_COOKIE = "mp_sid";
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setSessionCookie(res, sessionId) {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    // "none" es obligatorio para que la cookie viaje cuando el frontend vive en un
    // dominio distinto al backend (ej. Vercel + Railway); requiere secure:true, que
    // a su vez requiere HTTPS (ambas plataformas lo dan por defecto). En desarrollo
    // local (mismo origen vía el proxy de Vite) se usa "lax" sin HTTPS.
    sameSite: IS_PRODUCTION ? "none" : "lax",
    secure: IS_PRODUCTION,
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
  res.clearCookie(SESSION_COOKIE, { path: "/", sameSite: IS_PRODUCTION ? "none" : "lax", secure: IS_PRODUCTION });
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  const user = await getUserById(req.userId);
  if (!user) return res.status(401).json({ error: "No autenticado" });
  res.json({ id: user.id, email: user.email });
});

// --- Proyectos (varios por usuario autenticado) ---

app.use("/api/projects", requireAuth);

app.get("/api/projects", async (req, res) => {
  res.json(await listProjectsForUser(req.userId));
});

app.post("/api/projects", async (req, res) => {
  const id = await createProjectForUser(req.userId);
  res.status(201).json(await getProject(id));
});

// Verifica que :id sea un proyecto del usuario autenticado antes de dejar pasar
// cualquier lectura/escritura — sin esto, cambiar de "un proyecto por usuario" a
// "varios por id" abriría la puerta a leer/modificar proyectos de otra cuenta
// con solo adivinar o incrementar el id.
async function requireProjectOwnership(req, res, next) {
  const projectId = Number(req.params.id);
  if (!Number.isInteger(projectId)) {
    return res.status(400).json({ error: "Proyecto inválido" });
  }
  const ownerId = await getProjectOwnerId(projectId);
  if (ownerId !== req.userId) {
    return res.status(404).json({ error: "Proyecto no encontrado" });
  }
  req.projectId = projectId;
  next();
}

app.get("/api/projects/:id", requireProjectOwnership, async (req, res) => {
  res.json(await getProject(req.projectId));
});

app.patch("/api/projects/:id", requireProjectOwnership, async (req, res) => {
  await updateProjectInfo(req.projectId, req.body ?? {});
  res.json(await getProject(req.projectId));
});

app.delete("/api/projects/:id", requireProjectOwnership, async (req, res) => {
  await deleteProjectRow(req.projectId);
  // Nunca dejar al usuario sin ningún proyecto: si borró el último, se le crea
  // uno nuevo en blanco automáticamente (mismo comportamiento que tenía al
  // registrarse, antes de que existiera el selector de proyectos).
  let list = await listProjectsForUser(req.userId);
  if (list.length === 0) {
    await createProjectForUser(req.userId);
    list = await listProjectsForUser(req.userId);
  }
  res.json(list);
});

app.put("/api/projects/:id/prices", requireProjectOwnership, async (req, res) => {
  const prices = req.body ?? {};
  await setPrices(req.projectId, prices);
  // Cada precio que se guarda en un proyecto también queda en el catálogo del
  // usuario, para que el próximo proyecto que cree arranque con esos precios.
  await mergeIntoPriceCatalog(req.userId, prices);
  res.json(await getProject(req.projectId));
});

app.put("/api/projects/:id/materiales-custom", requireProjectOwnership, async (req, res) => {
  await setMaterialesCustom(req.projectId, Array.isArray(req.body) ? req.body : []);
  res.json(await getProject(req.projectId));
});

app.put("/api/projects/:id/presupuesto-custom", requireProjectOwnership, async (req, res) => {
  await setPresupuestoCustom(req.projectId, Array.isArray(req.body) ? req.body : []);
  res.json(await getProject(req.projectId));
});

app.post("/api/projects/:id/elements", requireProjectOwnership, async (req, res) => {
  const el = req.body;
  if (!el || !el.id || !el.module || !el.name) {
    return res.status(400).json({ error: "Elemento inválido" });
  }
  await addElement(req.projectId, el);
  res.status(201).json(await getProject(req.projectId));
});

app.delete("/api/projects/:id/elements/:elementId", requireProjectOwnership, async (req, res) => {
  await removeElement(req.projectId, req.params.elementId);
  res.json(await getProject(req.projectId));
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

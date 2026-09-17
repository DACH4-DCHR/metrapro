import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
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
  hasFullAccess,
  accessFieldsFor,
  setUserPaid,
  listUsersWithAccessStatus,
  deleteSessionsForUser,
  createPasswordReset,
  getPasswordReset,
  deletePasswordReset,
  updateUserPassword,
} from "./db.js";
import { sendPasswordResetEmail } from "./mail.js";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const app = express();
// Railway pone la app detrás de un proxy — sin esto, express-rate-limit vería
// la IP del proxy en vez de la del cliente y limitaría a todos los usuarios
// juntos como si fueran uno solo.
app.set("trust proxy", 1);
app.use(helmet());
// CORS_ORIGIN: en producción, la URL exacta del frontend (ej. https://mi-app.vercel.app).
// Sin ella, se refleja cualquier origen (cómodo en desarrollo, pero menos estricto).
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

// Límite de intentos en autenticación: sin esto, alguien podría probar miles
// de contraseñas por segundo contra una cuenta (fuerza bruta) o registrar
// cuentas falsas en masa. Login y registro tienen cada uno su propio cupo
// (no comparten instancia) para que agotar uno no bloquee al usuario del otro
// — ej. alguien que falla su contraseña varias veces todavía puede registrar
// una cuenta nueva.
function createAuthLimiter(message) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });
}
const loginLimiter = createAuthLimiter("Demasiados intentos de inicio de sesión. Espera unos minutos e inténtalo de nuevo.");
const registerLimiter = createAuthLimiter("Demasiados intentos de registro. Espera unos minutos e inténtalo de nuevo.");
const forgotPasswordLimiter = createAuthLimiter(
  "Demasiadas solicitudes de recuperación. Espera unos minutos e inténtalo de nuevo."
);

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
  const user = await getUserById(session.user_id);
  if (!user) return res.status(401).json({ error: "No autenticado" });
  req.userId = user.id;
  req.user = user;
  next();
}

const TRIAL_EXPIRED_MESSAGE =
  "Tu período de prueba de 14 días terminó. Tu cuenta quedó en modo de solo lectura — contáctanos para activarla.";

// Deja pasar lecturas siempre; bloquea creación/edición si la prueba venció y
// la cuenta no está activada (pagada). Se aplica solo a las rutas que
// modifican datos, nunca a las de solo consulta.
function requireFullAccess(req, res, next) {
  if (!hasFullAccess(req.user)) {
    return res.status(403).json({ error: TRIAL_EXPIRED_MESSAGE, code: "TRIAL_EXPIRED" });
  }
  next();
}

// --- Autenticación ---

app.use("/api/auth/register", registerLimiter);
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/forgot-password", forgotPasswordLimiter);

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
  const fullUser = await getUserById(user.id);
  res.status(201).json({ id: user.id, email: user.email, ...accessFieldsFor(fullUser) });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = typeof email === "string" ? await findUserByEmail(email) : null;
  if (!user || typeof password !== "string" || !verifyUserPassword(user, password)) {
    return res.status(401).json({ error: "Correo o contraseña incorrectos" });
  }
  const session = await createSession(user.id);
  setSessionCookie(res, session.id);
  res.json({ id: user.id, email: user.email, ...accessFieldsFor(user) });
});

app.post("/api/auth/logout", async (req, res) => {
  const sid = req.cookies?.[SESSION_COOKIE];
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/", sameSite: IS_PRODUCTION ? "none" : "lax", secure: IS_PRODUCTION });
  res.json({ ok: true });
});

// El frontend vive en un origen distinto (Vercel) — se arma el enlace del
// correo con esa URL, la misma que ya se usa para restringir CORS.
const FRONTEND_URL = process.env.CORS_ORIGIN || "http://localhost:5173";

// Responde igual exista o no la cuenta (nunca revela si un correo está
// registrado) — evita que alguien use este endpoint para averiguar qué
// correos tienen cuenta en MetraPro.
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body ?? {};
  if (typeof email === "string" && EMAIL_RE.test(email)) {
    const user = await findUserByEmail(email);
    if (user) {
      const reset = await createPasswordReset(user.id);
      const link = `${FRONTEND_URL}/reset-password?token=${reset.id}`;
      // Sin esperar: si el proveedor de correo está lento, el usuario no debe
      // quedarse mirando un spinner varios segundos por eso.
      sendPasswordResetEmail(user.email, link).catch((err) => {
        console.error("No se pudo enviar el correo de recuperación:", err);
      });
    }
  }
  res.json({ ok: true });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { token, password } = req.body ?? {};
  if (typeof token !== "string" || typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
  }
  const reset = await getPasswordReset(token);
  if (!reset) {
    return res.status(400).json({ error: "El enlace de recuperación es inválido o venció. Solicita uno nuevo." });
  }
  await updateUserPassword(reset.user_id, password);
  await deletePasswordReset(token);
  // Cierra cualquier sesión abierta con la contraseña anterior — si alguien más
  // tenía acceso, esto lo saca.
  await deleteSessionsForUser(reset.user_id);
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  res.json({ id: req.user.id, email: req.user.email, ...accessFieldsFor(req.user) });
});

// --- Proyectos (varios por usuario autenticado) ---

app.use("/api/projects", requireAuth);

app.get("/api/projects", async (req, res) => {
  res.json(await listProjectsForUser(req.userId));
});

app.post("/api/projects", requireFullAccess, async (req, res) => {
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

app.patch("/api/projects/:id", requireProjectOwnership, requireFullAccess, async (req, res) => {
  await updateProjectInfo(req.projectId, req.body ?? {});
  res.json(await getProject(req.projectId));
});

app.delete("/api/projects/:id", requireProjectOwnership, requireFullAccess, async (req, res) => {
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

app.put("/api/projects/:id/prices", requireProjectOwnership, requireFullAccess, async (req, res) => {
  const prices = req.body ?? {};
  await setPrices(req.projectId, prices);
  // Cada precio que se guarda en un proyecto también queda en el catálogo del
  // usuario, para que el próximo proyecto que cree arranque con esos precios.
  await mergeIntoPriceCatalog(req.userId, prices);
  res.json(await getProject(req.projectId));
});

app.put("/api/projects/:id/materiales-custom", requireProjectOwnership, requireFullAccess, async (req, res) => {
  await setMaterialesCustom(req.projectId, Array.isArray(req.body) ? req.body : []);
  res.json(await getProject(req.projectId));
});

app.put("/api/projects/:id/presupuesto-custom", requireProjectOwnership, requireFullAccess, async (req, res) => {
  await setPresupuestoCustom(req.projectId, Array.isArray(req.body) ? req.body : []);
  res.json(await getProject(req.projectId));
});

app.post("/api/projects/:id/elements", requireProjectOwnership, requireFullAccess, async (req, res) => {
  const el = req.body;
  if (!el || !el.id || !el.module || !el.name) {
    return res.status(400).json({ error: "Elemento inválido" });
  }
  await addElement(req.projectId, el);
  res.status(201).json(await getProject(req.projectId));
});

app.delete("/api/projects/:id/elements/:elementId", requireProjectOwnership, requireFullAccess, async (req, res) => {
  await removeElement(req.projectId, req.params.elementId);
  res.json(await getProject(req.projectId));
});

// --- Administración (activar/desactivar cuentas tras recibir el pago fuera de
// la app — transferencia/Yape/Plin). No usa sesión de usuario: se protege con
// una llave separada (ADMIN_SECRET) que solo conoce el dueño de la app. Si esa
// variable no está configurada, las rutas quedan cerradas por defecto.
function requireAdminSecret(req, res, next) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return res.status(503).json({ error: "Administración no configurada" });
  if (req.get("x-admin-secret") !== secret) return res.status(403).json({ error: "No autorizado" });
  next();
}

app.get("/api/admin/users", requireAdminSecret, async (req, res) => {
  res.json(await listUsersWithAccessStatus());
});

app.post("/api/admin/activate", requireAdminSecret, async (req, res) => {
  const { email } = req.body ?? {};
  if (typeof email !== "string") return res.status(400).json({ error: "Correo inválido" });
  const user = await setUserPaid(email, true);
  if (!user) return res.status(404).json({ error: "No existe una cuenta con ese correo" });
  res.json({ ok: true, user });
});

app.post("/api/admin/deactivate", requireAdminSecret, async (req, res) => {
  const { email } = req.body ?? {};
  if (typeof email !== "string") return res.status(400).json({ error: "Correo inválido" });
  const user = await setUserPaid(email, false);
  if (!user) return res.status(404).json({ error: "No existe una cuenta con ese correo" });
  res.json({ ok: true, user });
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

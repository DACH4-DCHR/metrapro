# MetraPro — Metrados Estructurales

Aplicación web para el metrado automático de elementos estructurales de concreto armado: **losas aligeradas**, **vigas** y **escaleras**. Pensada para ingenieros civiles, arquitectos, residentes de obra y metradores.

## Estado actual

- **Losa Aligerada**: geometría, tipo de ladrillo (12/15/20 cm o personalizado), volumen de concreto (nervios + capa de compresión), N° y peso de ladrillos, acero estimado, encofrado.
- **Vigas**: sección rectangular / T invertida / personalizada, acero longitudinal y estribos, encofrado.
- **Escaleras**: un tramo, dos tramos, L o U (con descanso), desarrollo horizontal, longitud inclinada, volumen, acero principal y de distribución.
- Cada módulo permite metrar **varios elementos** (varias losas, grupos de vigas, escaleras) con lista y subtotal propio.
- **Dashboard**: datos del proyecto (obra, cliente, ubicación, responsable, fecha, logo), indicadores (m³ concreto, kg acero, m² encofrado, N° elementos), listado de elementos guardados, cuadro de metrados consolidado y **presupuesto referencial** con precios unitarios editables.
- **Reportes**: PDF profesional (logo, datos del proyecto, metrados, presupuesto, firma) y Excel multi-hoja (Resumen, Metrados, Presupuesto, Elementos).
- **Backend real**: API REST (Node/Express) + base de datos **PostgreSQL**. El proyecto y los elementos calculados se guardan en el servidor, no en el navegador — persisten entre dispositivos que apunten al mismo backend.
- **Usuarios**: registro e inicio de sesión con email/contraseña. Cada cuenta tiene su propio proyecto, completamente aislado de los demás usuarios. Sesión mantenida por cookie httpOnly (no hay tokens expuestos a JavaScript).
- **PWA instalable y modo offline completo**: la app se instala en Android/PC (Service Worker + manifest). Puedes seguir metrando sin señal — los cambios (datos del proyecto, elementos, precios) se guardan localmente y se sincronizan solos apenas vuelve la conexión, sin perder nada. El sidebar muestra "Sin conexión — N cambios pendientes" mientras eso ocurre. La sesión de usuario también funciona offline una vez que iniciaste sesión al menos una vez con internet.

## Próximas fases (no incluidas aún)

- Roles/permisos dentro de un mismo proyecto (ej. solo-lectura vs. edición) — hoy todo usuario autenticado tiene control total sobre su propio proyecto.
- Varios proyectos por usuario con pantalla de selección (hoy cada cuenta tiene exactamente uno).
- Base de datos editable de materiales (más allá de los precios referenciales actuales).
- Preparación para integración BIM.

## Desarrollo

Este proyecto tiene dos partes que deben correr en paralelo: el **backend** (API + base de datos) y el **frontend** (React).

**1. Backend** (en una terminal, desde `server/`):

Necesitas una base de datos PostgreSQL accesible (local o en la nube). Copia `server/.env.example` a `server/.env` y completa las credenciales:

```bash
cd server
cp .env.example .env   # edita .env con tus credenciales de PostgreSQL
npm install
npm run dev
```

Levanta la API en `http://localhost:4000` y crea automáticamente las tablas (`users`, `sessions`, `projects`, `elements`) en el primer arranque si no existen.

**Instalar PostgreSQL en Windows** (si no tienes uno ya):

```bash
winget install --id PostgreSQL.PostgreSQL.17
```

Luego crea un usuario y base de datos dedicados para la app (reemplaza la contraseña):

```sql
CREATE ROLE metrapro_app WITH LOGIN PASSWORD 'tu-password';
CREATE DATABASE metrapro OWNER metrapro_app;
```

**2. Frontend** (en otra terminal, desde la raíz del proyecto):

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. En desarrollo, Vite redirige las llamadas a `/api/*` hacia `http://localhost:4000` automáticamente (ver `vite.config.ts`).

Si el backend no está corriendo, el frontend muestra un aviso claro con un botón "Reintentar" en vez de fallar en silencio.

La primera vez que abras la app te pedirá crear una cuenta (correo + contraseña, mínimo 8 caracteres). Cada cuenta empieza con su propio proyecto vacío.

**Para probar la instalación como PWA** (el Service Worker no corre en `npm run dev`, solo en producción):

```bash
npm run build
npm run preview
```

## Stack

- **Frontend**: React + TypeScript + Vite, Tailwind CSS v4, React Router, Zustand, lucide-react, jsPDF (reporte PDF, carga diferida), `vite-plugin-pwa` (Service Worker + manifest).
- **Backend**: Node.js + Express, PostgreSQL (vía `pg`), contraseñas con `scrypt` + sal, sesiones por cookie httpOnly.

## Cómo funciona la sincronización offline

- Cada cambio (datos del proyecto, elementos, precios) se aplica de inmediato en pantalla y se intenta guardar en el servidor.
- Si no hay conexión (o el servidor no responde), el cambio se guarda en una cola local (`localStorage`) en vez de perderse.
- Al volver la conexión —evento `online` del navegador, o un chequeo cada 20 s mientras haya pendientes— la cola se reenvía automáticamente al servidor.
- Al abrir la app sin conexión, se muestra la última copia local del proyecto en vez de una pantalla de error, siempre que ya se haya cargado exitosamente al menos una vez antes.

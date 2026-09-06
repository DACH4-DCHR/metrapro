# MetraPro — Metrados Estructurales

Aplicación web para el metrado automático de elementos estructurales de concreto armado: **losas aligeradas**, **vigas** y **escaleras**. Pensada para ingenieros civiles, arquitectos, residentes de obra y metradores.

## Estado actual

- **Losa Aligerada**: geometría, tipo de ladrillo (12/15/20 cm o personalizado), volumen de concreto (nervios + capa de compresión), N° y peso de ladrillos, acero estimado, encofrado.
- **Vigas**: sección rectangular / T invertida / personalizada, acero longitudinal y estribos, encofrado.
- **Escaleras**: un tramo, dos tramos, L o U (con descanso), desarrollo horizontal, longitud inclinada, volumen, acero principal y de distribución.
- Cada módulo permite metrar **varios elementos** (varias losas, grupos de vigas, escaleras) con lista y subtotal propio.
- **Dashboard**: datos del proyecto (obra, cliente, ubicación, responsable, fecha, logo), indicadores (m³ concreto, kg acero, m² encofrado, N° elementos), listado de elementos guardados, cuadro de metrados consolidado y **presupuesto referencial** con precios unitarios editables.
- **Reportes**: PDF profesional (logo, datos del proyecto, metrados, presupuesto, firma) y Excel multi-hoja (Resumen, Metrados, Presupuesto, Elementos).
- **Backend real**: API REST (Node/Express) + base de datos SQLite. El proyecto y los elementos calculados se guardan en el servidor, no en el navegador — persisten entre dispositivos que apunten al mismo backend.
- **Usuarios**: registro e inicio de sesión con email/contraseña. Cada cuenta tiene su propio proyecto, completamente aislado de los demás usuarios. Sesión mantenida por cookie httpOnly (no hay tokens expuestos a JavaScript).

## Próximas fases (no incluidas aún)

- Roles/permisos dentro de un mismo proyecto (ej. solo-lectura vs. edición) — hoy todo usuario autenticado tiene control total sobre su propio proyecto.
- Varios proyectos por usuario con pantalla de selección (hoy cada cuenta tiene exactamente uno).
- Migración a PostgreSQL para producción (el esquema SQLite actual es directamente portable).
- Modo offline real (PWA con Service Worker) e instalación en Android.
- Base de datos editable de materiales (más allá de los precios referenciales actuales).
- Preparación para integración BIM.

## Desarrollo

Este proyecto tiene dos partes que deben correr en paralelo: el **backend** (API + base de datos) y el **frontend** (React).

**1. Backend** (en una terminal, desde `server/`):

```bash
cd server
npm install
npm run dev
```

Levanta la API en `http://localhost:4000` y crea automáticamente `server/data/metrados.sqlite` en el primer arranque.

**2. Frontend** (en otra terminal, desde la raíz del proyecto):

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. En desarrollo, Vite redirige las llamadas a `/api/*` hacia `http://localhost:4000` automáticamente (ver `vite.config.ts`).

Si el backend no está corriendo, el frontend muestra un aviso claro con un botón "Reintentar" en vez de fallar en silencio.

La primera vez que abras la app te pedirá crear una cuenta (correo + contraseña, mínimo 8 caracteres). Cada cuenta empieza con su propio proyecto vacío.

## Stack

- **Frontend**: React + TypeScript + Vite, Tailwind CSS v4, React Router, Zustand, lucide-react, jsPDF (reporte PDF, carga diferida).
- **Backend**: Node.js + Express, `node:sqlite` (módulo nativo de Node, sin dependencias binarias externas), contraseñas con `scrypt` + sal, sesiones por cookie httpOnly.

# MetraPro — Metrados Estructurales

Aplicación web para el metrado automático de elementos estructurales de concreto armado: **losas aligeradas**, **vigas** y **escaleras**. Pensada para ingenieros civiles, arquitectos, residentes de obra y metradores.

## Estado actual (Fase 1 — MVP)

Esta primera fase cubre el motor de cálculo y la interfaz de los 3 módulos, corriendo 100% en el navegador (sin backend todavía):

- **Losa Aligerada**: geometría, tipo de ladrillo (12/15/20 cm o personalizado), volumen de concreto (nervios + capa de compresión), N° y peso de ladrillos, acero estimado, encofrado.
- **Vigas**: sección rectangular / T invertida / personalizada, acero longitudinal y estribos, encofrado.
- **Escaleras**: un tramo, dos tramos, L o U (con descanso), desarrollo horizontal, longitud inclinada, volumen, acero principal y de distribución.
- **Dashboard**: datos del proyecto (obra, cliente, ubicación, responsable, fecha), indicadores (m³ concreto, kg acero, m² encofrado, N° elementos), listado de elementos guardados y cuadro de metrados consolidado.
- **Exportación**: CSV (abre en Excel) e impresión/PDF vía el diálogo de impresión del navegador.
- Los proyectos y elementos calculados se guardan localmente en el navegador (localStorage) — no se pierden al recargar.

## Próximas fases (no incluidas aún)

- Backend (Node/Express) + base de datos (PostgreSQL) para proyectos multiusuario.
- Sistema de usuarios y permisos.
- Reportes PDF/Excel con formato profesional (logo, firma, membrete).
- Modo offline real (PWA con Service Worker) e instalación en Android.
- Base de datos editable de materiales (precios, presupuesto referencial).
- Preparación para integración BIM.

## Desarrollo

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

## Stack

React + TypeScript + Vite, Tailwind CSS v4, React Router, Zustand (con persistencia local), lucide-react para iconografía.

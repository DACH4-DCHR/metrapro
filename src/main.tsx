import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Si una pestaña queda abierta mientras se publica un despliegue nuevo, su
// JavaScript en memoria sigue siendo el viejo — cuando intenta cargar un
// "chunk" (ej. el generador de PDF, que se carga bajo demanda) por su nombre
// de archivo con hash antiguo, ese archivo ya no existe en el servidor y la
// carga falla en silencio. Vite dispara este evento justo para ese caso:
// recargar la página trae el HTML/JS nuevos, con las referencias correctas.
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

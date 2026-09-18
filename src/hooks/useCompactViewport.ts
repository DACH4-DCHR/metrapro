import { useEffect, useState } from "react";

const QUERY = "(max-height: 520px)";

// Detecta pantallas de poca ALTURA — típico de un celular en horizontal.
// Los breakpoints de Tailwind (sm/md/lg) son por ancho, y un celular acostado
// tiene ancho de sobra (a veces más que un monitor angosto), así que nunca
// lo distinguen de una pantalla grande. Esto sí mira lo que realmente falta:
// alto disponible, sin importar cuán ancho sea.
export function useCompactViewport(): boolean {
  const [compact, setCompact] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setCompact(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return compact;
}

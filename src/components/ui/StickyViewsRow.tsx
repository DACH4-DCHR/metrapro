import type { ReactNode } from "react";

interface StickyViewsRowProps {
  children: ReactNode;
}

// Franja de vistas (2D + 3D) fija en la parte superior del contenido — se mantiene
// visible mientras se completa el formulario o se revisan los resultados más abajo.
// El offset "top" coincide con la altura real de PageHeader en cada tamaño de
// pantalla (88px en sm+, 132px cuando el encabezado se apila en móvil). Siempre en
// 2 columnas (incluso en móvil) para que la franja no ocupe casi toda la pantalla
// apilando las vistas una debajo de otra.
export function StickyViewsRow({ children }: StickyViewsRowProps) {
  return (
    <div className="sticky top-[132px] z-10 mb-6 grid grid-cols-2 gap-2 sm:top-[92px] sm:gap-4">{children}</div>
  );
}

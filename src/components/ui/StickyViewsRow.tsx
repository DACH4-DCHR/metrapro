import type { ReactNode } from "react";

interface StickyViewsRowProps {
  children: ReactNode;
}

// Franja de vistas (2D + 3D) fija en la parte superior del contenido — se mantiene
// visible mientras se completa el formulario o se revisan los resultados más abajo.
// El offset "top" toma la altura REAL de PageHeader (variable CSS que ese
// componente actualiza solo, incluida cuando se contrae/expande) en vez de un
// número fijo — antes, al variar el alto del header, quedaba un hueco o una
// superposición entre el header y esta franja. "items-start" evita que una
// vista minimizada (chica) se estire para igualar la altura de la otra si
// sigue expandida — al minimizar, la tarjeta debe desaparecer de verdad, no
// dejar un espacio en blanco reservado del tamaño de la vecina. Siempre en 2
// columnas (incluso en móvil) para que la franja no ocupe casi toda la
// pantalla apilando las vistas una debajo de otra.
export function StickyViewsRow({ children }: StickyViewsRowProps) {
  return (
    <div
      className="sticky z-10 mb-6 grid grid-cols-2 items-start gap-2 sm:gap-4"
      style={{ top: "var(--page-header-height, 92px)" }}
    >
      {children}
    </div>
  );
}

// Utilidades mínimas para dibujar líneas de cota en los diagramas técnicos SVG.

const DIM_COLOR = "#647485"; // steel-500
const TICK = 4;

export function HDim({
  x1,
  x2,
  y,
  label,
  labelBelow = false,
}: {
  x1: number;
  x2: number;
  y: number;
  label: string;
  labelBelow?: boolean;
}) {
  const mid = (x1 + x2) / 2;
  return (
    <g stroke={DIM_COLOR} strokeWidth={1} fontSize={11} fill={DIM_COLOR}>
      <line x1={x1} y1={y - TICK} x2={x1} y2={y + TICK} />
      <line x1={x2} y1={y - TICK} x2={x2} y2={y + TICK} />
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <text
        x={mid}
        y={labelBelow ? y + 14 : y - 6}
        textAnchor="middle"
        stroke="none"
        fontFamily="inherit"
      >
        {label}
      </text>
    </g>
  );
}

export function VDim({
  y1,
  y2,
  x,
  label,
  labelLeft = true,
}: {
  y1: number;
  y2: number;
  x: number;
  label: string;
  labelLeft?: boolean;
}) {
  const mid = (y1 + y2) / 2;
  return (
    <g stroke={DIM_COLOR} strokeWidth={1} fontSize={11} fill={DIM_COLOR}>
      <line x1={x - TICK} y1={y1} x2={x + TICK} y2={y1} />
      <line x1={x - TICK} y1={y2} x2={x + TICK} y2={y2} />
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <text
        x={labelLeft ? x - 8 : x + 8}
        y={mid}
        textAnchor={labelLeft ? "end" : "start"}
        dominantBaseline="middle"
        stroke="none"
        fontFamily="inherit"
      >
        {label}
      </text>
    </g>
  );
}

export const DIAGRAM_COLORS = {
  concrete: "#b3bfc9", // steel-300
  concreteStroke: "#4d5c6d", // steel-600
  arcilla: "#c17a4f",
  arcillaStroke: "#8a5433",
  tecnopor: "#eef3f7",
  tecnoporStroke: "#9fb0bd",
  rebar: "#0b1f3a", // navy-900
  stirrup: "#d98c2b", // amber-500
  dimText: DIM_COLOR,
};

export function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals).replace(/\.0+$/, "");
}

// Proyección isométrica estándar (30°) para las vistas 3D esquemáticas de acero.
// Ejes locales: x = ancho (base), z = profundidad (peralte), y = altura (hacia arriba).
const ISO_COS = Math.cos(Math.PI / 6); // ≈0.866
const ISO_SIN = Math.sin(Math.PI / 6); // 0.5

export function isoProject(x: number, z: number, y: number): { x: number; y: number } {
  return isoProjectAt(x, z, y, ISO_DEFAULT_AZIMUTH);
}

// Azimut (rotación horizontal, en grados) que reproduce la vista isométrica clásica usada
// en toda la app — equivale a mirar el elemento desde su esquina.
export const ISO_DEFAULT_AZIMUTH = 45;

const ISO_ROT_SCALE_H = Math.SQRT2 * ISO_COS;
const ISO_ROT_SCALE_V = Math.SQRT2 * ISO_SIN;

// Proyección isométrica con azimut variable: rota el plano horizontal (x,z) el ángulo
// indicado antes de proyectar, lo que permite "girar" la vista 3D alrededor del eje
// vertical sin cambiar la inclinación de la cámara. Con azimuthDeg=ISO_DEFAULT_AZIMUTH
// el resultado es idéntico a isoProject (misma vista de siempre).
export function isoProjectAt(x: number, z: number, y: number, azimuthDeg: number): Point2D {
  const theta = (azimuthDeg * Math.PI) / 180;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const xr = x * cosT - z * sinT;
  const zr = x * sinT + z * cosT;
  return { x: xr * ISO_ROT_SCALE_H, y: zr * ISO_ROT_SCALE_V - y };
}

export interface Point2D {
  x: number;
  y: number;
}

// Distribuye N barras en el perímetro de un rectángulo [0,w] x [0,h], garantizando una
// barra en cada una de las 4 esquinas (igual que el detallado real de columnas/vigas) y
// repartiendo las barras restantes uniformemente a lo largo de cada lado, en proporción a
// su longitud (método del mayor resto, para que la suma cuadre exacto con n). Con menos
// de 4 barras se reparte por simple longitud de arco, ya que no hay 4 esquinas que llenar.
export function rectPerimeterPoints(n: number, w: number, h: number): Point2D[] {
  if (n <= 0) return [];
  if (n < 4) {
    const perimeter = 2 * (w + h);
    return Array.from({ length: n }, (_, i) => {
      const s = (i * perimeter) / n;
      if (s < w) return { x: s, y: 0 };
      if (s < w + h) return { x: w, y: s - w };
      if (s < 2 * w + h) return { x: w - (s - w - h), y: h };
      return { x: 0, y: h - (s - 2 * w - h) };
    });
  }

  const corners: Point2D[] = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
  const edgeLengths = [w, h, w, h];
  const remaining = n - 4;
  const totalLen = 2 * (w + h);
  const raw = edgeLengths.map((len) => (totalLen > 0 ? (len / totalLen) * remaining : 0));
  const counts = raw.map(Math.floor);
  const assigned = counts.reduce((a, b) => a + b, 0);
  const leftover = remaining - assigned;
  const byFrac = raw.map((r, i) => ({ i, frac: r - counts[i] })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < leftover; k++) counts[byFrac[k].i]++;

  const points: Point2D[] = [];
  for (let e = 0; e < 4; e++) {
    const from = corners[e];
    const to = corners[(e + 1) % 4];
    points.push(from);
    const cnt = counts[e];
    for (let j = 1; j <= cnt; j++) {
      const t = j / (cnt + 1);
      points.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
    }
  }
  return points;
}

// Distribuye N barras uniformemente en el perímetro de un círculo de radio r, en
// coordenadas locales [0,2r] x [0,2r] (centro en (r,r)) para poder combinarse con el
// mismo encuadre que usa rectPerimeterPoints.
export function circlePerimeterPoints(n: number, r: number): Point2D[] {
  if (n <= 0) return [];
  return Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return { x: r + r * Math.cos(angle), y: r + r * Math.sin(angle) };
  });
}

export interface BarGroupLike {
  diametroId: string;
  cantidad: number;
}

export interface PositionedBar extends Point2D {
  diametroId: string;
}

// Reparte una lista ordenada de posiciones (de rectPerimeterPoints o circlePerimeterPoints)
// entre los grupos de barras en el orden en que fueron declarados, para poder pintar cada
// barra con el color/tamaño de su propio diámetro. Es solo una convención de dibujo (qué
// diámetro "cae" en qué posición) — no afecta ningún cálculo de metrado, que ya suma por
// grupo independientemente de la posición.
export function assignDiametersToPositions(positions: Point2D[], grupos: BarGroupLike[]): PositionedBar[] {
  const result: PositionedBar[] = [];
  let idx = 0;
  for (const g of grupos) {
    const cantidad = Math.max(Math.floor(g.cantidad), 0);
    for (let i = 0; i < cantidad && idx < positions.length; i++, idx++) {
      result.push({ ...positions[idx], diametroId: g.diametroId });
    }
  }
  const fallbackId = grupos.length > 0 ? grupos[grupos.length - 1].diametroId : undefined;
  while (idx < positions.length && fallbackId) {
    result.push({ ...positions[idx], diametroId: fallbackId });
    idx++;
  }
  return result;
}

// Fondo tipo "papel cuadriculado de plano" para reforzar la estética de dibujo técnico
// en los diagramas SVG. Se coloca como primer hijo del <svg>, antes de las figuras. El
// "id" debe ser único por componente de diagrama (no por instancia) para evitar colisión
// de <defs> cuando conviven varios SVG en la misma página.
export function BlueprintGrid({ width, height, id }: { width: number; height: number; id: string }) {
  return (
    <>
      <defs>
        <pattern id={id} width={20} height={20} patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e4d80" strokeWidth={0.6} opacity={0.12} />
        </pattern>
      </defs>
      <rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
    </>
  );
}

import { getRebar } from "../../lib/materials";
import type { ColumnaInput } from "../../lib/calc/columna";
import { DIAGRAM_COLORS, isoProject } from "./svgHelpers";

interface ColumnaIsometricProps {
  input: ColumnaInput;
}

const VIEW_W = 280;
const VIEW_H = 280;
const MARGIN = 22;
const NUM_ESTRIBOS_ESQUEMA = 5; // representativos, no la cantidad real (ver texto de resultados)

function totalBarras(input: ColumnaInput): number {
  return input.barrasLongitudinales.reduce((acc, g) => acc + Math.max(g.cantidad, 0), 0);
}

// Distribuye N puntos a espaciamiento uniforme por longitud de arco sobre el perímetro
// de un rectángulo [0,W] x [0,D], en unidades reales (cm), empezando en (0,0).
function rectPerimeterPointsCm(n: number, w: number, d: number): { x: number; z: number }[] {
  if (n <= 0) return [];
  const perimeter = 2 * (w + d);
  const points: { x: number; z: number }[] = [];
  for (let i = 0; i < n; i++) {
    const s = (i * perimeter) / n;
    if (s < w) points.push({ x: s, z: 0 });
    else if (s < w + d) points.push({ x: w, z: s - w });
    else if (s < 2 * w + d) points.push({ x: w - (s - w - d), z: d });
    else points.push({ x: 0, z: d - (s - 2 * w - d) });
  }
  return points;
}

function circlePerimeterPointsCm(n: number, r: number): { x: number; z: number }[] {
  if (n <= 0) return [];
  return Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return { x: r + r * Math.cos(angle), z: r + r * Math.sin(angle) };
  });
}

function ellipsePathCm(r: number, segments = 48): { x: number; z: number }[] {
  return Array.from({ length: segments }, (_, i) => {
    const angle = (2 * Math.PI * i) / segments;
    return { x: r + r * Math.cos(angle), z: r + r * Math.sin(angle) };
  });
}

export function ColumnaIsometric({ input }: ColumnaIsometricProps) {
  const n = totalBarras(input);
  const recub = input.recubrimiento;

  if (input.tipoSeccion === "rectangular" && (input.base <= 0 || input.peralte <= 0)) {
    return <p className="text-sm text-steel-500">Ingresa una base y peralte válidos para ver la vista isométrica.</p>;
  }
  if (input.tipoSeccion === "circular" && input.diametro <= 0) {
    return <p className="text-sm text-steel-500">Ingresa un diámetro válido para ver la vista isométrica.</p>;
  }
  if (n <= 0) {
    return <p className="text-sm text-steel-500">Ingresa al menos un grupo de acero longitudinal para ver la vista isométrica.</p>;
  }

  const isRect = input.tipoSeccion === "rectangular";
  const w = isRect ? input.base : input.diametro;
  const d = isRect ? input.peralte : input.diametro;
  const maxDim = Math.max(w, d);
  const hSeg = Math.min(Math.max(2.2 * maxDim, 60), 300); // altura del segmento esquemático, no a escala real

  const barPositions = isRect ? rectPerimeterPointsCm(n, w, d) : circlePerimeterPointsCm(n, w / 2);
  const ringOutlineCm = isRect
    ? [
        { x: recub, z: recub },
        { x: w - recub, z: recub },
        { x: w - recub, z: d - recub },
        { x: recub, z: d - recub },
      ]
    : ellipsePathCm(w / 2 - recub);

  // Puntos crudos (en cm, sin proyectar) que definen la caja/cilindro envolvente, para
  // calcular el encuadre (escala + offset) que ajusta todo el dibujo al viewBox.
  const boundingRaw: { x: number; z: number; y: number }[] = isRect
    ? [
        { x: 0, z: 0, y: 0 },
        { x: w, z: 0, y: 0 },
        { x: w, z: d, y: 0 },
        { x: 0, z: d, y: 0 },
        { x: 0, z: 0, y: hSeg },
        { x: w, z: 0, y: hSeg },
        { x: w, z: d, y: hSeg },
        { x: 0, z: d, y: hSeg },
      ]
    : ellipsePathCm(w / 2).flatMap((p) => [
        { x: p.x, z: p.z, y: 0 },
        { x: p.x, z: p.z, y: hSeg },
      ]);

  const projected = boundingRaw.map((p) => isoProject(p.x, p.z, p.y));
  const minX = Math.min(...projected.map((p) => p.x));
  const maxX = Math.max(...projected.map((p) => p.x));
  const minY = Math.min(...projected.map((p) => p.y));
  const maxY = Math.max(...projected.map((p) => p.y));

  const drawW = VIEW_W - 2 * MARGIN;
  const drawH = VIEW_H - 2 * MARGIN;
  const scale = Math.min(drawW / (maxX - minX || 1), drawH / (maxY - minY || 1));

  function screen(x: number, z: number, y: number): { x: number; y: number } {
    const p = isoProject(x, z, y);
    return {
      x: MARGIN + (p.x - minX) * scale,
      y: MARGIN + (p.y - minY) * scale,
    };
  }

  function pathFor(points: { x: number; z: number }[], y: number, close: boolean): string {
    const pts = points.map((p) => screen(p.x, p.z, y));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + (close ? " Z" : "");
  }

  const outlineTop = isRect
    ? [{ x: 0, z: 0 }, { x: w, z: 0 }, { x: w, z: d }, { x: 0, z: d }]
    : ellipsePathCm(w / 2);
  const stirrupLevels = Array.from({ length: NUM_ESTRIBOS_ESQUEMA }, (_, i) => (0.08 + i * (0.84 / (NUM_ESTRIBOS_ESQUEMA - 1))) * hSeg);

  const rebarLabel = input.barrasLongitudinales
    .filter((g) => g.cantidad > 0)
    .map((g) => `${g.cantidad}Ø${getRebar(g.diametroId).diameterMm}mm`)
    .join(" + ");

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[260px]"
        role="img"
        aria-label="Vista isométrica esquemática de la jaula de acero de la columna"
      >
        {/* Concreto: solo el contorno (ghost), para que se vea el acero a través */}
        <path d={pathFor(outlineTop, 0, true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.12} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        <path d={pathFor(outlineTop, hSeg, true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.08} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        {isRect ? (
          outlineTop.map((p, i) => {
            const a = screen(p.x, p.z, 0);
            const b = screen(p.x, p.z, hSeg);
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />;
          })
        ) : (
          (() => {
            const atZero = outlineTop.map((p) => screen(p.x, p.z, 0));
            let leftIdx = 0;
            let rightIdx = 0;
            atZero.forEach((p, i) => {
              if (p.x < atZero[leftIdx].x) leftIdx = i;
              if (p.x > atZero[rightIdx].x) rightIdx = i;
            });
            return [leftIdx, rightIdx].map((idx) => {
              const p = outlineTop[idx];
              const a = screen(p.x, p.z, 0);
              const b = screen(p.x, p.z, hSeg);
              return <line key={idx} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />;
            });
          })()
        )}

        {/* Estribos: aros representativos (no la cantidad real calculada) */}
        {stirrupLevels.map((y, i) => (
          <path key={i} d={pathFor(ringOutlineCm, y, true)} fill="none" stroke={DIAGRAM_COLORS.stirrup} strokeWidth={1.75} />
        ))}

        {/* Acero longitudinal: todas las barras, de piso a techo del segmento */}
        {barPositions.map((p, i) => {
          const a = screen(p.x, p.z, 0);
          const b = screen(p.x, p.z, hSeg);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.rebar} strokeWidth={2.25} strokeLinecap="round" />;
        })}
      </svg>
      <p className="mt-1 text-center text-xs text-steel-500">
        Vista isométrica esquemática de la jaula de acero (segmento representativo, no a escala real)
      </p>
      <p className="text-center text-xs text-steel-500">
        {rebarLabel || "sin barras"} · estribo Ø{getRebar(input.diametroEstribosId).diameterMm}mm
      </p>
    </div>
  );
}

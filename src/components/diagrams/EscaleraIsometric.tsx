import { getRebar } from "../../lib/materials";
import type { EscaleraInput } from "../../lib/calc/escalera";
import { DIAGRAM_COLORS, isoProject } from "./svgHelpers";

interface EscaleraIsometricProps {
  input: EscaleraInput;
}

const VIEW_W = 320;
const VIEW_H = 260;
const MARGIN = 22;

export function EscaleraIsometric({ input }: EscaleraIsometricProps) {
  const ancho = input.anchoEscalera * 100; // cm — eje x
  const espesor = input.espesorLosaInclinada; // cm
  const { numeroPeldanos, huella, contrahuella } = input.tramo1;
  const desarrollo = Math.max(numeroPeldanos - 1, 0) * huella; // cm — eje z (horizontal)
  const alturaTramo = numeroPeldanos * contrahuella; // cm — eje y (vertical)

  if (ancho <= 0 || desarrollo <= 0 || alturaTramo <= 0) {
    return <p className="text-sm text-steel-500">Ingresa datos válidos del Tramo 1 para ver la vista isométrica.</p>;
  }

  const boundingRaw = [
    { x: 0, z: 0, y: 0 },
    { x: ancho, z: 0, y: 0 },
    { x: ancho, z: desarrollo, y: alturaTramo },
    { x: 0, z: desarrollo, y: alturaTramo },
    { x: 0, z: 0, y: espesor },
    { x: ancho, z: 0, y: espesor },
    { x: ancho, z: desarrollo, y: alturaTramo + espesor },
    { x: 0, z: desarrollo, y: alturaTramo + espesor },
  ];
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
    return { x: MARGIN + (p.x - minX) * scale, y: MARGIN + (p.y - minY) * scale };
  }
  // Punto sobre la garganta a fracción t (0..1) de su desarrollo, offset vertical adicional
  function slabPoint(x: number, t: number, yOffset: number) {
    return screen(x, t * desarrollo, t * alturaTramo + yOffset);
  }
  function pathFor(points: { x: number; t: number; yOffset: number }[], close: boolean): string {
    const pts = points.map((p) => slabPoint(p.x, p.t, p.yOffset));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + (close ? " Z" : "");
  }

  const outlineTop = [
    { x: 0, t: 0, yOffset: 0 },
    { x: ancho, t: 0, yOffset: 0 },
    { x: ancho, t: 1, yOffset: 0 },
    { x: 0, t: 1, yOffset: 0 },
  ];

  const rebarPrincipal = getRebar(input.aceroPrincipalDiametroId);
  const rebarDistribucion = getRebar(input.aceroDistribucionDiametroId);

  const sepPrincipalCm = Math.max(input.aceroPrincipalSeparacion, 1);
  const principalX: number[] = [];
  for (let x = sepPrincipalCm / 2; x < ancho; x += sepPrincipalCm) principalX.push(x);

  const longitudInclinada = Math.sqrt(desarrollo ** 2 + alturaTramo ** 2);
  const sepDistribucionCm = Math.max(input.aceroDistribucionSeparacion, 1);
  const distribucionT: number[] = [];
  for (let l = sepDistribucionCm / 2; l < longitudInclinada; l += sepDistribucionCm) distribucionT.push(l / longitudInclinada);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[420px]"
        role="img"
        aria-label="Vista isométrica esquemática de la garganta de la escalera"
      >
        <path d={pathFor(outlineTop, true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.14} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        <path
          d={pathFor(
            outlineTop.map((p) => ({ ...p, yOffset: espesor })),
            true
          )}
          fill={DIAGRAM_COLORS.concrete}
          fillOpacity={0.08}
          stroke={DIAGRAM_COLORS.concreteStroke}
          strokeWidth={1}
          strokeDasharray="3 2"
        />
        {outlineTop.map((p, i) => {
          const a = slabPoint(p.x, p.t, 0);
          const b = slabPoint(p.x, p.t, espesor);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />;
        })}

        {/* Acero de distribución: cruza el ancho, perpendicular a la pendiente */}
        {distribucionT.map((t, i) => {
          const a = slabPoint(0, t, espesor / 2);
          const b = slabPoint(ancho, t, espesor / 2);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rebarDistribucion.color} strokeWidth={1.3} opacity={0.9} />;
        })}

        {/* Acero principal: corre a lo largo de la pendiente */}
        {principalX.map((x, i) => {
          const a = slabPoint(x, 0, espesor / 2);
          const b = slabPoint(x, 1, espesor / 2);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rebarPrincipal.color} strokeWidth={1.6} strokeLinecap="round" />;
        })}
      </svg>
      <p className="mt-1 text-center text-xs text-steel-500">
        Vista isométrica esquemática de la garganta (Tramo 1, sin peldaños — ver perfil 2D)
      </p>
      <p className="text-center text-xs text-steel-500">
        Principal Ø{rebarPrincipal.diameterMm}mm @ {input.aceroPrincipalSeparacion}cm · distribución Ø{rebarDistribucion.diameterMm}mm @ {input.aceroDistribucionSeparacion}cm
      </p>
    </div>
  );
}

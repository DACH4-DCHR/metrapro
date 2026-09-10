import { getRebar } from "../../lib/materials";
import type { VigaCimentacionInput } from "../../lib/calc/vigaCimentacion";
import { DIAGRAM_COLORS, isoProject } from "./svgHelpers";

interface VigaCimentacionIsometricProps {
  input: VigaCimentacionInput;
}

const VIEW_W = 300;
const VIEW_H = 240;
const MARGIN = 22;

function flattenBarras(input: VigaCimentacionInput): string[] {
  const ids: string[] = [];
  for (const g of input.barrasLongitudinales) {
    for (let i = 0; i < Math.max(g.cantidad, 0); i++) ids.push(g.diametroId);
  }
  return ids;
}

export function VigaCimentacionIsometric({ input }: VigaCimentacionIsometricProps) {
  const base = input.base;
  const altura = input.altura;
  const recub = input.recubrimiento;
  if (base <= 0 || altura <= 0) {
    return <p className="text-sm text-steel-500">Ingresa una base y altura válidas para ver la vista isométrica.</p>;
  }
  const bars = flattenBarras(input);
  if (bars.length === 0) {
    return <p className="text-sm text-steel-500">Ingresa al menos una barra longitudinal para ver la vista isométrica.</p>;
  }

  const maxDim = Math.max(base, altura);
  const lSeg = Math.min(Math.max(3.2 * maxDim, 90), 360);

  const bottomCount = Math.ceil(bars.length / 2);
  const bottomIds = bars.slice(0, bottomCount);
  const topIds = bars.slice(bottomCount);
  function rowZ(ids: string[]): number[] {
    if (ids.length === 0) return [];
    const left = recub;
    const right = base - recub;
    return ids.map((_, i) => (ids.length > 1 ? left + (i * (right - left)) / (ids.length - 1) : (left + right) / 2));
  }
  const bottomPos = rowZ(bottomIds).map((z, i) => ({ z, y: altura - recub, diametroId: bottomIds[i] }));
  const topPos = rowZ(topIds).map((z, i) => ({ z, y: recub, diametroId: topIds[i] }));
  const barPositions = [...bottomPos, ...topPos];

  const boundingRaw = [
    { x: 0, z: 0, y: 0 },
    { x: lSeg, z: 0, y: 0 },
    { x: lSeg, z: base, y: 0 },
    { x: 0, z: base, y: 0 },
    { x: 0, z: 0, y: altura },
    { x: lSeg, z: 0, y: altura },
    { x: lSeg, z: base, y: altura },
    { x: 0, z: base, y: altura },
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
  function pathFor(points: { z: number; y: number }[], x: number, close: boolean): string {
    const pts = points.map((p) => screen(x, p.z, p.y));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + (close ? " Z" : "");
  }

  const outline = [
    { z: 0, y: 0 },
    { z: base, y: 0 },
    { z: base, y: altura },
    { z: 0, y: altura },
  ];
  const ringOutline = [
    { z: recub, y: recub },
    { z: base - recub, y: recub },
    { z: base - recub, y: altura - recub },
    { z: recub, y: altura - recub },
  ];

  const separacionM = input.separacionEstribos / 100;
  const numeroEstribosPorViga = separacionM > 0 ? Math.floor(input.luzLibre / separacionM) + 1 : 0;
  const stirrupPositions =
    input.luzLibre > 0 && separacionM > 0
      ? Array.from({ length: numeroEstribosPorViga }, (_, i) => (Math.min(i * separacionM, input.luzLibre) / input.luzLibre) * lSeg)
      : [];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[400px]"
        role="img"
        aria-label="Vista isométrica esquemática de la jaula de acero de la viga de cimentación"
      >
        <path d={pathFor(outline, 0, true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.12} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        <path d={pathFor(outline, lSeg, true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.08} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        {outline.map((p, i) => {
          const a = screen(0, p.z, p.y);
          const b = screen(lSeg, p.z, p.y);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />;
        })}

        {stirrupPositions.map((x, i) => (
          <path key={i} d={pathFor(ringOutline, x, true)} fill="none" stroke={DIAGRAM_COLORS.stirrup} strokeWidth={1.75} />
        ))}

        {barPositions.map((p, i) => {
          const a = screen(0, p.z, p.y);
          const b = screen(lSeg, p.z, p.y);
          const rebar = getRebar(p.diametroId);
          return (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rebar.color} strokeWidth={Math.max(1.4, 1.4 * (rebar.diameterMm / 16))} strokeLinecap="round" />
          );
        })}
      </svg>
      <p className="mt-1 text-center text-xs text-steel-500">
        Vista isométrica esquemática (segmento representativo, no a escala real)
      </p>
      <p className="text-center text-xs text-steel-500">
        {bars.length} barras · {numeroEstribosPorViga} estribos Ø{getRebar(input.diametroEstribosId).diameterMm}mm por viga
      </p>
    </div>
  );
}

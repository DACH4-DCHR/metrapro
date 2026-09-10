import { getRebar } from "../../lib/materials";
import type { PlacaInput } from "../../lib/calc/placa";
import { DIAGRAM_COLORS, isoProject } from "./svgHelpers";

interface PlacaIsometricProps {
  input: PlacaInput;
}

const VIEW_W = 320;
const VIEW_H = 260;
const MARGIN = 22;

export function PlacaIsometric({ input }: PlacaIsometricProps) {
  const longitudCm = input.longitud * 100;
  const alturaCm = input.alturaLibre * 100;
  const espesor = input.espesor;
  const recub = input.recubrimiento;
  if (longitudCm <= 0 || alturaCm <= 0 || espesor <= 0) {
    return <p className="text-sm text-steel-500">Ingresa una longitud, altura y espesor válidos para ver la vista isométrica.</p>;
  }

  const boundingRaw = [
    { x: 0, z: 0, y: 0 },
    { x: longitudCm, z: 0, y: 0 },
    { x: longitudCm, z: espesor, y: 0 },
    { x: 0, z: espesor, y: 0 },
    { x: 0, z: 0, y: alturaCm },
    { x: longitudCm, z: 0, y: alturaCm },
    { x: longitudCm, z: espesor, y: alturaCm },
    { x: 0, z: espesor, y: alturaCm },
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
  function pathFor(points: { x: number; y: number }[], z: number, close: boolean): string {
    const pts = points.map((p) => screen(p.x, z, p.y));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + (close ? " Z" : "");
  }
  function pathForRingAtHeight(points: { x: number; z: number }[], y: number, close: boolean): string {
    const pts = points.map((p) => screen(p.x, p.z, y));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + (close ? " Z" : "");
  }

  const outline = [
    { x: 0, y: 0 },
    { x: longitudCm, y: 0 },
    { x: longitudCm, y: alturaCm },
    { x: 0, y: alturaCm },
  ];

  const sepVCm = Math.max(input.separacionVertical, 1);
  const sepHCm = Math.max(input.separacionHorizontal, 1);
  const verticales: number[] = [];
  for (let x = sepVCm / 2; x < longitudCm; x += sepVCm) verticales.push(x);
  const horizontales: number[] = [];
  for (let y = sepHCm / 2; y < alturaCm; y += sepHCm) horizontales.push(y);
  const capasZ = input.numeroCapas === 2 ? [recub, espesor - recub] : [espesor / 2];
  const rebarV = getRebar(input.diametroVerticalId);
  const rebarH = getRebar(input.diametroHorizontalId);

  const anchoBordeCm = input.incluirElementoBorde ? Math.min(input.anchoElementoBorde, longitudCm / 2) : 0;
  const bordeBars: string[] = [];
  for (const g of input.barrasElementoBorde) {
    for (let i = 0; i < Math.max(g.cantidad, 0); i++) bordeBars.push(g.diametroId);
  }
  function bordePositions(): { x: number; z: number; diametroId: string }[] {
    if (!input.incluirElementoBorde || bordeBars.length === 0 || anchoBordeCm <= 0) return [];
    const perim: { x: number; z: number }[] = [];
    const n = bordeBars.length;
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 0.5;
      perim.push({ x: recub + t * (anchoBordeCm - 2 * recub), z: espesor / 2 });
    }
    return perim.map((p, i) => ({ ...p, diametroId: bordeBars[i] }));
  }
  const bordeIzq = bordePositions();
  const bordeDer = bordeIzq.map((p) => ({ ...p, x: longitudCm - p.x }));
  const separacionEstriboBordeCm = Math.max(input.separacionEstribosBorde, 1);
  const estribosBordeY: number[] = [];
  for (let y = 0; y < alturaCm; y += separacionEstriboBordeCm) estribosBordeY.push(y);
  const estriboBordeRing = [
    { x: recub, z: recub },
    { x: anchoBordeCm - recub, z: recub },
    { x: anchoBordeCm - recub, z: espesor - recub },
    { x: recub, z: espesor - recub },
  ];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[420px]"
        role="img"
        aria-label="Vista isométrica esquemática de la jaula de acero de la placa"
      >
        <path d={pathFor(outline, 0, true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.12} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        <path d={pathFor(outline, espesor, true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.08} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        {outline.map((p, i) => {
          const a = screen(p.x, 0, p.y);
          const b = screen(p.x, espesor, p.y);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />;
        })}

        {/* Refuerzo distribuido: malla vertical + horizontal, en cada capa */}
        {capasZ.map((z, zi) =>
          verticales.map((x, i) => {
            const a = screen(x, z, 0);
            const b = screen(x, z, alturaCm);
            return <line key={`v-${zi}-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rebarV.color} strokeWidth={1.4} opacity={0.85} />;
          })
        )}
        {capasZ.map((z, zi) =>
          horizontales.map((y, i) => {
            const a = screen(0, z, y);
            const b = screen(longitudCm, z, y);
            return <line key={`h-${zi}-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rebarH.color} strokeWidth={1.4} opacity={0.85} />;
          })
        )}

        {/* Elementos de borde: cage vertical + estribos, en ambos extremos */}
        {input.incluirElementoBorde &&
          [bordeIzq, bordeDer].map((cage, ci) =>
            cage.map((p, i) => {
              const a = screen(p.x, p.z, 0);
              const b = screen(p.x, p.z, alturaCm);
              const rebar = getRebar(p.diametroId);
              return <line key={`borde-${ci}-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rebar.color} strokeWidth={2} strokeLinecap="round" />;
            })
          )}
        {input.incluirElementoBorde &&
          estribosBordeY.map((y, i) => (
            <g key={`estribo-${i}`}>
              <path
                d={pathForRingAtHeight(
                  estriboBordeRing,
                  y,
                  true
                )}
                fill="none"
                stroke={DIAGRAM_COLORS.stirrup}
                strokeWidth={1.5}
              />
              <path
                d={pathForRingAtHeight(
                  estriboBordeRing.map((p) => ({ x: longitudCm - p.x, z: p.z })),
                  y,
                  true
                )}
                fill="none"
                stroke={DIAGRAM_COLORS.stirrup}
                strokeWidth={1.5}
              />
            </g>
          ))}
      </svg>
      <p className="mt-1 text-center text-xs text-steel-500">
        Vista isométrica esquemática (no a escala real)
      </p>
      <p className="text-center text-xs text-steel-500">
        Ø{rebarV.diameterMm}mm vert. + Ø{rebarH.diameterMm}mm horiz.
        {input.incluirElementoBorde && ` · elementos de borde ${bordeBars.length}Ø c/extremo`}
      </p>
    </div>
  );
}

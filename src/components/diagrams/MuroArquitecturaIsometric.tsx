import { useState } from "react";
import { getRebar } from "../../lib/materials";
import type { MuroArquitecturaInput } from "../../lib/calc/muroArquitectura";
import { DIAGRAM_COLORS, isoProjectAt, ISO_DEFAULT_AZIMUTH } from "./svgHelpers";
import { RotationSlider } from "./RotationSlider";

interface MuroArquitecturaIsometricProps {
  input: MuroArquitecturaInput;
}

const VIEW_W = 320;
const VIEW_H = 260;
const MARGIN = 22;

function perimeterPoints(n: number, w: number, h: number): { u: number; v: number }[] {
  if (n <= 0) return [];
  const perimeter = 2 * (w + h);
  return Array.from({ length: n }, (_, i) => {
    const s = (i * perimeter) / n;
    if (s < w) return { u: s, v: 0 };
    if (s < w + h) return { u: w, v: s - w };
    if (s < 2 * w + h) return { u: w - (s - w - h), v: h };
    return { u: 0, v: h - (s - 2 * w - h) };
  });
}

export function MuroArquitecturaIsometric({ input }: MuroArquitecturaIsometricProps) {
  const [azimuth, setAzimuth] = useState(ISO_DEFAULT_AZIMUTH);
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
  const projected = boundingRaw.map((p) => isoProjectAt(p.x, p.z, p.y, azimuth));
  const minX = Math.min(...projected.map((p) => p.x));
  const maxX = Math.max(...projected.map((p) => p.x));
  const minY = Math.min(...projected.map((p) => p.y));
  const maxY = Math.max(...projected.map((p) => p.y));

  const drawW = VIEW_W - 2 * MARGIN;
  const drawH = VIEW_H - 2 * MARGIN;
  const scale = Math.min(drawW / (maxX - minX || 1), drawH / (maxY - minY || 1));

  function screen(x: number, z: number, y: number): { x: number; y: number } {
    const p = isoProjectAt(x, z, y, azimuth);
    return { x: MARGIN + (p.x - minX) * scale, y: MARGIN + (p.y - minY) * scale };
  }
  function pathFor(points: { x: number; y: number }[], z: number, close: boolean): string {
    const pts = points.map((p) => screen(p.x, z, p.y));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + (close ? " Z" : "");
  }

  const outline = [
    { x: 0, y: 0 },
    { x: longitudCm, y: 0 },
    { x: longitudCm, y: alturaCm },
    { x: 0, y: alturaCm },
  ];

  const columnetas: number[] = [];
  if (input.incluirArriostres && input.numeroColumnetas >= 2) {
    for (let i = 0; i < input.numeroColumnetas; i++) columnetas.push((i * longitudCm) / (input.numeroColumnetas - 1));
  }
  const peralteColumneta = input.peralteColumneta;

  const barrasColumneta: string[] = [];
  for (const g of input.barrasColumneta) for (let i = 0; i < Math.max(g.cantidad, 0); i++) barrasColumneta.push(g.diametroId);
  const columnetaBarPos = perimeterPoints(barrasColumneta.length, peralteColumneta - 2 * recub, espesor - 2 * recub).map((p, i) => ({
    u: p.u + recub,
    v: p.v + recub,
    diametroId: barrasColumneta[i],
  }));

  const estribosYCm: number[] = [];
  const sepCm = Math.max(input.separacionEstribosColumneta, 1);
  for (let y = 0; y < alturaCm; y += sepCm) estribosYCm.push(y);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[420px]"
        role="img"
        aria-label="Vista isométrica esquemática del muro de arquitectura"
      >
        <path d={pathFor(outline, 0, true)} fill={DIAGRAM_COLORS.tecnopor} fillOpacity={0.5} stroke={DIAGRAM_COLORS.tecnoporStroke} strokeWidth={1} />
        <path d={pathFor(outline, espesor, true)} fill={DIAGRAM_COLORS.tecnopor} fillOpacity={0.3} stroke={DIAGRAM_COLORS.tecnoporStroke} strokeWidth={1} strokeDasharray="3 2" />
        {outline.map((p, i) => {
          const a = screen(p.x, 0, p.y);
          const b = screen(p.x, espesor, p.y);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.tecnoporStroke} strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />;
        })}

        {input.incluirArriostres &&
          columnetas.map((cx, ci) => (
            <g key={`col-${ci}`}>
              {estribosYCm.map((y, i) => {
                const corners = [
                  { u: recub, v: recub },
                  { u: peralteColumneta - recub, v: recub },
                  { u: peralteColumneta - recub, v: espesor - recub },
                  { u: recub, v: espesor - recub },
                ];
                const pts = corners.map((c) => screen(cx - peralteColumneta / 2 + c.u, c.v, y));
                const d = pts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
                return <path key={i} d={d} fill="none" stroke={DIAGRAM_COLORS.stirrup} strokeWidth={1.5} />;
              })}
              {columnetaBarPos.map((p, i) => {
                const a = screen(cx - peralteColumneta / 2 + p.u, p.v, 0);
                const b = screen(cx - peralteColumneta / 2 + p.u, p.v, alturaCm);
                const rebar = getRebar(p.diametroId);
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rebar.color} strokeWidth={1.8} strokeLinecap="round" />;
              })}
            </g>
          ))}
      </svg>
      <RotationSlider value={azimuth} onChange={setAzimuth} />
      <p className="mt-1 text-center text-xs text-steel-500">Vista isométrica esquemática (no a escala real)</p>
      <p className="text-center text-xs text-steel-500">
        {input.incluirArriostres ? `${input.numeroColumnetas} columnetas de arriostre` : "Sin columnetas de arriostre"}
      </p>
    </div>
  );
}

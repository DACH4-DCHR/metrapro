import { useState } from "react";
import { getRebar } from "../../lib/materials";
import type { MuroAlbanileriaInput } from "../../lib/calc/muroAlbanileria";
import { DIAGRAM_COLORS, isoProjectAt, ISO_DEFAULT_AZIMUTH } from "./svgHelpers";
import { RotationSlider } from "./RotationSlider";

interface MuroAlbanileriaIsometricProps {
  input: MuroAlbanileriaInput;
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

export function MuroAlbanileriaIsometric({ input }: MuroAlbanileriaIsometricProps) {
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

  const columnas: number[] = [];
  if (input.incluirConfinamiento && input.numeroColumnas >= 2) {
    for (let i = 0; i < input.numeroColumnas; i++) columnas.push((i * longitudCm) / (input.numeroColumnas - 1));
  }
  const peralteColumna = input.peralteColumna;
  const peralteSolera = input.peralteSolera;

  const barrasColumna: string[] = [];
  for (const g of input.barrasColumna) for (let i = 0; i < Math.max(g.cantidad, 0); i++) barrasColumna.push(g.diametroId);
  const barrasSolera: string[] = [];
  for (const g of input.barrasSolera) for (let i = 0; i < Math.max(g.cantidad, 0); i++) barrasSolera.push(g.diametroId);

  const columnaBarPos = perimeterPoints(barrasColumna.length, peralteColumna - 2 * recub, espesor - 2 * recub).map((p, i) => ({
    u: p.u + recub,
    v: p.v + recub,
    diametroId: barrasColumna[i],
  }));
  const soleraBarPos = perimeterPoints(barrasSolera.length, espesor - 2 * recub, peralteSolera - 2 * recub).map((p, i) => ({
    u: p.u + recub,
    v: p.v + recub,
    diametroId: barrasSolera[i],
  }));

  const estribosColYCm: number[] = [];
  const sepColCm = Math.max(input.separacionCentral, 1);
  for (let y = 0; y < alturaCm; y += sepColCm) estribosColYCm.push(y);
  const estribosSoleraXCm: number[] = [];
  const sepSoleraCm = Math.max(input.separacionCentral, 1);
  for (let x = 0; x < longitudCm; x += sepSoleraCm) estribosSoleraXCm.push(x);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[420px]"
        role="img"
        aria-label="Vista isométrica esquemática del muro de albañilería confinada"
      >
        {/* Paño de albañilería: relleno tenue, sin acero (la unidad no lleva refuerzo) */}
        <path d={pathFor(outline, 0, true)} fill={DIAGRAM_COLORS.arcilla} fillOpacity={0.35} stroke={DIAGRAM_COLORS.arcillaStroke} strokeWidth={1} />
        <path d={pathFor(outline, espesor, true)} fill={DIAGRAM_COLORS.arcilla} fillOpacity={0.2} stroke={DIAGRAM_COLORS.arcillaStroke} strokeWidth={1} strokeDasharray="3 2" />
        {outline.map((p, i) => {
          const a = screen(p.x, 0, p.y);
          const b = screen(p.x, espesor, p.y);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.arcillaStroke} strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />;
        })}

        {input.incluirConfinamiento &&
          columnas.map((cx, ci) => (
            <g key={`col-${ci}`}>
              {estribosColYCm.map((y, i) => {
                const corners = [
                  { u: recub, v: recub },
                  { u: peralteColumna - recub, v: recub },
                  { u: peralteColumna - recub, v: espesor - recub },
                  { u: recub, v: espesor - recub },
                ];
                const pts = corners.map((c) => screen(cx - peralteColumna / 2 + c.u, c.v, y));
                const d = pts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
                return <path key={i} d={d} fill="none" stroke={DIAGRAM_COLORS.stirrup} strokeWidth={1.5} />;
              })}
              {columnaBarPos.map((p, i) => {
                const a = screen(cx - peralteColumna / 2 + p.u, p.v, 0);
                const b = screen(cx - peralteColumna / 2 + p.u, p.v, alturaCm);
                const rebar = getRebar(p.diametroId);
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rebar.color} strokeWidth={1.8} strokeLinecap="round" />;
              })}
            </g>
          ))}

        {input.incluirConfinamiento && (
          <g>
            {estribosSoleraXCm.map((x, i) => {
              const corners = [
                { u: recub, v: recub },
                { u: espesor - recub, v: recub },
                { u: espesor - recub, v: peralteSolera - recub },
                { u: recub, v: peralteSolera - recub },
              ];
              const pts = corners.map((c) => screen(x, c.u, alturaCm + c.v));
              const d = pts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
              return <path key={i} d={d} fill="none" stroke={DIAGRAM_COLORS.stirrup} strokeWidth={1.5} />;
            })}
            {soleraBarPos.map((p, i) => {
              const a = screen(0, p.u, alturaCm + p.v);
              const b = screen(longitudCm, p.u, alturaCm + p.v);
              const rebar = getRebar(p.diametroId);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rebar.color} strokeWidth={1.8} strokeLinecap="round" />;
            })}
          </g>
        )}
      </svg>
      <RotationSlider value={azimuth} onChange={setAzimuth} />
      <p className="mt-1 text-center text-xs text-steel-500">Vista isométrica esquemática (no a escala real)</p>
      <p className="text-center text-xs text-steel-500">
        {input.incluirConfinamiento
          ? `${input.numeroColumnas} columnas + 1 solera de confinamiento`
          : "Sin elementos de confinamiento"}
      </p>
    </div>
  );
}

import { useState } from "react";
import { getRebar } from "../../lib/materials";
import type { VigaCimentacionInput } from "../../lib/calc/vigaCimentacion";
import { longitudGanchoBarra90 } from "../../lib/calc/ganchos";
import { DIAGRAM_COLORS, isoProjectAt, ISO_DEFAULT_AZIMUTH } from "./svgHelpers";
import { RotationSlider } from "./RotationSlider";

interface VigaCimentacionIsometricProps {
  input: VigaCimentacionInput;
}

const VIEW_W = 300;
const VIEW_H = 240;
const MARGIN = 22;

function flattenBarras(grupos: { diametroId: string; cantidad: number }[]): string[] {
  const ids: string[] = [];
  for (const g of grupos) {
    for (let i = 0; i < Math.max(g.cantidad, 0); i++) ids.push(g.diametroId);
  }
  return ids;
}

export function VigaCimentacionIsometric({ input }: VigaCimentacionIsometricProps) {
  const [azimuth, setAzimuth] = useState(ISO_DEFAULT_AZIMUTH);
  const base = input.base;
  const altura = input.altura;
  const recub = input.recubrimiento;
  if (base <= 0 || altura <= 0) {
    return <p className="text-sm text-steel-500">Ingresa una base y altura válidas para ver la vista isométrica.</p>;
  }
  const bottomIds = flattenBarras(input.barrasInferiores);
  const topIds = flattenBarras(input.barrasSuperiores);
  const lateralIds = flattenBarras(input.barrasLaterales);
  if (bottomIds.length === 0 && topIds.length === 0 && lateralIds.length === 0) {
    return <p className="text-sm text-steel-500">Ingresa al menos una barra longitudinal para ver la vista isométrica.</p>;
  }
  const totalBars = bottomIds.length + topIds.length + lateralIds.length;

  const maxDim = Math.max(base, altura);
  const lSeg = Math.min(Math.max(3.2 * maxDim, 90), 360);

  function rowZ(ids: string[]): number[] {
    if (ids.length === 0) return [];
    const left = recub;
    const right = base - recub;
    return ids.map((_, i) => (ids.length > 1 ? left + (i * (right - left)) / (ids.length - 1) : (left + right) / 2));
  }
  // "bend": eje en el que dobla el gancho (hacia el centro de la sección) — "y" para
  // barras de malla inf./sup. (doblan en altura), "z" para el acero lateral (doblan en
  // el ancho de la base).
  const bottomPos = rowZ(bottomIds).map((z, i) => ({ z, y: altura - recub, diametroId: bottomIds[i], bend: "y" as const }));
  const topPos = rowZ(topIds).map((z, i) => ({ z, y: recub, diametroId: topIds[i], bend: "y" as const }));

  // Acero lateral (piel): "cantidad" es el total en ambas caras del alma, repartido en
  // dos columnas (z=recub y z=base-recub) distribuidas verticalmente entre las mallas.
  const lateralLeftCount = Math.ceil(lateralIds.length / 2);
  const lateralLeftIds = lateralIds.slice(0, lateralLeftCount);
  const lateralRightIds = lateralIds.slice(lateralLeftCount);
  function columnY(ids: string[]): number[] {
    if (ids.length === 0) return [];
    const top = recub;
    const bottom = altura - recub;
    return ids.map((_, i) => (ids.length > 1 ? top + (i * (bottom - top)) / (ids.length - 1) : (top + bottom) / 2));
  }
  const lateralLeftPos = columnY(lateralLeftIds).map((y, i) => ({ z: recub, y, diametroId: lateralLeftIds[i], bend: "z" as const }));
  const lateralRightPos = columnY(lateralRightIds).map((y, i) => ({ z: base - recub, y, diametroId: lateralRightIds[i], bend: "z" as const }));

  const barPositions = [...bottomPos, ...topPos, ...lateralLeftPos, ...lateralRightPos];

  // Ganchos a 90° en los extremos (doblan hacia el centro de la sección) y/o
  // prolongación recta del acero dentro de una zapata contigua (esquemática, con línea
  // discontinua), según las opciones activadas.
  const extremosConGancho = input.considerarGanchoLongitudinal
    ? Math.max(Math.min(input.extremosConGancho, 2), 0)
    : 0;
  const extremosConProlongacion = input.considerarProlongacionZapata
    ? Math.max(Math.min(input.extremosConProlongacion, 2), 0)
    : 0;
  const ganchoEnInicio = extremosConGancho >= 2;
  const ganchoEnFin = extremosConGancho >= 1;
  const prolongacionEnInicio = extremosConProlongacion >= 2;
  const prolongacionEnFin = extremosConProlongacion >= 1;
  const prolongacionPx = lSeg * 0.18;
  const xMinBound = prolongacionEnInicio ? -prolongacionPx : 0;
  const xMaxBound = prolongacionEnFin ? lSeg + prolongacionPx : lSeg;

  const boundingRaw = [
    { x: xMinBound, z: 0, y: 0 },
    { x: xMaxBound, z: 0, y: 0 },
    { x: xMaxBound, z: base, y: 0 },
    { x: xMinBound, z: base, y: 0 },
    { x: xMinBound, z: 0, y: altura },
    { x: xMaxBound, z: 0, y: altura },
    { x: xMaxBound, z: base, y: altura },
    { x: xMinBound, z: base, y: altura },
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
          const strokeWidth = Math.max(1.4, 1.4 * (rebar.diameterMm / 16));

          const hookLenRaw = longitudGanchoBarra90(p.diametroId) * 100;
          let hookEndInicio = a;
          let hookEndFin = b;
          if (p.bend === "y") {
            const hookLen = Math.min(hookLenRaw, Math.max(altura - 2 * recub, 0));
            const dirY = p.y < altura / 2 ? 1 : -1;
            hookEndInicio = screen(0, p.z, p.y + dirY * hookLen);
            hookEndFin = screen(lSeg, p.z, p.y + dirY * hookLen);
          } else {
            const hookLen = Math.min(hookLenRaw, Math.max(base - 2 * recub, 0));
            const dirZ = p.z < base / 2 ? 1 : -1;
            hookEndInicio = screen(0, p.z + dirZ * hookLen, p.y);
            hookEndFin = screen(lSeg, p.z + dirZ * hookLen, p.y);
          }

          const prolongInicio = screen(-prolongacionPx, p.z, p.y);
          const prolongFin = screen(lSeg + prolongacionPx, p.z, p.y);

          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rebar.color} strokeWidth={strokeWidth} strokeLinecap="round" />
              {ganchoEnInicio && (
                <line x1={a.x} y1={a.y} x2={hookEndInicio.x} y2={hookEndInicio.y} stroke={rebar.color} strokeWidth={strokeWidth} strokeLinecap="round" />
              )}
              {ganchoEnFin && (
                <line x1={b.x} y1={b.y} x2={hookEndFin.x} y2={hookEndFin.y} stroke={rebar.color} strokeWidth={strokeWidth} strokeLinecap="round" />
              )}
              {prolongacionEnInicio && (
                <line x1={a.x} y1={a.y} x2={prolongInicio.x} y2={prolongInicio.y} stroke={rebar.color} strokeWidth={strokeWidth} strokeDasharray="4 3" opacity={0.65} strokeLinecap="round" />
              )}
              {prolongacionEnFin && (
                <line x1={b.x} y1={b.y} x2={prolongFin.x} y2={prolongFin.y} stroke={rebar.color} strokeWidth={strokeWidth} strokeDasharray="4 3" opacity={0.65} strokeLinecap="round" />
              )}
            </g>
          );
        })}
      </svg>
      <RotationSlider value={azimuth} onChange={setAzimuth} />
      <p className="mt-1 text-center text-xs text-steel-500">
        Vista isométrica esquemática (segmento representativo, no a escala real)
      </p>
      <p className="text-center text-xs text-steel-500">
        {totalBars} barras ({bottomIds.length} inf. / {topIds.length} sup. / {lateralIds.length} lat.) ·{" "}
        {numeroEstribosPorViga} estribos Ø{getRebar(input.diametroEstribosId).diameterMm}mm por viga
      </p>
      {(prolongacionEnInicio || prolongacionEnFin) && (
        <p className="text-center text-xs text-steel-500">
          Línea discontinua: prolongación del acero dentro de la zapata, hacia la columna
        </p>
      )}
    </div>
  );
}

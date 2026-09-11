import { useState } from "react";
import { getRebar } from "../../lib/materials";
import { estribosPositionsM, type VigaInput } from "../../lib/calc/viga";
import { DIAGRAM_COLORS, isoProjectAt, ISO_DEFAULT_AZIMUTH } from "./svgHelpers";
import { RotationSlider } from "./RotationSlider";

interface VigaIsometricProps {
  input: VigaInput;
}

const VIEW_W = 300;
const VIEW_H = 240;
const MARGIN = 22;

function flattenBarras(input: VigaInput): string[] {
  const ids: string[] = [];
  for (const g of input.barrasLongitudinales) {
    for (let i = 0; i < Math.max(g.cantidad, 0); i++) ids.push(g.diametroId);
  }
  return ids;
}

export function VigaIsometric({ input }: VigaIsometricProps) {
  const [azimuth, setAzimuth] = useState(ISO_DEFAULT_AZIMUTH);
  if (input.tipoSeccion === "personalizada") {
    return <p className="text-sm text-steel-500">Vista no disponible para sección personalizada.</p>;
  }
  const base = input.base; // cm — eje z
  const altura = input.altura; // cm — eje y (vertical)
  const recub = input.recubrimiento;
  if (base <= 0 || altura <= 0) {
    return <p className="text-sm text-steel-500">Ingresa una base y altura válidas para ver la vista isométrica.</p>;
  }
  const bars = flattenBarras(input);
  if (bars.length === 0) {
    return <p className="text-sm text-steel-500">Ingresa al menos una barra longitudinal para ver la vista isométrica.</p>;
  }

  const maxDim = Math.max(base, altura);
  const lSeg = Math.min(Math.max(3.2 * maxDim, 90), 360); // segmento esquemático, no a escala real

  const bottomCount = Math.ceil(bars.length / 2);
  const bottomIds = bars.slice(0, bottomCount);
  const topIds = bars.slice(bottomCount);
  function rowZ(ids: string[]): number[] {
    if (ids.length === 0) return [];
    const left = recub;
    const right = base - recub;
    return ids.map((_, i) => (ids.length > 1 ? left + (i * (right - left)) / (ids.length - 1) : (left + right) / 2));
  }
  // Nota de orientación: en esta proyección, un valor de "y" MENOR se dibuja más abajo
  // en la pantalla (y uno MAYOR, más arriba) — por eso la malla inferior usa y=recub y
  // la superior usa y=altura-recub, igual que en la vista en planta.
  const bottomPos = rowZ(bottomIds).map((z, i) => ({ z, y: recub, diametroId: bottomIds[i] }));
  const topPos = rowZ(topIds).map((z, i) => ({ z, y: altura - recub, diametroId: topIds[i] }));
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

  const estribosReales = estribosPositionsM(input);
  const loM = input.incluirConfinamiento ? input.longitudConfinamiento / 100 : 0;
  const stirrupLevels =
    input.longitud > 0
      ? estribosReales.map((posM) => ({
          x: (posM / input.longitud) * lSeg,
          confinado: input.incluirConfinamiento && (posM <= loM || posM >= input.longitud - loM),
        }))
      : [];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[400px]"
        role="img"
        aria-label="Vista isométrica esquemática de la jaula de acero de la viga"
      >
        <path d={pathFor(outline, 0, true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.12} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        <path d={pathFor(outline, lSeg, true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.08} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        {outline.map((p, i) => {
          const a = screen(0, p.z, p.y);
          const b = screen(lSeg, p.z, p.y);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />;
        })}

        {stirrupLevels.map(({ x, confinado }, i) => (
          <path key={i} d={pathFor(ringOutline, x, true)} fill="none" stroke={DIAGRAM_COLORS.stirrup} strokeWidth={confinado ? 2.25 : 1.4} opacity={confinado ? 1 : 0.6} />
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
      <RotationSlider value={azimuth} onChange={setAzimuth} />
      <p className="mt-1 text-center text-xs text-steel-500">
        Vista isométrica esquemática (segmento representativo, no a escala real) — la distribución de estribos sí
        refleja tus valores de separación{input.incluirConfinamiento ? " y confinamiento" : ""}
      </p>
      <p className="text-center text-xs text-steel-500">
        {bars.length} barras · {estribosReales.length} estribos Ø{getRebar(input.diametroEstribosId).diameterMm}mm por viga
      </p>
    </div>
  );
}

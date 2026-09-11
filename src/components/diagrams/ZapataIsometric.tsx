import { useState } from "react";
import { getRebar } from "../../lib/materials";
import type { ZapataInput } from "../../lib/calc/zapata";
import { longitudGanchoBarra90 } from "../../lib/calc/ganchos";
import { DIAGRAM_COLORS, isoProjectAt, ISO_DEFAULT_AZIMUTH } from "./svgHelpers";
import { RotationSlider } from "./RotationSlider";

interface ZapataIsometricProps {
  input: ZapataInput;
}

const VIEW_W = 300;
const VIEW_H = 260;
const MARGIN = 22;

export function ZapataIsometric({ input }: ZapataIsometricProps) {
  const [azimuth, setAzimuth] = useState(ISO_DEFAULT_AZIMUTH);
  const largoCm = input.largo * 100;
  const anchoCm = input.ancho * 100;
  const peralte = input.peralte;
  const recub = input.recubrimiento;
  if (largoCm <= 0 || anchoCm <= 0 || peralte <= 0) {
    return <p className="text-sm text-steel-500">Ingresa un largo, ancho y peralte válidos para ver la vista isométrica.</p>;
  }

  const boundingRaw = [
    { x: 0, z: 0, y: 0 },
    { x: largoCm, z: 0, y: 0 },
    { x: largoCm, z: anchoCm, y: 0 },
    { x: 0, z: anchoCm, y: 0 },
    { x: 0, z: 0, y: peralte },
    { x: largoCm, z: 0, y: peralte },
    { x: largoCm, z: anchoCm, y: peralte },
    { x: 0, z: anchoCm, y: peralte },
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
  function pathForTop(points: { x: number; z: number }[], y: number, close: boolean): string {
    const pts = points.map((p) => screen(p.x, p.z, y));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + (close ? " Z" : "");
  }

  const footprint = [
    { x: 0, z: 0 },
    { x: largoCm, z: 0 },
    { x: largoCm, z: anchoCm },
    { x: 0, z: anchoCm },
  ];

  // Gancho estándar a 90° en los extremos de la malla: se dibuja como un tramo corto
  // que dobla verticalmente hacia el interior del peralte (mismo sentido que el
  // metrado: longitudGanchoBarra90 = 12·db), acotado para no salir de la zapata.
  const extremosConGancho = input.considerarGanchoLongitudinal
    ? Math.max(Math.min(input.extremosConGancho, 2), 0)
    : 0;
  const hookDoblaHaciaArriba = (y0: number) => y0 < peralte / 2; // malla inferior dobla hacia arriba, superior hacia abajo

  function mallaLines(diametroXId: string, sepX: number, diametroYId: string, sepY: number, y: number) {
    const sepXCm = Math.max(sepX, 1);
    const sepYCm = Math.max(sepY, 1);
    const barrasX: number[] = [];
    for (let z = sepXCm / 2; z < anchoCm; z += sepXCm) barrasX.push(z);
    const barrasY: number[] = [];
    for (let x = sepYCm / 2; x < largoCm; x += sepYCm) barrasY.push(x);
    const colorX = getRebar(diametroXId).color;
    const colorY = getRebar(diametroYId).color;

    const dirY = hookDoblaHaciaArriba(y) ? 1 : -1;
    const maxHookCm = Math.max(peralte - 2 * recub, 0);
    const hookXCm = extremosConGancho > 0 ? Math.min(longitudGanchoBarra90(diametroXId) * 100, maxHookCm) : 0;
    const hookYCm = extremosConGancho > 0 ? Math.min(longitudGanchoBarra90(diametroYId) * 100, maxHookCm) : 0;
    const ganchoEnInicio = extremosConGancho >= 2;
    const ganchoEnFin = extremosConGancho >= 1;

    return (
      <>
        {barrasX.map((z, i) => {
          const a = screen(0, z, y);
          const b = screen(largoCm, z, y);
          return (
            <g key={`x-${y}-${i}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colorX} strokeWidth={1.4} />
              {ganchoEnInicio && hookXCm > 0 && (
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={screen(0, z, y + dirY * hookXCm).x}
                  y2={screen(0, z, y + dirY * hookXCm).y}
                  stroke={colorX}
                  strokeWidth={1.4}
                />
              )}
              {ganchoEnFin && hookXCm > 0 && (
                <line
                  x1={b.x}
                  y1={b.y}
                  x2={screen(largoCm, z, y + dirY * hookXCm).x}
                  y2={screen(largoCm, z, y + dirY * hookXCm).y}
                  stroke={colorX}
                  strokeWidth={1.4}
                />
              )}
            </g>
          );
        })}
        {barrasY.map((x, i) => {
          const a = screen(x, 0, y);
          const b = screen(x, anchoCm, y);
          return (
            <g key={`y-${y}-${i}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colorY} strokeWidth={1.4} />
              {ganchoEnInicio && hookYCm > 0 && (
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={screen(x, 0, y + dirY * hookYCm).x}
                  y2={screen(x, 0, y + dirY * hookYCm).y}
                  stroke={colorY}
                  strokeWidth={1.4}
                />
              )}
              {ganchoEnFin && hookYCm > 0 && (
                <line
                  x1={b.x}
                  y1={b.y}
                  x2={screen(x, anchoCm, y + dirY * hookYCm).x}
                  y2={screen(x, anchoCm, y + dirY * hookYCm).y}
                  stroke={colorY}
                  strokeWidth={1.4}
                />
              )}
            </g>
          );
        })}
      </>
    );
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[400px]"
        role="img"
        aria-label="Vista isométrica esquemática del acero de la zapata"
      >
        <path d={pathForTop(footprint, 0, true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.14} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        <path d={pathForTop(footprint, peralte, true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.08} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        {footprint.map((p, i) => {
          const a = screen(p.x, p.z, 0);
          const b = screen(p.x, p.z, peralte);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />;
        })}

        {mallaLines(input.diametroInferiorXId, input.separacionInferiorX, input.diametroInferiorYId, input.separacionInferiorY, recub)}
        {input.incluirMallaSuperior &&
          mallaLines(input.diametroSuperiorXId, input.separacionSuperiorX, input.diametroSuperiorYId, input.separacionSuperiorY, peralte - recub)}
      </svg>
      <RotationSlider value={azimuth} onChange={setAzimuth} />
      <p className="mt-1 text-center text-xs text-steel-500">Vista isométrica esquemática (no a escala real)</p>
      <p className="text-center text-xs text-steel-500">
        Malla inferior Ø{getRebar(input.diametroInferiorXId).diameterMm}/Ø{getRebar(input.diametroInferiorYId).diameterMm}mm
        {input.incluirMallaSuperior &&
          ` · malla superior Ø${getRebar(input.diametroSuperiorXId).diameterMm}/Ø${getRebar(input.diametroSuperiorYId).diameterMm}mm`}
      </p>
    </div>
  );
}

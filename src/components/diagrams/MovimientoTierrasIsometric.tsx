import { useState } from "react";
import type { MovimientoTierrasInput } from "../../lib/calc/movimientoTierras";
import { DIAGRAM_COLORS, fmt, isoProjectAt, ISO_DEFAULT_AZIMUTH } from "./svgHelpers";
import { RotationSlider } from "./RotationSlider";

interface MovimientoTierrasIsometricProps {
  input: MovimientoTierrasInput;
  largoExcavacion: number; // m, ya con sobreancho de trabajo (modo "zapata")
  anchoExcavacion: number; // m, ya con sobreancho de trabajo
  volumenExcavacion: number; // m3, ya calculado
}

const VIEW_W = 300;
const VIEW_H = 240;
const MARGIN = 22;

export function MovimientoTierrasIsometric({ input, largoExcavacion, anchoExcavacion, volumenExcavacion }: MovimientoTierrasIsometricProps) {
  const [azimuth, setAzimuth] = useState(ISO_DEFAULT_AZIMUTH);
  const largo = Math.max(largoExcavacion, 0);
  const profundidad = Math.max(input.profundidad, 0);
  if (anchoExcavacion <= 0 || largo <= 0 || profundidad <= 0) {
    return <p className="text-sm text-steel-500">Ingresa un largo, ancho y profundidad válidos para ver la vista isométrica.</p>;
  }

  const boundingRaw = [
    { x: 0, z: 0, y: 0 },
    { x: largo, z: 0, y: 0 },
    { x: largo, z: anchoExcavacion, y: 0 },
    { x: 0, z: anchoExcavacion, y: 0 },
    { x: 0, z: 0, y: -profundidad },
    { x: largo, z: 0, y: -profundidad },
    { x: largo, z: anchoExcavacion, y: -profundidad },
    { x: 0, z: anchoExcavacion, y: -profundidad },
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
  function pathFor(points: { x: number; z: number }[], y: number, close: boolean): string {
    const pts = points.map((p) => screen(p.x, p.z, y));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + (close ? " Z" : "");
  }
  // Cara vertical de la excavación entre dos puntos consecutivos del footprint, desde
  // y=yTop hasta y=yBottom (ambos en la misma vertical x,z de cada punto).
  function verticalFacePath(a: { x: number; z: number }, b: { x: number; z: number }, yTop: number, yBottom: number): string {
    const pts = [screen(a.x, a.z, yTop), screen(b.x, b.z, yTop), screen(b.x, b.z, yBottom), screen(a.x, a.z, yBottom)];
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
  }

  const footprint = [
    { x: 0, z: 0 },
    { x: largo, z: 0 },
    { x: largo, z: anchoExcavacion },
    { x: 0, z: anchoExcavacion },
  ];

  // Bloque de cimentación esquemático: mismo footprint de la excavación, altura
  // proporcional al volumen que ocupará dentro del volumen total excavado, apoyado
  // en el fondo (no a escala real, solo ilustra relleno vs. concreto).
  const fraccionOcupada =
    volumenExcavacion > 0 ? Math.min(Math.max(input.volumenOcupadoCimentacion, 0) / volumenExcavacion, 1) : 0;
  const hCimentacion = profundidad * fraccionOcupada;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[400px]"
        role="img"
        aria-label="Vista isométrica esquemática de la excavación para cimentación"
      >
        {/* Nivel de terreno natural (tapa superior de la excavación) */}
        <path d={pathFor(footprint, 0, true)} fill="none" stroke={DIAGRAM_COLORS.arcillaStroke} strokeWidth={1} />

        {/* Paredes de la excavación */}
        {footprint.map((p, i) => {
          const a = screen(p.x, p.z, 0);
          const b = screen(p.x, p.z, -profundidad);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.arcillaStroke} strokeWidth={1} strokeDasharray="3 2" opacity={0.7} />;
        })}
        <path d={pathFor(footprint, -profundidad, true)} fill={DIAGRAM_COLORS.arcilla} fillOpacity={0.22} stroke={DIAGRAM_COLORS.arcillaStroke} strokeWidth={1} strokeDasharray="3 2" />

        {/* Caras laterales visibles del volumen excavado (relleno de material propio) */}
        <path d={verticalFacePath(footprint[0], footprint[1], 0, -profundidad)} fill={DIAGRAM_COLORS.arcilla} fillOpacity={0.16} stroke="none" />
        <path d={verticalFacePath(footprint[1], footprint[2], 0, -profundidad)} fill={DIAGRAM_COLORS.arcilla} fillOpacity={0.1} stroke="none" />

        {/* Bloque de cimentación en el fondo de la excavación */}
        {hCimentacion > 0 && (
          <>
            <path d={pathFor(footprint, -(profundidad - hCimentacion), true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.9} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} />
            {footprint.map((p, i) => {
              const a = screen(p.x, p.z, -(profundidad - hCimentacion));
              const b = screen(p.x, p.z, -profundidad);
              return <line key={`cim-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} />;
            })}
          </>
        )}
      </svg>
      <RotationSlider value={azimuth} onChange={setAzimuth} />
      <p className="mt-1 text-center text-xs text-steel-500">
        Vista isométrica esquemática (no a escala real)
      </p>
      <p className="text-center text-xs text-steel-500">
        Excavación {fmt(largo, 2)}m x {fmt(anchoExcavacion, 2)}m x {fmt(profundidad, 2)}m
      </p>
    </div>
  );
}

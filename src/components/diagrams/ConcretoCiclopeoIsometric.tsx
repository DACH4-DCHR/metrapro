import { useState } from "react";
import type { ConcretoCiclopeoInput } from "../../lib/calc/concretoCiclopeo";
import { DIAGRAM_COLORS, fmt, isoProjectAt, ISO_DEFAULT_AZIMUTH } from "./svgHelpers";
import { RotationSlider } from "./RotationSlider";

interface ConcretoCiclopeoIsometricProps {
  input: ConcretoCiclopeoInput;
  stoneLabel: string; // "P.G." o "P.M."
}

const VIEW_W = 300;
const VIEW_H = 240;
const MARGIN = 22;

// Distribución pseudoaleatoria pero determinística (no depende de Math.random, para que
// el diagrama no "parpadee" en cada render) de las piedras desplazadoras dentro del
// volumen, en proporción aproximada al % de piedra ingresado.
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function ConcretoCiclopeoIsometric({ input, stoneLabel }: ConcretoCiclopeoIsometricProps) {
  const [azimuth, setAzimuth] = useState(ISO_DEFAULT_AZIMUTH);
  const ancho = input.ancho; // cm — eje z
  const altura = input.altura; // cm — eje y (vertical)
  if (ancho <= 0 || altura <= 0) {
    return <p className="text-sm text-steel-500">Ingresa un ancho y altura válidos para ver la vista isométrica.</p>;
  }

  const maxDim = Math.max(ancho, altura);
  const lSeg = Math.min(Math.max(3.2 * maxDim, 90), 360); // segmento esquemático, no a escala real

  const boundingRaw = [
    { x: 0, z: 0, y: 0 },
    { x: lSeg, z: 0, y: 0 },
    { x: lSeg, z: ancho, y: 0 },
    { x: 0, z: ancho, y: 0 },
    { x: 0, z: 0, y: altura },
    { x: lSeg, z: 0, y: altura },
    { x: lSeg, z: ancho, y: altura },
    { x: 0, z: ancho, y: altura },
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
    { z: ancho, y: 0 },
    { z: ancho, y: altura },
    { z: 0, y: altura },
  ];

  const stoneCount = Math.round(Math.min(Math.max(input.porcentajePiedra, 0), 30) / 1.5);
  const stones = Array.from({ length: stoneCount }, (_, i) => ({
    x: (0.06 + pseudoRandom(i * 4 + 1) * 0.88) * lSeg,
    z: (0.15 + pseudoRandom(i * 4 + 2) * 0.7) * ancho,
    y: (0.15 + pseudoRandom(i * 4 + 3) * 0.7) * altura,
    r: (0.05 + pseudoRandom(i * 4 + 4) * 0.04) * maxDim,
  }));

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[400px]"
        role="img"
        aria-label="Vista isométrica esquemática del concreto ciclópeo"
      >
        <path d={pathFor(outline, 0, true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.16} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        <path d={pathFor(outline, lSeg, true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.1} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        {outline.map((p, i) => {
          const a = screen(0, p.z, p.y);
          const b = screen(lSeg, p.z, p.y);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />;
        })}

        {stones.map((s, i) => {
          const c = screen(s.x, s.z, s.y);
          return (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={Math.max(1.5, s.r * scale)}
              fill={DIAGRAM_COLORS.arcilla}
              stroke={DIAGRAM_COLORS.arcillaStroke}
              strokeWidth={0.5}
              opacity={0.85}
            />
          );
        })}
      </svg>
      <RotationSlider value={azimuth} onChange={setAzimuth} />
      <p className="mt-1 text-center text-xs text-steel-500">
        Vista isométrica esquemática (segmento representativo, no a escala real)
      </p>
      <p className="text-center text-xs text-steel-500">
        Concreto ciclópeo + {fmt(input.porcentajePiedra)}% {stoneLabel} (piedra referencial)
      </p>
    </div>
  );
}

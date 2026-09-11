import { useState } from "react";
import { getRebar } from "../../lib/materials";
import type { EscaleraInput } from "../../lib/calc/escalera";
import { DIAGRAM_COLORS, isoProjectAt, ISO_DEFAULT_AZIMUTH } from "./svgHelpers";
import { RotationSlider } from "./RotationSlider";

interface EscaleraIsometricProps {
  input: EscaleraInput;
}

const VIEW_W = 320;
const VIEW_H = 260;
const MARGIN = 22;

// Un tramo recto de escalera en el espacio (x=ancho perpendicular al avance,
// z/x según "dir" = dirección de avance, y = altura). Permite ubicar tramo2 con
// una orientación distinta a tramo1 (recto, giro de 90° o giro de 180°), para que
// la vista 3D refleje realmente el tipo de escalera elegido.
interface FlightGeom {
  origin: { x: number; z: number }; // punto en t=0, wFrac=0
  dir: { x: number; z: number }; // dirección de avance (unitaria, ±1 en x ó z)
  perp: { x: number; z: number }; // dirección del ancho (perpendicular a dir)
  length: number; // desarrollo horizontal, cm
  width: number; // ancho de la escalera en este tramo, cm
  yStart: number;
  yEnd: number;
}

function flightPoint(f: FlightGeom, wFrac: number, t: number, yOffset: number) {
  return {
    x: f.origin.x + f.dir.x * t * f.length + f.perp.x * wFrac * f.width,
    z: f.origin.z + f.dir.z * t * f.length + f.perp.z * wFrac * f.width,
    y: f.yStart + (f.yEnd - f.yStart) * t + yOffset,
  };
}

export function EscaleraIsometric({ input }: EscaleraIsometricProps) {
  const [azimuth, setAzimuth] = useState(ISO_DEFAULT_AZIMUTH);
  const ancho = input.anchoEscalera * 100;
  const espesor = input.espesorLosaInclinada;
  const { numeroPeldanos, huella, contrahuella } = input.tramo1;
  const desarrollo1 = Math.max(numeroPeldanos - 1, 0) * huella;
  const altura1 = numeroPeldanos * contrahuella;

  if (ancho <= 0 || desarrollo1 <= 0 || altura1 <= 0) {
    return <p className="text-sm text-steel-500">Ingresa datos válidos del Tramo 1 para ver la vista isométrica.</p>;
  }

  const tramo1: FlightGeom = {
    origin: { x: 0, z: 0 },
    dir: { x: 0, z: 1 },
    perp: { x: 1, z: 0 },
    length: desarrollo1,
    width: ancho,
    yStart: 0,
    yEnd: altura1,
  };

  const esMultiTramo = input.tipo !== "un_tramo";
  let landingCorners: { x: number; z: number }[] | null = null;
  let tramo2: FlightGeom | null = null;

  if (esMultiTramo && input.tramo2 && input.descanso) {
    const { numeroPeldanos: n2, huella: h2, contrahuella: c2 } = input.tramo2;
    const desarrollo2 = Math.max(n2 - 1, 0) * h2;
    const altura2 = n2 * c2;
    const landingLargo = Math.max(input.descanso.largo * 100, 1);

    if (desarrollo2 > 0 && altura2 > 0) {
      if (input.tipo === "dos_tramos") {
        // Continúa recto en la misma dirección, con un descanso intermedio.
        landingCorners = [
          { x: 0, z: desarrollo1 },
          { x: ancho, z: desarrollo1 },
          { x: ancho, z: desarrollo1 + landingLargo },
          { x: 0, z: desarrollo1 + landingLargo },
        ];
        tramo2 = {
          origin: { x: 0, z: desarrollo1 + landingLargo },
          dir: { x: 0, z: 1 },
          perp: { x: 1, z: 0 },
          length: desarrollo2,
          width: ancho,
          yStart: altura1,
          yEnd: altura1 + altura2,
        };
      } else if (input.tipo === "L") {
        // Giro de 90°: el descanso es la esquina, tramo2 avanza en el eje x.
        landingCorners = [
          { x: 0, z: desarrollo1 },
          { x: ancho, z: desarrollo1 },
          { x: ancho, z: desarrollo1 + landingLargo },
          { x: 0, z: desarrollo1 + landingLargo },
        ];
        tramo2 = {
          origin: { x: ancho, z: desarrollo1 },
          dir: { x: 1, z: 0 },
          perp: { x: 0, z: 1 },
          length: desarrollo2,
          width: landingLargo,
          yStart: altura1,
          yEnd: altura1 + altura2,
        };
      } else if (input.tipo === "U") {
        // Giro de 180°: tramo2 vuelve en paralelo a tramo1, separado por un pasillo.
        const gap = ancho * 0.2;
        landingCorners = [
          { x: 0, z: desarrollo1 },
          { x: 2 * ancho + gap, z: desarrollo1 },
          { x: 2 * ancho + gap, z: desarrollo1 + landingLargo },
          { x: 0, z: desarrollo1 + landingLargo },
        ];
        tramo2 = {
          origin: { x: ancho + gap, z: desarrollo1 + landingLargo },
          dir: { x: 0, z: -1 },
          perp: { x: 1, z: 0 },
          length: desarrollo2,
          width: ancho,
          yStart: altura1,
          yEnd: altura1 + altura2,
        };
      }
    }
  }

  const landingY = altura1;
  const landingEspesorM = input.descanso?.espesor ?? espesor;

  // Puntos de referencia (esquinas superior e inferior de la garganta) de todos los
  // tramos y el descanso, para encuadrar la vista completa.
  const cornerPoints: { x: number; z: number; y: number }[] = [];
  for (const f of [tramo1, tramo2].filter((f): f is FlightGeom => f !== null)) {
    for (const wFrac of [0, 1]) {
      for (const t of [0, 1]) {
        cornerPoints.push(flightPoint(f, wFrac, t, 0));
        cornerPoints.push(flightPoint(f, wFrac, t, espesor));
      }
    }
  }
  if (landingCorners) {
    for (const c of landingCorners) {
      cornerPoints.push({ ...c, y: landingY });
      cornerPoints.push({ ...c, y: landingY + landingEspesorM });
    }
  }

  const projected = cornerPoints.map((p) => isoProjectAt(p.x, p.z, p.y, azimuth));
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
  function slabScreen(f: FlightGeom, wFrac: number, t: number, yOffset: number) {
    const p = flightPoint(f, wFrac, t, yOffset);
    return screen(p.x, p.z, p.y);
  }
  function pathForFlight(f: FlightGeom, yOffset: number): string {
    const corners: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    const pts = corners.map(([wFrac, t]) => slabScreen(f, wFrac, t, yOffset));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
  }
  function pathForRect(points: { x: number; z: number }[], y: number): string {
    const pts = points.map((p) => screen(p.x, p.z, y));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
  }

  const rebarPrincipal = getRebar(input.aceroPrincipalDiametroId);
  const rebarDistribucion = getRebar(input.aceroDistribucionDiametroId);
  const sepPrincipalCm = Math.max(input.aceroPrincipalSeparacion, 1);
  const sepDistribucionCm = Math.max(input.aceroDistribucionSeparacion, 1);

  function renderFlight(f: FlightGeom, key: string) {
    const principalW: number[] = [];
    for (let x = sepPrincipalCm / 2; x < f.width; x += sepPrincipalCm) principalW.push(x / f.width);

    const longitudInclinada = Math.sqrt(f.length ** 2 + (f.yEnd - f.yStart) ** 2);
    const distribucionT: number[] = [];
    for (let l = sepDistribucionCm / 2; l < longitudInclinada; l += sepDistribucionCm) distribucionT.push(l / longitudInclinada);

    return (
      <g key={key}>
        <path d={pathForFlight(f, 0)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.14} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        <path d={pathForFlight(f, espesor)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.08} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        {[
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ].map(([wFrac, t], i) => {
          const a = slabScreen(f, wFrac, t, 0);
          const b = slabScreen(f, wFrac, t, espesor);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />;
        })}

        {distribucionT.map((t, i) => {
          const a = slabScreen(f, 0, t, espesor / 2);
          const b = slabScreen(f, 1, t, espesor / 2);
          return <line key={`d-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rebarDistribucion.color} strokeWidth={1.3} opacity={0.9} />;
        })}
        {principalW.map((wFrac, i) => {
          const a = slabScreen(f, wFrac, 0, espesor / 2);
          const b = slabScreen(f, wFrac, 1, espesor / 2);
          return <line key={`p-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rebarPrincipal.color} strokeWidth={1.6} strokeLinecap="round" />;
        })}
      </g>
    );
  }

  const tipoLabel: Record<string, string> = {
    un_tramo: "un tramo",
    dos_tramos: "dos tramos rectos",
    L: "en L (giro de 90°)",
    U: "en U (giro de 180°)",
  };

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[420px]"
        role="img"
        aria-label="Vista isométrica esquemática de la garganta de la escalera"
      >
        {renderFlight(tramo1, "t1")}

        {landingCorners && (
          <>
            <path d={pathForRect(landingCorners, landingY)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.16} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} />
            <path d={pathForRect(landingCorners, landingY + landingEspesorM)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.1} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} />
            {landingCorners.map((c, i) => {
              const a = screen(c.x, c.z, landingY);
              const b = screen(c.x, c.z, landingY + landingEspesorM);
              return <line key={`land-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} opacity={0.6} />;
            })}
          </>
        )}

        {tramo2 && renderFlight(tramo2, "t2")}
      </svg>
      <RotationSlider value={azimuth} onChange={setAzimuth} />
      <p className="mt-1 text-center text-xs text-steel-500">
        Vista isométrica esquemática de la garganta — escalera {tipoLabel[input.tipo]}
        {esMultiTramo && !tramo2 ? " (completa los datos del Tramo 2 y el descanso para verla entera)" : ""}
      </p>
      <p className="text-center text-xs text-steel-500">
        Principal Ø{rebarPrincipal.diameterMm}mm @ {input.aceroPrincipalSeparacion}cm · distribución Ø{rebarDistribucion.diameterMm}mm @ {input.aceroDistribucionSeparacion}cm
      </p>
    </div>
  );
}

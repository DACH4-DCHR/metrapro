import { useState } from "react";
import { getRebar } from "../../lib/materials";
import type { EscaleraInput } from "../../lib/calc/escalera";
import { calcularEscaleraLayout, type FlightFootprint } from "../../lib/calc/escaleraLayout";
import { DIAGRAM_COLORS, isoProjectAt, ISO_DEFAULT_AZIMUTH } from "./svgHelpers";
import { RotationSlider } from "./RotationSlider";

interface EscaleraIsometricProps {
  input: EscaleraInput;
}

const VIEW_W = 320;
const VIEW_H = 260;
const MARGIN = 22;

// Un tramo recto de escalera, con altura, en el espacio (x=ancho perpendicular al
// avance, z/x según "dir" = dirección de avance, y = altura). Extiende la geometría
// en planta (FlightFootprint, compartida con la vista en planta) agregándole la
// pendiente, para que ambas vistas siempre coincidan en la forma del giro.
interface FlightGeom extends FlightFootprint {
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

  const esMultiTramo = input.tipo !== "un_tramo";
  const desarrollo2 =
    esMultiTramo && input.tramo2 ? Math.max(input.tramo2.numeroPeldanos - 1, 0) * input.tramo2.huella : 0;
  const altura2 = esMultiTramo && input.tramo2 ? input.tramo2.numeroPeldanos * input.tramo2.contrahuella : 0;
  const landingLargo = esMultiTramo && input.descanso ? Math.max(input.descanso.largo * 100, 1) : 0;

  const layout = calcularEscaleraLayout(input.tipo, ancho, desarrollo1, desarrollo2, landingLargo);

  const tramo1: FlightGeom = { ...layout.tramo1, yStart: 0, yEnd: altura1 };
  const tramo2: FlightGeom | null =
    layout.tramo2 && altura2 > 0 ? { ...layout.tramo2, yStart: altura1, yEnd: altura1 + altura2 } : null;
  const landingCorners = tramo2 ? layout.landingCorners : null;

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
  const rebarSuperior = getRebar(input.diametroSuperiorId);
  const sepPrincipalCm = Math.max(input.aceroPrincipalSeparacion, 1);
  const sepDistribucionCm = Math.max(input.aceroDistribucionSeparacion, 1);
  const sepSuperiorCm = Math.max(input.separacionSuperior, 1);

  function renderFlight(f: FlightGeom, key: string) {
    const principalW: number[] = [];
    for (let x = sepPrincipalCm / 2; x < f.width; x += sepPrincipalCm) principalW.push(x / f.width);

    const longitudInclinada = Math.sqrt(f.length ** 2 + (f.yEnd - f.yStart) ** 2);
    const distribucionT: number[] = [];
    for (let l = sepDistribucionCm / 2; l < longitudInclinada; l += sepDistribucionCm) distribucionT.push(l / longitudInclinada);

    // Acero superior (bastones): tramos cortos cerca de ambos extremos, en la cara
    // superior de la garganta — refuerzo negativo cerca de los apoyos.
    const superiorW: number[] = [];
    if (input.incluirAceroSuperior) {
      for (let x = 0; x <= f.width + 0.01; x += sepSuperiorCm) superiorW.push(Math.min(x, f.width) / f.width);
    }
    const fracBaston = Math.min((input.longitudBastonSuperior * 100) / f.length, 0.9);

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
        {superiorW.map((wFrac, i) => {
          const aStart = slabScreen(f, wFrac, 0, espesor);
          const aEnd = slabScreen(f, wFrac, fracBaston, espesor);
          const bStart = slabScreen(f, wFrac, 1, espesor);
          const bEnd = slabScreen(f, wFrac, 1 - fracBaston, espesor);
          return (
            <g key={`s-${i}`}>
              <line x1={aStart.x} y1={aStart.y} x2={aEnd.x} y2={aEnd.y} stroke={rebarSuperior.color} strokeWidth={1.5} strokeLinecap="round" />
              <line x1={bStart.x} y1={bStart.y} x2={bEnd.x} y2={bEnd.y} stroke={rebarSuperior.color} strokeWidth={1.5} strokeLinecap="round" />
            </g>
          );
        })}
      </g>
    );
  }

  // Malla del descanso: barras paralelas a "z" (mismo sentido que el Tramo 1, con el
  // diámetro/separación del acero principal) y barras paralelas a "x" (transversales,
  // con el de distribución) — así el acero del Tramo 1 se ve continuar dentro del
  // descanso en vez de quedar cortado, y el Tramo 2 arranca desde una losa ya armada.
  function renderLandingMesh(corners: { x: number; z: number }[], y: number) {
    const xs = corners.map((c) => c.x);
    const zs = corners.map((c) => c.z);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const zMin = Math.min(...zs);
    const zMax = Math.max(...zs);

    const barsZ: number[] = [];
    for (let x = xMin + sepPrincipalCm / 2; x < xMax; x += sepPrincipalCm) barsZ.push(x);
    const barsX: number[] = [];
    for (let z = zMin + sepDistribucionCm / 2; z < zMax; z += sepDistribucionCm) barsX.push(z);

    return (
      <>
        {barsZ.map((x, i) => {
          const a = screen(x, zMin, y + landingEspesorM / 2);
          const b = screen(x, zMax, y + landingEspesorM / 2);
          return <line key={`lz-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rebarPrincipal.color} strokeWidth={1.6} strokeLinecap="round" />;
        })}
        {barsX.map((z, i) => {
          const a = screen(xMin, z, y + landingEspesorM / 2);
          const b = screen(xMax, z, y + landingEspesorM / 2);
          return <line key={`lx-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rebarDistribucion.color} strokeWidth={1.3} opacity={0.9} />;
        })}
      </>
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
            {renderLandingMesh(landingCorners, landingY)}
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
        {input.incluirAceroSuperior && ` · superior Ø${rebarSuperior.diameterMm}mm @ ${input.separacionSuperior}cm`}
      </p>
    </div>
  );
}

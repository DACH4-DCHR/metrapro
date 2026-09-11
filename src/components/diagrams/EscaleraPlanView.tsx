import type { EscaleraInput, TramoInput } from "../../lib/calc/escalera";
import { calcularEscaleraLayout, type FlightFootprint } from "../../lib/calc/escaleraLayout";
import { DIAGRAM_COLORS, fmt, BlueprintGrid } from "./svgHelpers";

interface EscaleraPlanViewProps {
  input: EscaleraInput;
}

const VIEW_W = 340;
const VIEW_H = 300;
const MARGIN = 36;

const tipoLabel: Record<string, string> = {
  un_tramo: "un tramo",
  dos_tramos: "dos tramos rectos",
  L: "en L (giro de 90°)",
  U: "en U (giro de 180°)",
};

export function EscaleraPlanView({ input }: EscaleraPlanViewProps) {
  const ancho = input.anchoEscalera * 100;
  const desarrollo1 = Math.max(input.tramo1.numeroPeldanos - 1, 0) * input.tramo1.huella;

  if (ancho <= 0 || desarrollo1 <= 0) {
    return <p className="text-sm text-steel-500">Ingresa datos válidos del Tramo 1 para ver la vista en planta.</p>;
  }

  const esMultiTramo = input.tipo !== "un_tramo";
  const desarrollo2 =
    esMultiTramo && input.tramo2 ? Math.max(input.tramo2.numeroPeldanos - 1, 0) * input.tramo2.huella : 0;
  const landingLargo = esMultiTramo && input.descanso ? input.descanso.largo * 100 : 0;

  const layout = calcularEscaleraLayout(input.tipo, ancho, desarrollo1, desarrollo2, landingLargo);

  // Puntos de referencia para encuadrar (esquinas de cada tramo + descanso).
  const points: { x: number; z: number }[] = [];
  function pushFlightCorners(f: FlightFootprint) {
    for (const wFrac of [0, 1]) {
      for (const t of [0, 1]) {
        points.push({
          x: f.origin.x + f.dir.x * t * f.length + f.perp.x * wFrac * f.width,
          z: f.origin.z + f.dir.z * t * f.length + f.perp.z * wFrac * f.width,
        });
      }
    }
  }
  pushFlightCorners(layout.tramo1);
  if (layout.tramo2) pushFlightCorners(layout.tramo2);
  if (layout.landingCorners) points.push(...layout.landingCorners);

  const xMin = Math.min(...points.map((p) => p.x));
  const xMax = Math.max(...points.map((p) => p.x));
  const zMin = Math.min(...points.map((p) => p.z));
  const zMax = Math.max(...points.map((p) => p.z));

  const drawW = VIEW_W - 2 * MARGIN;
  const drawH = VIEW_H - 2 * MARGIN;
  const scale = Math.min(drawW / (xMax - xMin || 1), drawH / (zMax - zMin || 1));

  // z creciente se dibuja hacia arriba de la página (sensación de "subir" al avanzar).
  function screen(x: number, z: number): { x: number; y: number } {
    return { x: MARGIN + (x - xMin) * scale, y: MARGIN + (zMax - z) * scale };
  }

  function flightPoint(f: FlightFootprint, wFrac: number, t: number) {
    return {
      x: f.origin.x + f.dir.x * t * f.length + f.perp.x * wFrac * f.width,
      z: f.origin.z + f.dir.z * t * f.length + f.perp.z * wFrac * f.width,
    };
  }
  function pathForFlight(f: FlightFootprint): string {
    const pts = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ].map(([wFrac, t]) => {
      const p = flightPoint(f, wFrac, t);
      return screen(p.x, p.z);
    });
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
  }
  function pathForRect(corners: { x: number; z: number }[]): string {
    const pts = corners.map((c) => screen(c.x, c.z));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
  }

  // Líneas de peldaños: una por cada borde de escalón (huella), perpendiculares al
  // sentido de avance, más una flecha con "SUBE" indicando hacia dónde sube el tramo.
  function stepLines(f: FlightFootprint, tramo: TramoInput) {
    const lines: { a: { x: number; y: number }; b: { x: number; y: number } }[] = [];
    for (let i = 1; i < tramo.numeroPeldanos; i++) {
      const t = (i * tramo.huella) / f.length;
      if (t >= 1) break;
      const p0 = flightPoint(f, 0, t);
      const p1 = flightPoint(f, 1, t);
      lines.push({ a: screen(p0.x, p0.z), b: screen(p1.x, p1.z) });
    }
    return lines;
  }

  function arrow(f: FlightFootprint) {
    const midStart = flightPoint(f, 0.5, 0.15);
    const midEnd = flightPoint(f, 0.5, 0.85);
    const a = screen(midStart.x, midStart.z);
    const b = screen(midEnd.x, midEnd.z);
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const headLen = 7;
    const h1 = {
      x: b.x - headLen * Math.cos(angle - Math.PI / 6),
      y: b.y - headLen * Math.sin(angle - Math.PI / 6),
    };
    const h2 = {
      x: b.x - headLen * Math.cos(angle + Math.PI / 6),
      y: b.y - headLen * Math.sin(angle + Math.PI / 6),
    };
    return { a, b, h1, h2 };
  }

  const flights: { f: FlightFootprint; tramo: TramoInput }[] = [{ f: layout.tramo1, tramo: input.tramo1 }];
  if (layout.tramo2 && input.tramo2) flights.push({ f: layout.tramo2, tramo: input.tramo2 });

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-lg"
        role="img"
        aria-label="Vista en planta de la escalera"
      >
        <BlueprintGrid width={VIEW_W} height={VIEW_H} id="grid-escalera-planta" />

        {flights.map(({ f, tramo }, i) => {
          const arr = arrow(f);
          return (
            <g key={i}>
              <path d={pathForFlight(f)} fill={DIAGRAM_COLORS.concrete} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1.25} />
              {stepLines(f, tramo).map((l, j) => (
                <line key={j} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={0.75} opacity={0.7} />
              ))}
              <line x1={arr.a.x} y1={arr.a.y} x2={arr.b.x} y2={arr.b.y} stroke={DIAGRAM_COLORS.dimText} strokeWidth={1.25} />
              <line x1={arr.b.x} y1={arr.b.y} x2={arr.h1.x} y2={arr.h1.y} stroke={DIAGRAM_COLORS.dimText} strokeWidth={1.25} />
              <line x1={arr.b.x} y1={arr.b.y} x2={arr.h2.x} y2={arr.h2.y} stroke={DIAGRAM_COLORS.dimText} strokeWidth={1.25} />
            </g>
          );
        })}

        {layout.landingCorners && (
          <path d={pathForRect(layout.landingCorners)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.6} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1.25} />
        )}
      </svg>
      <p className="mt-1 text-xs text-steel-500">
        Vista en planta esquemática (no a escala real) — escalera {tipoLabel[input.tipo]} · flecha = sentido de subida
      </p>
      <p className="text-xs text-steel-500">
        Ancho {fmt(input.anchoEscalera, 2)}m · desarrollo T1 {fmt(desarrollo1 / 100, 2)}m
        {layout.tramo2 && ` · desarrollo T2 ${fmt(desarrollo2 / 100, 2)}m`}
      </p>
    </div>
  );
}

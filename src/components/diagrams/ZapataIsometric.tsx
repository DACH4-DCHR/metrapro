import { getRebar } from "../../lib/materials";
import type { ZapataInput } from "../../lib/calc/zapata";
import { DIAGRAM_COLORS, isoProject } from "./svgHelpers";

interface ZapataIsometricProps {
  input: ZapataInput;
}

const VIEW_W = 300;
const VIEW_H = 260;
const MARGIN = 22;

export function ZapataIsometric({ input }: ZapataIsometricProps) {
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
  const projected = boundingRaw.map((p) => isoProject(p.x, p.z, p.y));
  const minX = Math.min(...projected.map((p) => p.x));
  const maxX = Math.max(...projected.map((p) => p.x));
  const minY = Math.min(...projected.map((p) => p.y));
  const maxY = Math.max(...projected.map((p) => p.y));

  const drawW = VIEW_W - 2 * MARGIN;
  const drawH = VIEW_H - 2 * MARGIN;
  const scale = Math.min(drawW / (maxX - minX || 1), drawH / (maxY - minY || 1));

  function screen(x: number, z: number, y: number): { x: number; y: number } {
    const p = isoProject(x, z, y);
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

  function mallaLines(diametroXId: string, sepX: number, diametroYId: string, sepY: number, y: number) {
    const sepXCm = Math.max(sepX, 1);
    const sepYCm = Math.max(sepY, 1);
    const barrasX: number[] = [];
    for (let z = sepXCm / 2; z < anchoCm; z += sepXCm) barrasX.push(z);
    const barrasY: number[] = [];
    for (let x = sepYCm / 2; x < largoCm; x += sepYCm) barrasY.push(x);
    const colorX = getRebar(diametroXId).color;
    const colorY = getRebar(diametroYId).color;
    return (
      <>
        {barrasX.map((z, i) => {
          const a = screen(0, z, y);
          const b = screen(largoCm, z, y);
          return <line key={`x-${y}-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colorX} strokeWidth={1.4} />;
        })}
        {barrasY.map((x, i) => {
          const a = screen(x, 0, y);
          const b = screen(x, anchoCm, y);
          return <line key={`y-${y}-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colorY} strokeWidth={1.4} />;
        })}
      </>
    );
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[280px]"
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
      <p className="mt-1 text-center text-xs text-steel-500">Vista isométrica esquemática (no a escala real)</p>
      <p className="text-center text-xs text-steel-500">
        Malla inferior Ø{getRebar(input.diametroInferiorXId).diameterMm}/Ø{getRebar(input.diametroInferiorYId).diameterMm}mm
        {input.incluirMallaSuperior &&
          ` · malla superior Ø${getRebar(input.diametroSuperiorXId).diameterMm}/Ø${getRebar(input.diametroSuperiorYId).diameterMm}mm`}
      </p>
    </div>
  );
}

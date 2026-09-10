import { getRebar } from "../../lib/materials";
import type { LosaAligeradaInput } from "../../lib/calc/losaAligerada";
import { DIAGRAM_COLORS, isoProject } from "./svgHelpers";

interface LosaAligeradaIsometricProps {
  input: LosaAligeradaInput;
}

const VIEW_W = 320;
const VIEW_H = 260;
const MARGIN = 22;
const NUM_MODULES = 2.4;

export function LosaAligeradaIsometric({ input }: LosaAligeradaIsometricProps) {
  const espesor = input.espesorLosa;
  const s = input.separacionViguetas;
  const b0 = input.anchoVigueta;
  if (espesor <= 0 || s <= 0 || b0 <= 0) {
    return <p className="text-sm text-steel-500">Ingresa dimensiones válidas para ver la vista isométrica.</p>;
  }
  const alturaLadrillo = input.tipoLadrillo === "personalizado" ? input.alturaLadrilloPersonalizado ?? 0 : Number(input.tipoLadrillo);
  const capaCompresion = Math.max(espesor - alturaLadrillo, 0);

  const anchoCm = s * NUM_MODULES; // eje x: ancho representativo (varios módulos de vigueta)
  const largoCm = Math.min(Math.max(2.5 * anchoCm, 90), 400); // eje z: segmento representativo de largo, no a escala real
  const modules = Math.ceil(NUM_MODULES);

  const boundingRaw = [
    { x: 0, z: 0, y: 0 },
    { x: anchoCm, z: 0, y: 0 },
    { x: anchoCm, z: largoCm, y: 0 },
    { x: 0, z: largoCm, y: 0 },
    { x: 0, z: 0, y: espesor },
    { x: anchoCm, z: 0, y: espesor },
    { x: anchoCm, z: largoCm, y: espesor },
    { x: 0, z: largoCm, y: espesor },
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
    { x: anchoCm, z: 0 },
    { x: anchoCm, z: largoCm },
    { x: 0, z: largoCm },
  ];

  // Posiciones de los nervios (viguetas), al centro de cada módulo
  const nerviosCenterX = Array.from({ length: modules }, (_, i) => i * s + b0 / 2);
  const rebarTemp = getRebar(input.temperaturaDiametroId);
  const rebarVigueta = getRebar(input.diametroVarillaViguetaId);

  const tempSepCm = Math.max(input.temperaturaSeparacion, 1);
  const tempZ: number[] = [];
  for (let z = tempSepCm / 2; z < largoCm; z += tempSepCm) tempZ.push(z);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[300px]"
        role="img"
        aria-label="Vista isométrica esquemática de la losa aligerada"
      >
        <path d={pathForTop(footprint, 0, true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.1} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        <path d={pathForTop(footprint, espesor, true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.14} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        {footprint.map((p, i) => {
          const a = screen(p.x, p.z, 0);
          const b = screen(p.x, p.z, espesor);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />;
        })}

        {/* Contorno de cada nervio (vigueta), a lo largo del segmento */}
        {nerviosCenterX.map((cx, i) => {
          const corners = [
            { x: cx - b0 / 2, z: 0 },
            { x: cx + b0 / 2, z: 0 },
          ];
          return corners.map((c, ci) => {
            const a = screen(c.x, 0, 0);
            const b = screen(c.x, largoCm, 0);
            return <line key={`${i}-${ci}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={0.75} opacity={0.5} />;
          });
        })}

        {/* Acero de temperatura: cruza el ancho, cerca de la cara superior */}
        {tempZ.map((z, i) => {
          const a = screen(0, z, espesor - Math.max(capaCompresion / 2, 1.5));
          const b = screen(anchoCm, z, espesor - Math.max(capaCompresion / 2, 1.5));
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rebarTemp.color} strokeWidth={1.3} opacity={0.9} />;
        })}

        {/* Acero principal de vigueta (método por barras): corre a lo largo, dentro del nervio */}
        {input.aceroViguetasMetodo === "barras" &&
          nerviosCenterX.map((cx, i) => {
            const n = Math.max(input.numeroVarillasPorVigueta, 1);
            return Array.from({ length: n }, (_, j) => {
              const offset = n > 1 ? (j - (n - 1) / 2) * (b0 * 0.3) : 0;
              const a = screen(cx + offset, 0, 1.5);
              const b = screen(cx + offset, largoCm, 1.5);
              return <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={rebarVigueta.color} strokeWidth={1.6} strokeLinecap="round" />;
            });
          })}
      </svg>
      <p className="mt-1 text-center text-xs text-steel-500">
        Vista isométrica esquemática (segmento representativo de {modules} nervios, no a escala real)
      </p>
      <p className="text-center text-xs text-steel-500">
        Temperatura Ø{rebarTemp.diameterMm}mm
        {input.aceroViguetasMetodo === "barras" && ` · vigueta ${input.numeroVarillasPorVigueta}Ø${rebarVigueta.diameterMm}mm`}
      </p>
    </div>
  );
}

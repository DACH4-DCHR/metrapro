import { getRebar } from "../../lib/materials";
import { estribosPositionsColumnaM, posicionesBarrasLongitudinales, type ColumnaInput } from "../../lib/calc/columna";
import { DIAGRAM_COLORS, isoProject } from "./svgHelpers";

interface ColumnaIsometricProps {
  input: ColumnaInput;
}

const VIEW_W = 280;
const VIEW_H = 280;
const MARGIN = 22;

function ellipsePathCm(r: number, segments = 48): { x: number; z: number }[] {
  return Array.from({ length: segments }, (_, i) => {
    const angle = (2 * Math.PI * i) / segments;
    return { x: r + r * Math.cos(angle), z: r + r * Math.sin(angle) };
  });
}

export function ColumnaIsometric({ input }: ColumnaIsometricProps) {
  const barPositions = posicionesBarrasLongitudinales(input);
  const n = barPositions.length;
  const recub = input.recubrimiento;

  if (input.tipoSeccion === "rectangular" && (input.base <= 0 || input.peralte <= 0)) {
    return <p className="text-sm text-steel-500">Ingresa una base y peralte válidos para ver la vista isométrica.</p>;
  }
  if (input.tipoSeccion === "circular" && input.diametro <= 0) {
    return <p className="text-sm text-steel-500">Ingresa un diámetro válido para ver la vista isométrica.</p>;
  }
  if (n <= 0) {
    return <p className="text-sm text-steel-500">Ingresa al menos una barra longitudinal para ver la vista isométrica.</p>;
  }

  const isRect = input.tipoSeccion === "rectangular";
  const w = isRect ? input.base : input.diametro;
  const d = isRect ? input.peralte : input.diametro;
  const maxDim = Math.max(w, d);
  const hSeg = Math.min(Math.max(2.6 * maxDim, 70), 320); // altura del segmento esquemático, no a escala real

  const ringOutlineCm = isRect
    ? [
        { x: recub, z: recub },
        { x: w - recub, z: recub },
        { x: w - recub, z: d - recub },
        { x: recub, z: d - recub },
      ]
    : ellipsePathCm(w / 2 - recub);

  // Puntos crudos (en cm, sin proyectar) que definen la caja/cilindro envolvente, para
  // calcular el encuadre (escala + offset) que ajusta todo el dibujo al viewBox.
  const boundingRaw: { x: number; z: number; y: number }[] = isRect
    ? [
        { x: 0, z: 0, y: 0 },
        { x: w, z: 0, y: 0 },
        { x: w, z: d, y: 0 },
        { x: 0, z: d, y: 0 },
        { x: 0, z: 0, y: hSeg },
        { x: w, z: 0, y: hSeg },
        { x: w, z: d, y: hSeg },
        { x: 0, z: d, y: hSeg },
      ]
    : ellipsePathCm(w / 2).flatMap((p) => [
        { x: p.x, z: p.z, y: 0 },
        { x: p.x, z: p.z, y: hSeg },
      ]);

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
    return {
      x: MARGIN + (p.x - minX) * scale,
      y: MARGIN + (p.y - minY) * scale,
    };
  }

  function pathFor(points: { x: number; z: number }[], y: number, close: boolean): string {
    const pts = points.map((p) => screen(p.x, p.z, y));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + (close ? " Z" : "");
  }

  const outlineTop = isRect
    ? [{ x: 0, z: 0 }, { x: w, z: 0 }, { x: w, z: d }, { x: 0, z: d }]
    : ellipsePathCm(w / 2);

  // Posiciones reales de los estribos (mismas que el metrado), reescaladas por fracción
  // de altura al segmento esquemático — así la zona de confinamiento (más juntos en los
  // extremos) y la separación central se ven reflejadas cuando el usuario las cambia.
  const estribosReales = estribosPositionsColumnaM(input);
  const loM = input.incluirConfinamiento ? input.longitudConfinamiento / 100 : 0;
  const stirrupLevels =
    input.alturaLibre > 0
      ? estribosReales.map((posM) => ({
          y: (posM / input.alturaLibre) * hSeg,
          confinado: input.incluirConfinamiento && (posM <= loM || posM >= input.alturaLibre - loM),
        }))
      : [];

  const rebarLabel = `${n} barras`;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-[260px]"
        role="img"
        aria-label="Vista isométrica esquemática de la jaula de acero de la columna"
      >
        {/* Concreto: solo el contorno (ghost), para que se vea el acero a través */}
        <path d={pathFor(outlineTop, 0, true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.12} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        <path d={pathFor(outlineTop, hSeg, true)} fill={DIAGRAM_COLORS.concrete} fillOpacity={0.08} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" />
        {isRect ? (
          outlineTop.map((p, i) => {
            const a = screen(p.x, p.z, 0);
            const b = screen(p.x, p.z, hSeg);
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />;
          })
        ) : (
          (() => {
            const atZero = outlineTop.map((p) => screen(p.x, p.z, 0));
            let leftIdx = 0;
            let rightIdx = 0;
            atZero.forEach((p, i) => {
              if (p.x < atZero[leftIdx].x) leftIdx = i;
              if (p.x > atZero[rightIdx].x) rightIdx = i;
            });
            return [leftIdx, rightIdx].map((idx) => {
              const p = outlineTop[idx];
              const a = screen(p.x, p.z, 0);
              const b = screen(p.x, p.z, hSeg);
              return <line key={idx} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />;
            });
          })()
        )}

        {/* Estribos: todas las posiciones reales, comprimidas al segmento esquemático. Los
            de la zona de confinamiento se dibujan más gruesos y opacos para que la zona se
            note de inmediato, además de estar más juntos entre sí. */}
        {stirrupLevels.map(({ y, confinado }, i) => (
          <path
            key={i}
            d={pathFor(ringOutlineCm, y, true)}
            fill="none"
            stroke={DIAGRAM_COLORS.stirrup}
            strokeWidth={confinado ? 2.25 : 1.4}
            opacity={confinado ? 1 : 0.6}
          />
        ))}

        {/* Acero longitudinal: todas las barras, de piso a techo del segmento, con el
            color y grosor propios de cada diámetro */}
        {barPositions.map((p, i) => {
          const a = screen(p.x, p.z, 0);
          const b = screen(p.x, p.z, hSeg);
          const rebar = getRebar(p.diametroId);
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={rebar.color}
              strokeWidth={Math.max(1.4, 1.4 * (rebar.diameterMm / 16))}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <p className="mt-1 text-center text-xs text-steel-500">
        Vista isométrica esquemática (altura comprimida, no a escala real) — la distribución de estribos sí refleja
        tus valores de separación{input.incluirConfinamiento ? " y confinamiento" : ""}
      </p>
      <p className="text-center text-xs text-steel-500">
        {rebarLabel || "sin barras"} · {estribosReales.length} estribos Ø{getRebar(input.diametroEstribosId).diameterMm}mm por columna
        {input.estribosSuplementarios.length > 0 ? " (no incluye ramas suplementarias, ver sección transversal)" : ""}
      </p>
    </div>
  );
}

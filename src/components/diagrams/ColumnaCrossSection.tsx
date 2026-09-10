import { getRebar } from "../../lib/materials";
import {
  posicionesBarrasLongitudinales,
  posicionesIntermediasCara,
  rangoBarrasEncerradas,
  type ColumnaInput,
} from "../../lib/calc/columna";
import { HDim, VDim, DIAGRAM_COLORS, fmt, BlueprintGrid } from "./svgHelpers";

interface ColumnaCrossSectionProps {
  input: ColumnaInput;
}

const VIEW_W = 280;
const VIEW_H = 300;
const MARGIN_L = 55;
const MARGIN_R = 30;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 50;

// Colores de las ramas de estribo suplementario (familia cálida, distinta a cada Ø
// pero siempre distinguible del estribo perimetral y entre sí).
const SUPLEMENTARIO_COLORS = ["#c2410c", "#991b1b"];

function grupoLabel(input: ColumnaInput): string {
  if (input.tipoSeccion === "circular") {
    return input.barrasLongitudinalesCirculares
      .filter((g) => g.cantidad > 0)
      .map((g) => `${g.cantidad}Ø${getRebar(g.diametroId).diameterMm}mm`)
      .join(" + ");
  }
  const partes = [`4Ø${getRebar(input.diametroEsquinaId).diameterMm}mm esq.`];
  input.barrasCarasPeralteGrupos
    .filter((g) => g.cantidad > 0)
    .forEach((g) => partes.push(`${g.cantidad}Ø${getRebar(g.diametroId).diameterMm}mm c/cara peralte`));
  input.barrasCarasBaseGrupos
    .filter((g) => g.cantidad > 0)
    .forEach((g) => partes.push(`${g.cantidad}Ø${getRebar(g.diametroId).diameterMm}mm c/cara base`));
  return partes.join(" + ");
}

export function ColumnaCrossSection({ input }: ColumnaCrossSectionProps) {
  const recub = input.recubrimiento;
  const barPositionsRaw = posicionesBarrasLongitudinales(input);
  const n = barPositionsRaw.length;

  if (input.tipoSeccion === "rectangular" && (input.base <= 0 || input.peralte <= 0)) {
    return <p className="text-sm text-steel-500">Ingresa una base y peralte válidos para ver la sección.</p>;
  }
  if (input.tipoSeccion === "circular" && input.diametro <= 0) {
    return <p className="text-sm text-steel-500">Ingresa un diámetro válido para ver la sección.</p>;
  }
  if (n === 0) {
    return <p className="text-sm text-steel-500">Ingresa al menos una barra longitudinal para ver la sección.</p>;
  }

  const dbMaxMm = Math.max(...barPositionsRaw.map((p) => getRebar(p.diametroId).diameterMm));

  const drawW = VIEW_W - MARGIN_L - MARGIN_R;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;

  if (input.tipoSeccion === "circular") {
    const diametro = input.diametro;
    const scale = Math.min(drawW / diametro, drawH / diametro);
    const cx = MARGIN_L + (diametro * scale) / 2;
    const cy = MARGIN_TOP + (diametro * scale) / 2;
    const rOuter = (diametro * scale) / 2;
    const recubPx = recub * scale;
    const barRMax = Math.max((dbMaxMm / 10) * scale * 0.5, 3);
    const rFull = diametro / 2;
    const rInsetRatio = Math.max((rFull - recub - barRMax / scale) / rFull, 0);

    const barPositions = barPositionsRaw.map((p) => ({
      ...p,
      x: cx + (p.x - rFull) * rInsetRatio * scale,
      y: cy + (p.z - rFull) * rInsetRatio * scale,
    }));

    return (
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="mx-auto block w-full max-w-[340px]" role="img" aria-label="Sección transversal de columna circular">
          <BlueprintGrid width={VIEW_W} height={VIEW_H} id="grid-columna-circ" />
          <circle cx={cx} cy={cy} r={rOuter} fill={DIAGRAM_COLORS.concrete} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} />
          <circle
            cx={cx}
            cy={cy}
            r={rOuter - recubPx}
            fill="none"
            stroke={DIAGRAM_COLORS.stirrup}
            strokeWidth={Math.max((getRebar(input.diametroEstribosId).diameterMm / 10) * scale * 0.6, 1.5)}
          />
          {barPositions.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={Math.max((getRebar(p.diametroId).diameterMm / 10) * scale * 0.5, 3)}
              fill={getRebar(p.diametroId).color}
            />
          ))}
          <HDim x1={cx - rOuter} x2={cx + rOuter} y={cy + rOuter + 20} label={`Ø${fmt(diametro)}cm`} labelBelow />
        </svg>
        <p className="mt-1 text-xs text-steel-500">
          {grupoLabel(input) || "sin barras"} ({n} und, distribución perimetral) · estribo circular Ø
          {getRebar(input.diametroEstribosId).diameterMm}mm
        </p>
      </div>
    );
  }

  const base = input.base;
  const peralte = input.peralte;
  const scale = Math.min(drawW / base, drawH / peralte);
  const x0 = MARGIN_L;
  const y0 = MARGIN_TOP;
  const w = base * scale;
  const h = peralte * scale;
  const recubPx = recub * scale;
  const barRMaxCm = Math.max((dbMaxMm / 10) * 0.5, 3 / scale);
  const insetCm = recub + barRMaxCm;
  const mapX = (x: number) => insetCm + (x / base) * (base - 2 * insetCm);
  const mapZ = (z: number) => insetCm + (z / peralte) * (peralte - 2 * insetCm);

  const barPositions = barPositionsRaw.map((p) => ({
    ...p,
    x: x0 + mapX(p.x) * scale,
    y: y0 + mapZ(p.z) * scale,
  }));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="mx-auto block w-full max-w-[340px]" role="img" aria-label="Sección transversal de columna">
        <BlueprintGrid width={VIEW_W} height={VIEW_H} id="grid-columna-rect" />
        <rect x={x0} y={y0} width={w} height={h} fill={DIAGRAM_COLORS.concrete} stroke={DIAGRAM_COLORS.concreteStroke} strokeWidth={1} />
        <rect
          x={x0 + recubPx}
          y={y0 + recubPx}
          width={w - 2 * recubPx}
          height={h - 2 * recubPx}
          fill="none"
          stroke={DIAGRAM_COLORS.stirrup}
          strokeWidth={Math.max((getRebar(input.diametroEstribosId).diameterMm / 10) * scale * 0.6, 1.5)}
        />
        {/* Estribos suplementarios: "grapa" se alinea a una barra intermedia real de la
            cara que indica el grupo (o al centro, si esa cara no tiene barras intermedias);
            "cerrado" se dibuja como un segundo estribo, con el mismo contorno que el
            principal pero en su propio color y trazo, para distinguirlo. */}
        {input.estribosSuplementarios.map((s, i) => {
          const strokeW = Math.max((getRebar(s.diametroId).diameterMm / 10) * scale * 0.6, 1.5);
          const color = SUPLEMENTARIO_COLORS[i % SUPLEMENTARIO_COLORS.length];

          if (s.tipo === "cerrado") {
            // Encierra solo las barras intermedias centrales de cada cara con barras (si
            // una cara no tiene, ese lado llega hasta la esquina, igual que el principal).
            const rangoPeralte = rangoBarrasEncerradas(input, "peralte", s.numeroBarrasEncerradas);
            const rangoBase = rangoBarrasEncerradas(input, "base", s.numeroBarrasEncerradas);
            const z0 = rangoPeralte ? rangoPeralte.tMin * peralte : 0;
            const z1 = rangoPeralte ? rangoPeralte.tMax * peralte : peralte;
            const xa = rangoBase ? rangoBase.tMin * base : 0;
            const xb = rangoBase ? rangoBase.tMax * base : base;
            const sx0 = x0 + mapX(xa) * scale;
            const sx1 = x0 + mapX(xb) * scale;
            const sy0 = y0 + mapZ(z0) * scale;
            const sy1 = y0 + mapZ(z1) * scale;
            return (
              <rect
                key={i}
                x={Math.min(sx0, sx1)}
                y={Math.min(sy0, sy1)}
                width={Math.abs(sx1 - sx0)}
                height={Math.abs(sy1 - sy0)}
                fill="none"
                stroke={color}
                strokeWidth={strokeW}
                strokeDasharray="2 2"
              />
            );
          }

          const disponibles = posicionesIntermediasCara(input, s.cara);
          const ramas = Math.max(Math.floor(s.numeroRamas), 0);
          return Array.from({ length: ramas }, (_, r) => {
            const t = disponibles.length > 0 ? disponibles[r % disponibles.length].t : 0.5;
            if (s.cara === "peralte") {
              const y = y0 + mapZ(t * peralte) * scale;
              return (
                <line key={`${i}-${r}`} x1={x0 + mapX(0) * scale} y1={y} x2={x0 + mapX(base) * scale} y2={y} stroke={color} strokeWidth={strokeW} strokeDasharray="5 3" />
              );
            }
            const x = x0 + mapX(t * base) * scale;
            return (
              <line key={`${i}-${r}`} x1={x} y1={y0 + mapZ(0) * scale} x2={x} y2={y0 + mapZ(peralte) * scale} stroke={color} strokeWidth={strokeW} strokeDasharray="5 3" />
            );
          });
        })}
        {barPositions.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={Math.max((getRebar(p.diametroId).diameterMm / 10) * scale * 0.5, 3)}
            fill={getRebar(p.diametroId).color}
          />
        ))}
        <HDim x1={x0} x2={x0 + w} y={y0 + h + 20} label={`b=${fmt(base)}cm`} labelBelow />
        <VDim y1={y0} y2={y0 + h} x={x0 - 20} label={`t=${fmt(peralte)}cm`} />
      </svg>
      <p className="mt-1 text-xs text-steel-500">
        {grupoLabel(input) || "sin barras"} ({n} und total) · estribo Ø{getRebar(input.diametroEstribosId).diameterMm}mm
        {input.estribosSuplementarios.length > 0
          ? ` + ${input.estribosSuplementarios
              .map((s) =>
                s.tipo === "cerrado"
                  ? `${s.numeroRamas} estribo(s) cerrado(s) Ø${getRebar(s.diametroId).diameterMm}mm supl. (encierra ${s.numeroBarrasEncerradas} barras centrales)`
                  : `${s.numeroRamas} grapa(s) Ø${getRebar(s.diametroId).diameterMm}mm (cara ${s.cara})`
              )
              .join(" + ")}`
          : ""}
      </p>
    </div>
  );
}

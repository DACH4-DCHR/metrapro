import { calcularAcabados, type AcabadosInput } from "../../lib/calc/acabados";
import { HDim, VDim, fmt } from "./svgHelpers";

interface AcabadosMurosElevationProps {
  input: AcabadosInput;
}

const VIEW_W = 420;
const VIEW_H = 220;
const MARGIN_L = 55;
const MARGIN_R = 30;
const MARGIN_TOP = 25;
const MARGIN_BOTTOM = 45;

// "Desarrolla" los 4 muros del ambiente en una sola tira (perímetro en el eje
// horizontal, altura en el vertical) — así se ve de un vistazo el área real
// que se tarrajea/pinta, con el hueco de vanos descontado.
export function AcabadosMurosElevation({ input }: AcabadosMurosElevationProps) {
  const { perimetro, areaMurosBruta } = calcularAcabados(input);
  const altura = input.altura;
  if (perimetro <= 0 || altura <= 0) {
    return <p className="text-sm text-steel-500">Ingresa dimensiones válidas para ver el desarrollo de muros.</p>;
  }

  const drawW = VIEW_W - MARGIN_L - MARGIN_R;
  const drawH = VIEW_H - MARGIN_TOP - MARGIN_BOTTOM;
  const scaleX = drawW / perimetro;
  const scaleY = drawH / altura;

  const x0 = MARGIN_L;
  const y0 = MARGIN_TOP;
  const w = perimetro * scaleX;
  const h = altura * scaleY;

  const areaVanos = Math.min(Math.max(input.areaVanos, 0), areaMurosBruta);
  const vanoW = areaVanos > 0 ? (areaVanos / altura) * scaleX : 0;
  const vanoH = h * 0.7;
  const vanoX = x0 + w / 2 - vanoW / 2;
  const vanoY = y0 + h - vanoH;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="mx-auto block w-full max-w-lg"
        role="img"
        aria-label="Desarrollo de muros del ambiente (perímetro por altura)"
      >
        <rect x={x0} y={y0} width={w} height={h} fill="#fdf6e8" stroke="#d98c2b" strokeWidth={1.5} />
        {areaVanos > 0 && (
          <rect
            x={vanoX}
            y={vanoY}
            width={vanoW}
            height={vanoH}
            fill="#ffffff"
            stroke="#647485"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}

        <HDim x1={x0} x2={x0 + w} y={y0 + h + 20} label={`perímetro=${fmt(perimetro, 2)}m`} labelBelow />
        <VDim y1={y0} y2={y0 + h} x={x0 - 20} label={`h=${fmt(altura, 2)}m`} />
      </svg>
      <p className="mt-1 text-xs text-steel-500">
        Desarrollo de los 4 muros (perímetro × altura, no a escala real)
        {areaVanos > 0 ? ` · vanos descontados: ${fmt(areaVanos, 2)} m² (recuadro punteado, posición referencial)` : ""}
      </p>
    </div>
  );
}

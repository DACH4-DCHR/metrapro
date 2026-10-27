import { useMemo, useState } from "react";
import {
  costosPorCategoria,
  cantidadesPorModulo,
  manoObraVsMateriales,
  ACABADOS_MODULO_COLOR,
  ESTRUCTURAL_SECCION_POR_MODULO,
  ESTRUCTURAL_SECCIONES_ORDEN,
  ESTRUCTURAL_SECCION_COLOR,
  MOVILIZACION_COLOR,
} from "../lib/dashboardCharts";
import { useProjectStore } from "../store/projectStore";
import {
  calcularPresupuesto,
  agruparPresupuestoPorModulo,
  valorizarLineas,
  crearLineaMovilizacion,
  presupuestoCustomALineas,
  MOVILIZACION_LABEL,
  PRESUPUESTO_CUSTOM_LABEL,
  GG_ON_KEY,
  UT_ON_KEY,
  IGV_ON_KEY,
  type PresupuestoCustomLine,
  type PresupuestoSeccion,
} from "../lib/presupuesto";
import { consolidateLines } from "../lib/consolidate";
import {
  calcularMetradoMateriales,
  materialesALineas,
  aceroALineas,
  customMaterialesALineas,
  type CustomMaterialLine,
} from "../lib/materiales";
import { agruparAceroPorModulo } from "../lib/calc/aceroResumen";
import { MODULE_GROUP, type ModuleFamily } from "../lib/moduleGroups";
import { priceKey } from "../lib/pricing";
import type { ApuDef } from "../lib/apu";

// La PWA instalada (ícono en el celular) corre en un WebView "standalone" de
// Android que no logra entregarle un archivo a NINGUNA otra app vía Web
// Share — falla con "No se puede compartir, vuelve a intentarlo" en
// WhatsApp, Gmail, etc. por igual (limitación conocida del modo standalone
// de Android, no de esta app). Abrir el mismo sitio en Chrome normal sí
// funciona, así que ahí se evita intentarlo y se descarga directo.
function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  const displayModeStandalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return displayModeStandalone || iosStandalone;
}

// Todos los datos derivados del proyecto (metrados, presupuesto, materiales,
// gráficos) en un solo lugar — lo comparten Resumen, Metrados y Presupuesto
// para no recalcular ni duplicar esta lógica en cada página. Siempre trabaja
// con el proyecto COMPLETO; cada página decide qué mostrar (pestañas
// Todo/Estructural/Acabados son un filtro visual sobre lo que esto ya separó).
export function useProjectData() {
  const projectInfo = useProjectStore((s) => s.projectInfo);
  const setProjectInfo = useProjectStore((s) => s.setProjectInfo);
  const allElements = useProjectStore((s) => s.elements);
  const removeElement = useProjectStore((s) => s.removeElement);
  const prices = useProjectStore((s) => s.prices);
  const setPrice = useProjectStore((s) => s.setPrice);
  const materialesCustom = useProjectStore((s) => s.materialesCustom);
  const setMaterialesCustomStore = useProjectStore((s) => s.setMaterialesCustom);
  const presupuestoCustom = useProjectStore((s) => s.presupuestoCustom);
  const setPresupuestoCustomStore = useProjectStore((s) => s.setPresupuestoCustom);
  const apuOverrides = useProjectStore((s) => s.apuOverrides);
  const setApuOverrideStore = useProjectStore((s) => s.setApuOverride);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);

  const elements = allElements;
  const consolidated = useMemo(() => consolidateLines(elements.map((e) => e.lines)), [elements]);

  const elementosEstructuralesGuardados = useMemo(
    () => elements.filter((e) => MODULE_GROUP[e.module] === "estructural"),
    [elements]
  );
  const elementosAcabadosGuardados = useMemo(
    () => elements.filter((e) => MODULE_GROUP[e.module] === "acabados"),
    [elements]
  );
  const consolidatedEstructural = useMemo(
    () => consolidateLines(elementosEstructuralesGuardados.map((e) => e.lines)),
    [elementosEstructuralesGuardados]
  );
  const consolidatedAcabadosLines = useMemo(
    () => consolidateLines(elementosAcabadosGuardados.map((e) => e.lines)),
    [elementosAcabadosGuardados]
  );

  const aceroPorModulo = useMemo(() => agruparAceroPorModulo(elements), [elements]);
  const elementosSinDesglose = useMemo(
    () => elements.filter((el) => el.steelKg > 0 && (!el.steelByDiameter || el.steelByDiameter.length === 0)),
    [elements]
  );

  const lineaMovilizacion = useMemo(() => crearLineaMovilizacion(), []);
  const presupuestoCustomLineas = useMemo(() => presupuestoCustomALineas(presupuestoCustom), [presupuestoCustom]);
  const presupuesto = useMemo(
    () => calcularPresupuesto(consolidated, prices, [lineaMovilizacion, ...presupuestoCustomLineas], apuOverrides),
    [consolidated, prices, lineaMovilizacion, presupuestoCustomLineas, apuOverrides]
  );
  const presupuestoPorModulo = useMemo(
    () => agruparPresupuestoPorModulo(elements, prices, apuOverrides),
    [elements, prices, apuOverrides]
  );
  const movilizacionValorizado = useMemo(
    () => valorizarLineas([lineaMovilizacion], prices, apuOverrides),
    [lineaMovilizacion, prices, apuOverrides]
  );
  const presupuestoCustomValorizado = useMemo(
    () => valorizarLineas(presupuestoCustomLineas, prices, apuOverrides),
    [presupuestoCustomLineas, prices, apuOverrides]
  );
  const presupuestoSecciones = useMemo<PresupuestoSeccion[]>(
    () => [
      { label: MOVILIZACION_LABEL, rows: movilizacionValorizado.rows, subtotal: movilizacionValorizado.total },
      ...presupuestoPorModulo,
      { label: PRESUPUESTO_CUSTOM_LABEL, rows: presupuestoCustomValorizado.rows, subtotal: presupuestoCustomValorizado.total },
    ],
    [movilizacionValorizado, presupuestoPorModulo, presupuestoCustomValorizado]
  );

  // "Otros" se reparte según el grupo que el usuario elige al agregar cada
  // partida (por defecto "estructural" en líneas guardadas antes de que
  // existiera ese selector) — a diferencia de Movilización, que no tiene
  // dueño y se queda siempre del lado de Metrados Estructurales.
  const presupuestoCustomEstructural = useMemo(
    () => presupuestoCustom.filter((p) => (p.grupo ?? "estructural") === "estructural"),
    [presupuestoCustom]
  );
  const presupuestoCustomAcabados = useMemo(() => presupuestoCustom.filter((p) => p.grupo === "acabados"), [presupuestoCustom]);
  const presupuestoCustomValorizadoEstructural = useMemo(
    () => valorizarLineas(presupuestoCustomALineas(presupuestoCustomEstructural), prices, apuOverrides),
    [presupuestoCustomEstructural, prices, apuOverrides]
  );
  const presupuestoCustomValorizadoAcabados = useMemo(
    () => valorizarLineas(presupuestoCustomALineas(presupuestoCustomAcabados), prices, apuOverrides),
    [presupuestoCustomAcabados, prices, apuOverrides]
  );

  const presupuestoSeccionesEstructural = useMemo<PresupuestoSeccion[]>(
    () => [
      { label: MOVILIZACION_LABEL, rows: movilizacionValorizado.rows, subtotal: movilizacionValorizado.total },
      ...presupuestoPorModulo.filter((g) => MODULE_GROUP[g.module] === "estructural"),
      {
        label: PRESUPUESTO_CUSTOM_LABEL,
        rows: presupuestoCustomValorizadoEstructural.rows,
        subtotal: presupuestoCustomValorizadoEstructural.total,
      },
    ],
    [movilizacionValorizado, presupuestoPorModulo, presupuestoCustomValorizadoEstructural]
  );
  const presupuestoSeccionesAcabados = useMemo<PresupuestoSeccion[]>(() => {
    const grupos = presupuestoPorModulo.filter((g) => MODULE_GROUP[g.module] === "acabados");
    if (presupuestoCustomAcabados.length === 0) return grupos;
    return [
      ...grupos,
      {
        label: PRESUPUESTO_CUSTOM_LABEL,
        rows: presupuestoCustomValorizadoAcabados.rows,
        subtotal: presupuestoCustomValorizadoAcabados.total,
      },
    ];
  }, [presupuestoPorModulo, presupuestoCustomAcabados, presupuestoCustomValorizadoAcabados]);
  const subtotalPresupuestoEstructural = useMemo(
    () => presupuestoSeccionesEstructural.reduce((acc, g) => acc + g.subtotal, 0),
    [presupuestoSeccionesEstructural]
  );
  const subtotalPresupuestoAcabados = useMemo(
    () => presupuestoSeccionesAcabados.reduce((acc, g) => acc + g.subtotal, 0),
    [presupuestoSeccionesAcabados]
  );

  const costosCategoria = useMemo(() => costosPorCategoria(presupuesto.rows), [presupuesto.rows]);
  const otrosCategoriaItem = useMemo(() => costosCategoria.find((c) => c.categoria === "Otros"), [costosCategoria]);
  const otrosAcabadosMonto = presupuestoCustomValorizadoAcabados.total;
  const otrosEstructuralMonto = Math.max((otrosCategoriaItem?.monto ?? 0) - otrosAcabadosMonto, 0);

  const costosEstructurales = useMemo(() => {
    const totalesPorSeccion = new Map<string, number>();
    for (const g of presupuestoPorModulo) {
      const seccion = ESTRUCTURAL_SECCION_POR_MODULO[g.module];
      if (!seccion) continue;
      totalesPorSeccion.set(seccion, (totalesPorSeccion.get(seccion) ?? 0) + g.subtotal);
    }
    const secciones = ESTRUCTURAL_SECCIONES_ORDEN.map((seccion) => {
      const monto = totalesPorSeccion.get(seccion) ?? 0;
      return {
        categoria: seccion as string,
        monto,
        pct: presupuesto.costoDirecto > 0 ? (monto / presupuesto.costoDirecto) * 100 : 0,
        color: ESTRUCTURAL_SECCION_COLOR[seccion],
      };
    }).filter((c) => c.monto > 0);

    const movilizacionMonto = movilizacionValorizado.total;
    const items = [...secciones];
    if (movilizacionMonto > 0) {
      items.unshift({
        categoria: MOVILIZACION_LABEL,
        monto: movilizacionMonto,
        pct: presupuesto.costoDirecto > 0 ? (movilizacionMonto / presupuesto.costoDirecto) * 100 : 0,
        color: MOVILIZACION_COLOR,
      });
    }
    if (otrosEstructuralMonto > 0) {
      items.push({
        categoria: PRESUPUESTO_CUSTOM_LABEL,
        monto: otrosEstructuralMonto,
        pct: presupuesto.costoDirecto > 0 ? (otrosEstructuralMonto / presupuesto.costoDirecto) * 100 : 0,
        color: otrosCategoriaItem?.color ?? "#008300",
      });
    }
    return items;
  }, [presupuestoPorModulo, presupuesto.costoDirecto, movilizacionValorizado, otrosEstructuralMonto, otrosCategoriaItem]);

  const costosAcabadosCategoria = useMemo(() => {
    const modulos = presupuestoPorModulo
      .filter((g) => MODULE_GROUP[g.module] === "acabados" && g.subtotal > 0)
      .map((g) => ({
        categoria: g.label,
        monto: g.subtotal,
        pct: presupuesto.costoDirecto > 0 ? (g.subtotal / presupuesto.costoDirecto) * 100 : 0,
        color: ACABADOS_MODULO_COLOR[g.module as keyof typeof ACABADOS_MODULO_COLOR] ?? "#4a3aa7",
      }));
    if (otrosAcabadosMonto <= 0) return modulos;
    return [
      ...modulos,
      {
        categoria: PRESUPUESTO_CUSTOM_LABEL,
        monto: otrosAcabadosMonto,
        pct: presupuesto.costoDirecto > 0 ? (otrosAcabadosMonto / presupuesto.costoDirecto) * 100 : 0,
        color: otrosCategoriaItem?.color ?? "#008300",
      },
    ];
  }, [presupuestoPorModulo, otrosAcabadosMonto, presupuesto.costoDirecto, otrosCategoriaItem]);

  const subtotalCostosEstructurales = useMemo(() => costosEstructurales.reduce((acc, c) => acc + c.monto, 0), [costosEstructurales]);
  const subtotalCostosAcabados = useMemo(() => costosAcabadosCategoria.reduce((acc, c) => acc + c.monto, 0), [costosAcabadosCategoria]);

  const manoObraMateriales = useMemo(() => manoObraVsMateriales(presupuesto.rows), [presupuesto.rows]);
  const cantidadesModulo = useMemo(() => cantidadesPorModulo(elements), [elements]);
  const concretoPorModulo = useMemo(
    () =>
      cantidadesModulo
        .filter((m) => m.concreteM3 > 0)
        .sort((a, b) => b.concreteM3 - a.concreteM3)
        .map((m) => ({ label: m.label, value: m.concreteM3, color: "#2a78d6" })),
    [cantidadesModulo]
  );
  const aceroPorModuloChart = useMemo(
    () =>
      cantidadesModulo
        .filter((m) => m.steelKg > 0)
        .sort((a, b) => b.steelKg - a.steelKg)
        .map((m) => ({ label: m.label, value: m.steelKg, color: "#eb6834" })),
    [cantidadesModulo]
  );
  const encofradoPorModulo = useMemo(
    () =>
      cantidadesModulo
        .filter((m) => m.formworkM2 > 0)
        .sort((a, b) => b.formworkM2 - a.formworkM2)
        .map((m) => ({ label: m.label, value: m.formworkM2, color: "#1baf7a" })),
    [cantidadesModulo]
  );

  const materiales = useMemo(() => calcularMetradoMateriales(consolidated, elements), [consolidated, elements]);
  const materialesLines = useMemo(() => materialesALineas(materiales), [materiales]);
  const customLineas = useMemo(() => customMaterialesALineas(materialesCustom), [materialesCustom]);
  const aceroLineas = useMemo(() => aceroALineas(materiales), [materiales]);

  const derivedValorizado = useMemo(() => valorizarLineas(materialesLines, prices), [materialesLines, prices]);
  const customValorizado = useMemo(() => valorizarLineas(customLineas, prices), [customLineas, prices]);
  const aceroValorizado = useMemo(() => valorizarLineas(aceroLineas, prices), [aceroLineas, prices]);
  const costoTotalMateriales = derivedValorizado.total + customValorizado.total + aceroValorizado.total;

  const materialesExportLines = useMemo(() => [...materialesLines, ...customLineas, ...aceroLineas], [materialesLines, customLineas, aceroLineas]);

  const materialesFootRowsExcel = useMemo(() => {
    const rows: (string | number)[][] = materiales.acero.map((r) => [
      `Varillas Ø ${r.symbol} x 9m (habilitación)`,
      "und",
      r.numeroVarillas,
      "",
      "",
    ]);
    rows.push(["", "", "", "Costo total de materiales (S/.)", Number(costoTotalMateriales.toFixed(2))]);
    return rows;
  }, [materiales.acero, costoTotalMateriales]);

  function addCustomMaterial(partida: string, unidad: string, cantidad: number) {
    const item: CustomMaterialLine = { id: crypto.randomUUID(), partida, unidad, cantidad };
    setMaterialesCustomStore([...materialesCustom, item]);
  }
  function removeCustomMaterial(id: string) {
    setMaterialesCustomStore(materialesCustom.filter((m) => m.id !== id));
  }

  function addCustomPresupuestoLine(partida: string, unidad: string, cantidad: number, grupo?: ModuleFamily) {
    const item: PresupuestoCustomLine = { id: crypto.randomUUID(), partida, unidad, cantidad, grupo };
    setPresupuestoCustomStore([...presupuestoCustom, item]);
  }
  function removeCustomPresupuestoLine(id: string) {
    setPresupuestoCustomStore(presupuestoCustom.filter((p) => p.id !== id));
  }

  // apu=null desactiva explícitamente el APU de esa partida (vuelve a precio
  // manual aunque exista una plantilla por defecto para su tipo).
  function setApuOverride(partida: string, unidad: string, apu: ApuDef | null) {
    setApuOverrideStore(priceKey(partida, unidad), apu);
  }

  const safeProjectName = (projectInfo.nombreObra || "proyecto").replace(/[\\/:*?"<>|]/g, "_");

  function setGGOn(on: boolean) {
    setPrice(GG_ON_KEY, on ? 1 : 0);
  }
  function setUTOn(on: boolean) {
    setPrice(UT_ON_KEY, on ? 1 : 0);
  }
  function setIGVOn(on: boolean) {
    setPrice(IGV_ON_KEY, on ? 1 : 0);
  }

  async function handleDownloadPdf() {
    setGeneratingPdf(true);
    try {
      const { generatePdfReport } = await import("../lib/reports/pdfReport");
      generatePdfReport(projectInfo, allElements, consolidated, prices, materialesExportLines, materiales.totalVarillas, presupuestoCustom);
    } finally {
      setGeneratingPdf(false);
    }
  }

  // Usa el panel nativo de compartir del sistema operativo (navigator.share),
  // que deja elegir WhatsApp, Telegram, correo o cualquier otra app instalada
  // — no es específico de WhatsApp, por eso el botón dice "Enviar".
  async function handleSharePdf() {
    setSharingPdf(true);
    try {
      if (isStandaloneApp()) {
        const { generatePdfReport } = await import("../lib/reports/pdfReport");
        generatePdfReport(projectInfo, allElements, consolidated, prices, materialesExportLines, materiales.totalVarillas, presupuestoCustom);
        alert(
          "La app instalada no puede compartir archivos directamente (una limitación de Android). Se descargó el PDF: ábrelo desde tus Descargas y compártelo manualmente, o entra a metrapro.vercel.app desde Chrome (sin usar el ícono instalado) para enviarlo en un solo paso."
        );
        return;
      }

      const { sharePdfReport } = await import("../lib/reports/pdfReport");
      const shared = await sharePdfReport(
        projectInfo,
        allElements,
        consolidated,
        prices,
        materialesExportLines,
        materiales.totalVarillas,
        presupuestoCustom
      );
      if (!shared) {
        alert('Tu navegador no permite compartir archivos directamente. Usa el botón "Descargar PDF" y adjúntalo manualmente donde quieras enviarlo.');
      }
    } catch {
      alert("No se pudo enviar el PDF. Intenta descargarlo con el botón de al lado.");
    } finally {
      setSharingPdf(false);
    }
  }

  return {
    projectInfo,
    setProjectInfo,
    allElements,
    elements,
    removeElement,
    prices,
    setPrice,
    materialesCustom,
    presupuestoCustom,
    apuOverrides,
    setApuOverride,
    generatingPdf,
    sharingPdf,
    consolidated,
    elementosEstructuralesGuardados,
    elementosAcabadosGuardados,
    consolidatedEstructural,
    consolidatedAcabadosLines,
    aceroPorModulo,
    elementosSinDesglose,
    presupuesto,
    presupuestoPorModulo,
    presupuestoSecciones,
    presupuestoCustomEstructural,
    presupuestoCustomAcabados,
    presupuestoSeccionesEstructural,
    presupuestoSeccionesAcabados,
    subtotalPresupuestoEstructural,
    subtotalPresupuestoAcabados,
    costosCategoria,
    costosEstructurales,
    costosAcabadosCategoria,
    subtotalCostosEstructurales,
    subtotalCostosAcabados,
    manoObraMateriales,
    cantidadesModulo,
    concretoPorModulo,
    aceroPorModuloChart,
    encofradoPorModulo,
    materiales,
    materialesLines,
    materialesExportLines,
    derivedValorizado,
    customValorizado,
    aceroValorizado,
    costoTotalMateriales,
    materialesFootRowsExcel,
    addCustomMaterial,
    removeCustomMaterial,
    addCustomPresupuestoLine,
    removeCustomPresupuestoLine,
    safeProjectName,
    setGGOn,
    setUTOn,
    setIGVOn,
    handleDownloadPdf,
    handleSharePdf,
  };
}

export type ProjectData = ReturnType<typeof useProjectData>;

// Contenido de la ayuda "?" de cada módulo: explica en lenguaje simple qué
// significa cada dato y de dónde sacarlo, para quien tenga dudas al llenar el
// formulario. Se muestra desde PageHeader (prop helpKey) en un panel lateral.
import type { ModuleType } from "./types";

export type HelpKey = ModuleType | "dashboard";

export interface HelpItem {
  label: string;
  text: string;
}

export interface HelpSection {
  heading: string;
  items: HelpItem[];
}

export interface HelpContent {
  title: string;
  summary: string;
  sections: HelpSection[];
}

export const HELP_CONTENT: Record<HelpKey, HelpContent> = {
  dashboard: {
    title: "Dashboard del proyecto",
    summary:
      "Aquí se juntan todos los elementos que calculaste y guardaste en los distintos módulos: el resumen general, el cuadro de metrados consolidado, el acero por diámetro y el presupuesto referencial.",
    sections: [
      {
        heading: "Cómo funciona",
        items: [
          {
            label: "Elementos guardados",
            text: "Cada vez que calculas algo en un módulo (zapatas, vigas, losas, etc.) y presionas 'Agregar a la lista', aparece aquí como una fila. Puedes tener varios elementos del mismo módulo (ej. 2 grupos de zapatas distintos).",
          },
          {
            label: "Cuadro de metrados consolidado",
            text: "Suma automáticamente las partidas repetidas de todos los elementos guardados (ej. si dos módulos usan Ø8mm, el kg total se suma en una sola línea).",
          },
          {
            label: "Presupuesto referencial",
            text: "Cada partida trae un precio unitario editable (S/.). Puedes activar Gastos Generales, Utilidad e IGV con su checkbox y porcentaje, para llegar a un Total General.",
          },
          {
            label: "Exportar Excel / PDF",
            text: "Genera un archivo descargable con todo lo anterior, usando los datos del proyecto (nombre de obra, cliente, logo) que llenes arriba.",
          },
        ],
      },
    ],
  },

  movimientoTierras: {
    title: "Movimiento de Tierras",
    summary:
      "Calcula la excavación, el relleno compactado y la eliminación de material excedente para una cimentación, cuando quieres metrarlo por separado (sin pasar por Zapatas, Cimiento Corrido o Vigas de Cimentación, que ya lo calculan solos).",
    sections: [
      {
        heading: "Geometría de la excavación",
        items: [
          {
            label: "Tipo de excavación",
            text: "'Zapata aislada' ensancha el pozo en las dos direcciones (largo y ancho). 'Zanja continua' (cimiento corrido / viga de cimentación) solo ensancha el ancho, porque el largo es la longitud del tramo. 'General' es lo mismo que zanja, para casos libres.",
          },
          {
            label: "Longitud / Ancho neto",
            text: "Las medidas de la cimentación real (sin el sobreancho). Si ya calculaste esa zapata o cimiento en su propio módulo, usa esas mismas medidas.",
          },
          {
            label: "Profundidad",
            text: "Desde el nivel de terreno hasta el fondo de la excavación. La norma sugiere un mínimo de 0.80 m si no tienes estudio de suelos.",
          },
          {
            label: "Sobreancho de trabajo",
            text: "Holgura extra por lado para poder encofrar y compactar el relleno; 10 cm es lo típico.",
          },
        ],
      },
      {
        heading: "Relleno y eliminación",
        items: [
          {
            label: "Por altura de la cimentación (recomendado)",
            text: "Ingresas solo el peralte/altura del concreto en cm, y la app calcula el volumen usando el largo x ancho que ya pusiste arriba.",
          },
          {
            label: "Por volumen directo",
            text: "Para cimentaciones de forma irregular: escribes tú mismo el volumen de concreto que ocupará el hueco.",
          },
          {
            label: "Esponjamiento del material",
            text: "El material excavado aumenta de volumen al sacarlo (no vuelve a compactarse igual); 25-30% es lo típico para calcular cuánto hay que eliminar/acarrear.",
          },
        ],
      },
    ],
  },

  zapata: {
    title: "Zapatas Aisladas",
    summary: "Metra el concreto, encofrado, acero de la malla y (opcionalmente) el movimiento de tierras de un grupo de zapatas iguales.",
    sections: [
      {
        heading: "Geometría",
        items: [
          { label: "N° de zapatas", text: "Cuántas zapatas idénticas tiene este grupo; si varían de tamaño, crea otro grupo aparte." },
          { label: "Largo (X) / Ancho (Y)", text: "Las dimensiones en planta de la zapata, vistas desde arriba." },
          { label: "Peralte", text: "El espesor (altura) de la zapata; mínimo 30 cm apoyada sobre el suelo." },
          { label: "Recubrimiento", text: "Distancia del acero al borde de concreto; mínimo 7.5 cm por estar en contacto con el suelo." },
        ],
      },
      {
        heading: "Acero de refuerzo",
        items: [
          { label: "Malla inferior", text: "El acero principal, siempre presente: un diámetro/separación en dirección X (paralelo al largo) y otro en Y (paralelo al ancho)." },
          { label: "Malla superior", text: "Solo necesaria si la zapata trabaja con momento (excéntrica o de columna de esquina/borde)." },
          { label: "Gancho estándar en extremos", text: "Dobla las barras 90° cerca del borde para mejor anclaje; indica en cuántos extremos de cada barra (0, 1 ó 2)." },
        ],
      },
      {
        heading: "Movimiento de tierras",
        items: [
          {
            label: "Incluir excavación/relleno/eliminación",
            text: "Si lo activas, no necesitas ir al módulo aparte de Movimiento de Tierras: se calcula solo con la profundidad de excavación y el sobreancho que ingreses aquí, usando el mismo volumen de concreto ya calculado arriba.",
          },
        ],
      },
    ],
  },

  cimientoCorrido: {
    title: "Cimiento Corrido",
    summary: "Metra el concreto ciclópeo (con piedra grande desplazadora) de la cimentación continua bajo un muro portante, y opcionalmente su movimiento de tierras.",
    sections: [
      {
        heading: "Geometría",
        items: [
          { label: "Longitud total", text: "Suma de todos los tramos de cimiento corrido de tu proyecto (puedes sumar tramos de distintos muros aquí)." },
          { label: "Ancho", text: "El ancho de la zanja/cimiento; típico 40-60 cm según la capacidad portante del suelo." },
          { label: "Altura / profundidad", text: "La altura del cimiento corrido, de fondo a la superficie donde empieza el sobrecimiento." },
          { label: "% Piedra grande (P.G.)", text: "Porcentaje del volumen que es piedra grande desplazadora; máximo 30%, típico 30%." },
        ],
      },
      {
        heading: "Movimiento de tierras",
        items: [
          {
            label: "Incluir excavación/relleno/eliminación",
            text: "Actívalo para que la excavación de la zanja se calcule aquí mismo (ancho + sobreancho, largo = tu longitud total), sin ir al módulo aparte.",
          },
        ],
      },
    ],
  },

  sobrecimiento: {
    title: "Sobrecimiento",
    summary: "Metra el concreto ciclópeo (con piedra mediana) del tramo entre el cimiento corrido y el nivel de piso terminado.",
    sections: [
      {
        heading: "Geometría",
        items: [
          { label: "Longitud total", text: "Suma de todos los tramos de sobrecimiento del proyecto." },
          { label: "Ancho (espesor de muro)", text: "Debe ser igual al espesor del muro que va a soportar encima." },
          { label: "Altura", text: "Desde el cimiento corrido hasta el nivel de piso terminado (NPT)." },
          { label: "% Piedra mediana (P.M.)", text: "Porcentaje del volumen que es piedra mediana; máximo 30%, típico 25%." },
        ],
      },
    ],
  },

  vigaCimentacion: {
    title: "Vigas de Cimentación",
    summary: "Metra el concreto, encofrado y acero (longitudinal + estribos) de vigas que conectan zapatas o cabezales, y opcionalmente su movimiento de tierras.",
    sections: [
      {
        heading: "Geometría",
        items: [
          { label: "N° de vigas", text: "Cuántas vigas idénticas tiene este grupo." },
          { label: "Luz libre entre apoyos", text: "El tramo de concreto que realmente se vacía, entre una zapata/cabezal y otro." },
          { label: "Base / Altura", text: "Las dimensiones de la sección transversal." },
        ],
      },
      {
        heading: "Acero de refuerzo",
        items: [
          { label: "Barras inferiores / superiores / laterales", text: "Los tres grupos de acero longitudinal; laterales son el acero de piel, solo si la viga es de gran peralte." },
          { label: "Gancho en extremos discontinuos", text: "Para barras que no continúan a otro elemento; agrega longitud de anclaje en los extremos indicados." },
          {
            label: "Prolongar acero dentro de la zapata",
            text: "Actívalo cuando la viga llega al mismo nivel que el fondo de una zapata: el concreto se metra solo hasta la luz libre, pero el acero longitudinal sigue recto hasta la columna (solo se agrega longitud de acero, no de concreto).",
          },
          { label: "Ø y separación de estribos", text: "Estribo cerrado uniforme en toda la longitud (incluyendo el tramo de prolongación, si la activaste)." },
        ],
      },
      {
        heading: "Movimiento de tierras",
        items: [
          {
            label: "Incluir excavación/relleno/eliminación",
            text: "Calcula la zanja de esta viga (ancho = base + sobreancho, largo = luz libre) usando el mismo volumen de concreto ya calculado arriba.",
          },
        ],
      },
    ],
  },

  columna: {
    title: "Columnas",
    summary: "Metra el concreto, encofrado y acero (longitudinal + estribos) de un grupo de columnas rectangulares o circulares, con confinamiento sismorresistente.",
    sections: [
      {
        heading: "Geometría",
        items: [
          { label: "N° de columnas / Altura libre", text: "Cuántas columnas idénticas y la altura de entrepiso que deben cubrir." },
          { label: "Tipo de sección", text: "Rectangular/cuadrada (Base x Peralte) o circular (Diámetro)." },
        ],
      },
      {
        heading: "Acero longitudinal",
        items: [
          {
            label: "Barra de esquina (rectangular)",
            text: "Siempre hay 4, una en cada esquina; luego agregas grupos adicionales por cara de peralte o de base si necesitas más barras intermedias.",
          },
          { label: "Barras longitudinales (circular)", text: "Se reparten uniformemente en el perímetro de la columna." },
          {
            label: "Estribos suplementarios",
            text: "Grapas o estribos cerrados adicionales para amarrar barras intermedias en columnas grandes; 'grapa' amarra una barra desde una cara, 'cerrado' encierra varias barras centrales.",
          },
        ],
      },
      {
        heading: "Confinamiento sismorresistente",
        items: [
          {
            label: "Sistema sismorresistente",
            text: "Elige si el edificio se sostiene principalmente con muros o con pórticos/sistema dual; cambia los valores sugeridos de confinamiento según la norma.",
          },
          { label: "Longitud de confinamiento (Lo)", text: "Zona cerca de cada extremo (nudo) donde los estribos van más juntos." },
          { label: "Separación en zona confinada (So) / central", text: "Separación de estribos dentro y fuera de la zona Lo; la app sugiere valores según tu sección y diámetro, pero puedes ajustarlos." },
        ],
      },
    ],
  },

  placa: {
    title: "Placas (Muros Estructurales)",
    summary: "Metra el concreto, encofrado y acero de un grupo de placas (muros de concreto armado que resisten sismo), con su refuerzo distribuido y elementos de borde.",
    sections: [
      {
        heading: "Geometría",
        items: [
          { label: "N° de muros / Longitud / Altura libre", text: "Cuántas placas idénticas, su largo en planta y la altura de entrepiso." },
          { label: "Espesor", text: "Espesor del muro; mínimo sugerido 15 cm." },
          { label: "Tipo de muro", text: "Estructural o de ductilidad limitada, según qué artículo de la E.060 aplica a tu proyecto." },
        ],
      },
      {
        heading: "Refuerzo distribuido (alma)",
        items: [
          { label: "N° de capas", text: "1 capa o 2 (obligatorio si el espesor es 20 cm o más)." },
          { label: "Ø y separación vertical/horizontal", text: "El acero repartido en toda la superficie del muro, en ambas direcciones." },
        ],
      },
      {
        heading: "Elementos de borde",
        items: [
          {
            label: "Incluir elementos de borde",
            text: "Actívalo en los extremos de la placa que necesitan confinamiento especial (columnas embebidas en los bordes del muro).",
          },
          { label: "Ancho del elemento de borde / barras / estribos", text: "La sección y refuerzo de ese extremo confinado, con su propio Ø y separación de estribos." },
        ],
      },
    ],
  },

  muroAlbanileria: {
    title: "Muros de Albañilería Confinada",
    summary: "Metra el muro de ladrillo (unidades + mortero) y sus columnas y solera de confinamiento de concreto armado (NTE E.070).",
    sections: [
      {
        heading: "Geometría",
        items: [
          { label: "Longitud de muro / Altura libre", text: "Las dimensiones del paño de muro." },
          { label: "Espesor efectivo", text: "El espesor final del muro terminado; debe superar el mínimo sugerido (h/20)." },
        ],
      },
      {
        heading: "Unidad de albañilería",
        items: [
          {
            label: "Tipo de ladrillo",
            text: "Elige del catálogo (King Kong, huecos, etc.) para autocompletar largo/alto/espesor, o 'Personalizado' para ingresar los datos de tu proveedor.",
          },
          { label: "Junta de mortero / Desperdicio", text: "El espesor de la junta entre ladrillos y el % de merma que se suma al metrado de unidades." },
        ],
      },
      {
        heading: "Columnas y soleras de confinamiento",
        items: [
          {
            label: "Incluir confinamiento",
            text: "Obligatorio en muros portantes; si lo desactivas, solo se metra el muro de ladrillo (uso no estructural).",
          },
          { label: "N° de columnas / Peralte", text: "Mínimo 2 columnas por paño, y peralte mínimo 25 cm." },
          { label: "Separación en extremos / zona central", text: "Los estribos van más juntos cerca de los extremos de la columna (zona confinada) y más espaciados en el resto." },
        ],
      },
    ],
  },

  losa: {
    title: "Losa Aligerada",
    summary: "Metra el concreto, ladrillo de techo, encofrado y acero (viguetas + malla de temperatura + bastones) de una losa aligerada en una dirección.",
    sections: [
      {
        heading: "Geometría",
        items: [
          { label: "Largo / Ancho", text: "Las dimensiones del paño de losa." },
          { label: "Espesor de losa", text: "El espesor total (ladrillo + capa de compresión superior)." },
          { label: "Separación de viguetas / Ancho de vigueta", text: "La distancia entre ejes de vigueta y el ancho de cada nervio de concreto." },
          { label: "Tipo y material de ladrillo", text: "La altura del ladrillo de techo (define el espesor de la losa) y si es de arcilla o de concreto (cambia el peso)." },
        ],
      },
      {
        heading: "Acero",
        items: [
          { label: "Malla de temperatura", text: "El acero repartido en la capa de compresión, perpendicular a las viguetas." },
          {
            label: "Acero de viguetas: por barras o por ratio",
            text: "'N° de barras por vigueta' te deja definir cuántas y de qué diámetro; 'Ratio (kg/m²)' es un estimado rápido cuando no tienes el detalle del acero, sin desglose por diámetro.",
          },
          {
            label: "Acero negativo (bastones)",
            text: "Refuerzo superior cerca de los apoyos continuos, para el momento negativo; indica cuántos bastones por vigueta y su longitud.",
          },
        ],
      },
    ],
  },

  losaMaciza: {
    title: "Losa Maciza",
    summary: "Metra el concreto, encofrado y acero de una losa maciza armada en dos direcciones, con malla inferior y (opcional) superior.",
    sections: [
      {
        heading: "Geometría",
        items: [
          { label: "Largo / Ancho / Espesor", text: "Las dimensiones del paño de losa." },
          {
            label: "Tipo de apoyo",
            text: "Define el peralte mínimo sugerido según la condición de borde: simplemente apoyada (L/20), un extremo continuo (L/24), ambos continuos (L/28) o en voladizo (L/10).",
          },
        ],
      },
      {
        heading: "Acero",
        items: [
          { label: "Malla inferior (principal + temperatura)", text: "El acero de fondo, siempre presente, en las dos direcciones." },
          { label: "Malla superior", text: "Opcional; se usa en losas continuas o con momento negativo en los apoyos." },
        ],
      },
    ],
  },

  escalera: {
    title: "Escaleras",
    summary: "Metra el concreto, encofrado y acero de una escalera de un tramo, dos tramos, en L o en U, incluyendo el descanso y el acero superior (bastones).",
    sections: [
      {
        heading: "Datos generales",
        items: [
          {
            label: "Tipo de escalera",
            text: "Al cambiarlo, la app recalcula sola el número de peldaños de cada tramo para que la altura siga cuadrando con la altura entre pisos.",
          },
          { label: "Altura entre pisos / Ancho", text: "La altura total a salvar y el ancho libre de la escalera." },
          { label: "Espesor losa inclinada", text: "El espesor de la garganta de la escalera (la losa inclinada, sin contar los peldaños)." },
        ],
      },
      {
        heading: "Peldaños",
        items: [
          { label: "N° de peldaños / Huella / Contrahuella", text: "Huella x Contrahuella debe dar un paso cómodo; la contrahuella se ajusta sola al cambiar el tipo de escalera." },
          { label: "Descanso (landing)", text: "Solo aparece en escaleras de 2+ tramos; ancho, largo y espesor del descanso intermedio." },
        ],
      },
      {
        heading: "Acero de refuerzo",
        items: [
          { label: "Acero principal / distribución", text: "El principal sigue la pendiente de la escalera; el de distribución va transversal." },
          {
            label: "Acero superior (bastones)",
            text: "Refuerzo negativo cerca de los apoyos, igual patrón que en losa aligerada; actívalo si tu escalera tiene continuidad en los extremos.",
          },
        ],
      },
    ],
  },

  muroArquitectura: {
    title: "Muros de Arquitectura (Tabiquería)",
    summary: "Metra el muro de ladrillo no portante (tabiquería) y, si el paño es largo o queda expuesto a volteo, sus columnetas de arriostre.",
    sections: [
      {
        heading: "Geometría",
        items: [
          { label: "Longitud de muro / Altura libre", text: "Las dimensiones del paño." },
          { label: "Área de vanos", text: "Área de puertas y ventanas a descontar del área bruta del muro." },
        ],
      },
      {
        heading: "Unidad de albañilería",
        items: [
          {
            label: "Tipo de ladrillo",
            text: "Elige del catálogo (pandereta, huecos, etc.) para autocompletar largo/alto/espesor, o 'Personalizado' para tu proveedor.",
          },
        ],
      },
      {
        heading: "Arriostres (columnetas)",
        items: [
          {
            label: "Incluir columnetas de arriostre",
            text: "Actívalo en paños largos o expuestos a volteo (E.070 Art. 71/81); a diferencia de los muros de albañilería confinada, aquí no es obligatorio en todos los paños.",
          },
        ],
      },
    ],
  },

  acabados: {
    title: "Acabados: Tarrajeo y Pintura",
    summary:
      "Metra el tarrajeo y la pintura de un ambiente (cuarto, baño, sala, etc.) a partir de sus dimensiones: el área de muros y de cielorraso se calculan solas.",
    sections: [
      {
        heading: "Dimensiones del ambiente",
        items: [
          { label: "Largo / Ancho", text: "Las medidas en planta del ambiente; de ahí sale el área de piso/cielorraso." },
          { label: "Altura", text: "Del piso terminado al cielorraso; junto al perímetro da el área bruta de muros." },
          {
            label: "Área de vanos",
            text: "Área de puertas y ventanas del ambiente, para descontarla del área de muros — si no la descuentas, el tarrajeo y la pintura salen sobrestimados.",
          },
        ],
      },
      {
        heading: "Partidas a incluir",
        items: [
          {
            label: "Tarrajeo / Pintura de muros y de cielorraso",
            text: "Actívalas por separado según lo que necesite tu proyecto — por ejemplo, puedes tarrajear sin pintar todavía, o pintar un cielorraso de drywall sin tarrajearlo.",
          },
        ],
      },
    ],
  },

  viga: {
    title: "Vigas",
    summary: "Metra el concreto, encofrado y acero (longitudinal + estribos) de un grupo de vigas rectangulares, T o de sección personalizada.",
    sections: [
      {
        heading: "Geometría",
        items: [
          { label: "N° de vigas / Longitud", text: "Cuántas vigas idénticas y su longitud." },
          { label: "Base / Altura", text: "Sección rectangular base." },
          { label: "Tipo de sección", text: "Rectangular, T invertida (con ala) o personalizada (ingresas área y perímetro directamente)." },
        ],
      },
      {
        heading: "Acero de refuerzo",
        items: [
          { label: "Barras longitudinales (varios grupos)", text: "Permite combinar diámetros distintos, por ejemplo para modelar bastones o refuerzo adicional." },
          { label: "Gancho en extremos discontinuos", text: "Para apoyos simples donde la barra no continúa a otro elemento." },
          {
            label: "Confinamiento sismorresistente",
            text: "Igual que en columnas: activa y elige el sistema (muros o pórticos/dual) para que la app sugiera la longitud y separación de estribos en la zona confinada.",
          },
          { label: "Acero de piel", text: "Refuerzo adicional en las caras del alma, solo necesario en vigas de gran peralte." },
        ],
      },
    ],
  },
};

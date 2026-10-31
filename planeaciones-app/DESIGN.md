---
name: Gestión del aula
description: Espacio docente claro y coherente, inspirado en las convenciones de productividad de Google Workspace.
colors:
  primary: "#0b57d0"
  primary-container: "#d3e3fd"
  canvas: "#f8fafd"
  surface: "#ffffff"
  text: "#1f1f1f"
  text-secondary: "#444746"
  outline: "#c4c7c5"
  outline-subtle: "#e3e3e3"
  success: "#146c2e"
  danger: "#b3261e"
typography:
  heading:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "42px"
    fontWeight: 550
    lineHeight: 1.15
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: "8px"
  surface: "16px"
spacing:
  compact: "8px"
  group: "16px"
  section: "24px"
  page: "32px"
---

## Overview

Dirección del rediseño solicitado el 30 de octubre de 2026. Composición 2 aprobada: retomar el trabajo. El usuario pidió después aumentar la calidad del acabado; se mantiene el flujo y se refuerzan jerarquía, encuadre y densidad. Modo Operate: la información y la acción guían el diseño. Referencia explícita del usuario: Google. El sistema usa convenciones familiares de herramientas de documentos, con identidad propia y sin recursos de marca ajenos.

## Colors

Superficies claras para lectura prolongada en aulas y espacios de trabajo iluminados. Azul para acciones y selección; neutrales para estructura. Estados de error y guardado usan texto e icono además de color. Se retiran los degradados decorativos y la competencia de módulos morados y azules.

## Typography

Tipografía de sistema disponible sin descargas. Títulos sobrios; controles y datos con tamaños legibles. Mayúsculas solo donde el contenido lo requiere. Los títulos largos se ajustan en móvil; no ocultar información indispensable bajo puntos suspensivos.

## Layout

Una cabecera de producto y una navegación estable. Espacio central para documentos y su acción principal. Búsqueda y filtros junto al contenido que modifican. En móvil, navegación compacta y filas adaptadas; no replicar un escritorio comprimido. El inicio presenta un documento destacado a todo el ancho, con título y acción a la izquierda y un extracto real presentado como papel a la derecha. Debajo, biblioteca de filas compactas y relaciones del documento. La búsqueda no desplaza el bloque destacado al escribir. Los formularios conservan su captura progresiva.

## Elevation & Depth

Bordes sutiles para separar información; sombra de papel en el extracto del documento y sombras en menús y controles flotantes. No halos ni paneles de vidrio. La lectura del documento debe dominar sobre su contenedor.

## Shapes

Controles de tamaño consistente, objetivos táctiles de al menos 44px. Contenedores suaves y discretos. Iconos vectoriales de una misma familia, sin emojis como navegación principal.

## Components

Acción primaria explícita, acciones secundarias de menor énfasis. Etiquetas persistentes para campos; placeholders descriptivos grises. Ayuda de IA contextual, propuesta editable y aplicación explícita. Estados completos: carga, vacío, error, guardando, guardado y cambios pendientes. Foco de teclado visible y reducción de movimiento respetada.

## Do's and Don'ts

- Conservar todas las funciones y los documentos durante el rediseño.
- Mostrar programa, grupos y relación con las planeaciones donde ayudan a decidir.
- Evitar métricas decorativas, promociones, promesas de calidad no demostradas y funciones simuladas.
- Probar escritorio, móvil y teclado; aprobar `npm run verify` antes de entregar código.

## Dispositivos y detalle

Cabecera blanca de 72px, marca azul y navegación lateral de 88px. Fondo #f8fafd; encabezado principal 30–42px, peso 550 y tracking -.035em. Destacado #eaf0fb con radio 16px, título 24–32px y extracto blanco con rotación de 3 grados que se endereza suavemente al pasar el cursor. El extracto se identifica arriba del papel y solo usa datos del documento. Para programas se presenta una ficha identificada con el nombre y número real de proyectos; la lista no dispone del contenido completo. No es una miniatura completa ni una imagen inventada.

La biblioteca usa selección segmentada, búsqueda delineada y filas separadas por líneas. Los iconos distinguen programa (azul), proyecto (índigo #4e4caf) y planeación (verde #187347), junto con etiquetas de texto. El panel presenta Programa → Proyecto → Planeaciones con vínculos reales, sin repetir la entidad seleccionada.

Hasta 1100px, el contexto se abre bajo demanda y recibe el foco; Escape lo cierra y devuelve el foco al botón de origen. En móvil (760px), navegación inferior y documento destacado sin el extracto duplicado; los títulos conservan su texto y los controles de fila tienen 44px. El destacado se compacta sin la descripción secundaria para acercar la biblioteca al primer pantallazo. Se respeta reducción de movimiento. No se simulan fechas de modificación ni avances.

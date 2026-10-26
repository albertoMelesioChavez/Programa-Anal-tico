# Contrato funcional y plan de crecimiento

Revisión inicial del código: 24 de octubre de 2026. Este documento distingue funcionamiento actual, comportamiento exigido y deuda pendiente. La inspección cubre las pantallas, rutas API, componentes principales y persistencia; no equivale a una auditoría exhaustiva de seguridad, carga o calidad pedagógica.

## Producto y relación entre sus piezas

El docente parte de su contexto escolar y un programa analítico. Puede relacionar proyectos artísticos con ese programa; cada proyecto reúne grupos, productos, contenidos y PDA, una ruta de sesiones y evaluación. Las planeaciones concretan esa ruta para cada grupo y fecha. Se deben poder revisar y editar los resultados sin perder decisiones propias.

Relaciones actuales: docente → programas; docente → proyectos → planeaciones. Proyectos y planeaciones pueden referenciar un programa de ese mismo docente. Las planeaciones también pueden existir sin proyecto. Los documentos antiguos `artes` y `tablas` se guardan por docente en una tabla distinta. Los catálogos curriculares son compartidos y no contienen datos privados.

## Mapa completo de superficies y reglas

| Superficie | Comportamiento esperado | Verificación inicial y límite |
| --- | --- | --- |
| `/acceso`, `/api/auth/*` | Registrar, iniciar/cerrar sesión, cuenta de prueba, acceso Google. Cada docente ve exclusivamente su trabajo. | Registro, contraseña, sesión, cierre, origen ajeno y aislamiento por API; entrada demo en navegador. OAuth real pendiente. |
| `/` y `/api/workspace/organize` | Organizar proyectos y planeaciones; renombrar, duplicar con hijos, mover y ordenar dentro de la cuenta. | Búsqueda, filtro por programa y vínculos visibles en escritorio/móvil; duplicación y movimiento atómicos, propiedad por API. Arrastre y todos los atajos del árbol pendientes. |
| `/proyectos` | Listar proyectos propios y abrirlos; crear o importar. | Carga en navegador, lectura y permisos por API. Es una pantalla anterior al espacio principal. |
| `/proyectos/nuevo` | Capturar idea y grupos, preparar un borrador editable, elegir PDA reales, revisar y guardar. Los ajustes secundarios no bloquean el inicio rápido. | Recorrido completo en escritorio y móvil; validación, borrador recuperable y texto indicativo que no se guarda como respuesta. |
| `/proyectos/[id]` y `/editar` | Abrir lo guardado, editar conservando apartados y generar sesiones del grupo. Imprimir usa el documento en pantalla. | Crear/reabrir/editar en navegador; conservación de configuración y generación de ocho sesiones de la ruta predeterminada por API. La cantidad debe seguir la ruta si cambia. Impresión visual pendiente. |
| `/api/proyectos/[id]/planeaciones` | Usar PDA vinculados al grado y lenguaje del grupo; rechazar repetir una generación ya existente. | Ocho sesiones, contexto/evaluación conservados y duplicación rechazada. Dos solicitudes simultáneas generan una sola serie; la segunda recibe 409. Las sesiones heredan el programa del proyecto. |
| Formularios de planeación y `/api/planeaciones/*` | Crear, editar, eliminar y exportar; conservar evaluación, recursos, evidencias y PDA por grado. | API de creación/edición/exportación/borrado y propiedad. Recorrido completo del formulario manual pendiente. |
| `/contenidos/artes`, `/api/programas-analiticos/*` | Mantener varios programas; editar, duplicar, ordenar y eliminar conservando al menos uno. | API de persistencia, duplicación, orden y último documento; carga de editor en navegador. Edición enriquecida página por página pendiente. |
| `/contenidos/tablas`, `/api/documentos/{artes,tablas}` | Conservar contenido del docente al reabrir; una nueva plantilla no debe reemplazarlo. | Regresión de pérdida de texto y aislamiento de ambos documentos; carga de tablas en navegador. |
| `/generador-programa-analitico` | Preparar un documento en tres planos, guardarlo en la cuenta, reabrirlo y crear un proyecto vinculado; descargar Markdown. | Guardado inicial y cambios, error recuperable y recorrido completo hasta exportar una sesión, en escritorio y móvil. El ciclo se calcula de agosto a julio. |
| `/programaanalitico`, `/plananalitico/artes`, archivos públicos | Consultar material de referencia; no confundirlo con documentos privados o editados. | Carga del visor Markdown; PDF de referencia se comprueba por API. Materiales estáticos públicos. |
| `/api/catalogos`, `/contenidos`, `/pdas`, `/orientaciones`, `/actividades-libro`, `/material-consulta` | Proveer referencias curriculares y opciones pertinentes. Ninguna propuesta debe inventar identificadores. | Catálogos/PDA y selección por grado/fase/lenguaje; carga de endpoints de apoyo. El servidor de contenidos entrega el catálogo completo. |
| `/api/ai` y varitas | Enviar contexto del formulario y nombre de campo; previsualizar, editar, aplicar o descartar sin sobrescritura automática. Identificar el borrador local. | Contexto, campo inválido, fallback local, aplicar/descartar y error del proveedor. No certifica calidad de IA remota. |
| `/api/upload`, `/api/config`, `/api/admin/fix-db` | Mantener deshabilitadas las operaciones que no tienen almacenamiento privado o ya no se ofrecen. | Estados explícitos 503/410. No se simula que la carga de imágenes funciona. |
| Importar PDF/DOCX/TXT/MD | Extraer contenido, conservar autoría del usuario y no publicar una copia privada del archivo. | Markdown por API. Extracción de PDF/DOCX, límite de tamaño y contenido malformado pendientes. |

## Reglas de aceptación transversales

1. Guardar y reabrir conserva los datos; las plantillas son valores iniciales. Las propuestas requieren aplicación explícita.
2. Un identificador de otro docente no concede acceso ni permite vincular objetos ajenos. Las mutaciones verifican origen en servidor.
3. El inicio rápido no inventa diagnósticos, fuentes o PDA. La revisión docente sigue siendo necesaria.
4. Un fallo de red o guardado no debe presentarse como éxito ni borrar el formulario. Los campos explicativos usan placeholders; un texto sugerido no cuenta como dato confirmado.
5. Un borrador local y una respuesta de IA remota se distinguen de forma visible. No depender del proveedor para probar la lógica de la app.
6. Los controles principales deben ser utilizables en móvil, con etiquetas accesibles y sin desplazamiento horizontal en el asistente.
7. Una tarea de código termina con aceptación comprobada y `npm run verify` aprobado. El resultado cubre los casos descritos, no toda situación imaginable.

## Verificación reproducible

Desde `planeaciones-app/`, instalar dependencias con `npm ci`, instalar Chromium con `npx playwright install chromium` y ejecutar `npm run verify`. En Linux de CI se usa `npx playwright install --with-deps chromium`. Se recomienda Node 22 actualizado (22.13 o posterior, por requisitos de herramientas).

La puerta ejecuta ESLint, tests puros, compilación de producción, pruebas de API sobre el servidor real y Playwright en escritorio y móvil. Cualquier fallo termina con código distinto de cero. No admite pruebas marcadas como omitidas o exclusivas, y no reintenta fallos automáticamente. `npm run test:unit` permite una comprobación rápida; `npm run test:system` repite compilación, API y navegador, pero ninguno sustituye la puerta final completa.

Cada ejecución crea una base SQLite temporal, sobrescribe URL/token de base y credenciales de proveedores, construye en `.next-verify` y levanta su propio puerto. No utiliza `.next` del desarrollo ni la base real. El proceso detiene su servidor y elimina la base al finalizar. Un cierre forzado del sistema puede dejar una carpeta temporal. No ejecutar dos verificaciones a la vez en el mismo checkout porque comparten el directorio de compilación e informes.

Los fallos dejan `test-results/server.log`, capturas/trazas en `test-results/browser` e informe `playwright-report`. Abrirlo con `npx playwright show-report`. El workflow de GitHub conserva esos archivos durante siete días cuando falla. No necesitan secretos de producción.

Resultado local del 24 de octubre de 2026: `npm run verify` terminó con código 0; ESLint y compilación aprobados, cinco tests en la suite rápida, catorce comprobaciones reportadas por la suite de integración (incluye las pruebas de contexto y compatibilidad) y diez casos de navegador aprobados, sin pruebas omitidas. En esa revisión, orientaciones, actividades y materiales usaban JSON de respaldo por tablas ausentes; las migraciones versionadas de la siguiente revisión crean y cargan esas tablas.

## Automatización y estado de GitHub

El workflow `.github/workflows/verify.yml` ejecuta la misma puerta al abrir/actualizar un pull request y al enviar cambios a `main` o `master`. Su job se llama `verify`. Publicar el workflow y comprobar su primera ejecución son pasos distintos de crearlo localmente.

El 25 de octubre de 2026 se publicó el workflow en el [pull request 1](https://github.com/albertoMelesioChavez/Programa-Anal-tico/pull/1) y se activó la protección de `main`. Exige el check `verify` emitido por GitHub Actions (app 15368), la rama actualizada y las conversaciones resueltas. La regla se aplica también a administradores; no permite force-push ni borrar `main`. El archivo `.github/main-protection.json` conserva la configuración aplicada. Editar ese archivo no cambia GitHub automáticamente: cualquier modificación requiere aplicar y comprobar la configuración remota.

Se exige pasar por un pull request; no se exige la aprobación de una segunda persona porque el repositorio pertenece al docente que realiza la revisión. El PR se mantiene como borrador para revisar el conjunto y preparar la migración de registros antiguos sin propietario antes de desplegar. Publicar la rama no equivale a fusionarla con `main`. El resultado remoto de cada revisión se consulta en los checks del PR; un check pendiente o fallido impide su integración. La verificación local se volvió a ejecutar el 25 de octubre con todos los casos aprobados.

Referencias de configuración: [Playwright en CI](https://playwright.dev/docs/ci-intro) y [protección de ramas de GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

## Hallazgos y siguiente orden de trabajo

| Prioridad | Hallazgo del análisis | Tarea concreta y criterio de aceptación |
| --- | --- | --- |
| Corregido en esta base | La lectura de `documentos/artes` podía sustituir texto propio si no contenía un marcador de plantilla. | Servir siempre lo guardado; probar dos reaperturas y otra cuenta. |
| Corregido en esta base | La inicialización repetía cambios de esquema y absorbía errores. | Migraciones versionadas atómicas, semillas que conservan filas existentes y pruebas de arranque simultáneo, reversión y reintento tras fallo. |
| Corregido en esta base | El borrado y la organización podían dejar relaciones incompletas. | Borrar un proyecto conserva y desvincula sus planeaciones; duplicar, mover, cambiar programa y eliminar son operaciones atómicas con pruebas de reversión. |
| Alta | Hay renderizado HTML enriquecido/Markdown; su seguridad completa no está acreditada por estos tests. | Revisar sanitización y enlaces; fixtures de HTML malicioso que no ejecuten scripts ni alteren el documento fuera del editor. |
| Alta | La instalación informa vulnerabilidades en dependencias existentes. | Clasificar avisos de ejecución frente a herramientas, actualizar con pruebas y documentar excepciones. No usar `npm audit fix --force` sin revisar impactos. La puerta funcional no equivale a una auditoría de dependencias. |
| Corregido en esta base | El generador no guardaba en la cuenta. | Guardar desde el generador, abrir en el editor y crear un proyecto con ese programa; ciclo vigente y estados de guardado explícitos. |
| Media | Algunas pantallas antiguas capturan errores sin mostrarlos claramente; tablas no comprueba siempre el resultado del guardado. | Estados explícitos de carga/error/guardado y recuperación; pruebas de API fallida sin pérdida de contenido. |
| Media | Validación de algunos JSON y relaciones curriculares depende del cliente; respuestas de error no son uniformes. | Esquemas compartidos en servidor, límites y códigos consistentes; tests de peticiones inválidas. |
| Media | Demo compartida, OAuth y proveedores requieren política de entornos. | Demo restringida fuera de desarrollo, entorno de pruebas de OAuth/IA separado, cuotas y observabilidad sin datos privados. |
| Posterior | No se ha medido capacidad bajo carga ni recuperación de respaldos. | Medir volúmenes representativos, paginar listas, índices por propietario y relaciones, probar restauración de base, luego fijar objetivos de rendimiento. |

No conviene convertir cada pendiente en un cambio simultáneo. El bloque de integridad, recuperación local y recorrido programa–proyecto queda implementado. El siguiente bloque debe revisar sanitización y dependencias; después ampliar validación de formularios y observabilidad. Cada bloque termina con la misma puerta automática y una revisión funcional concreta.


## Integridad, recuperación y presentación de datos (25 de octubre de 2026)

- La inicialización ejecuta migraciones numeradas y registra cada versión dentro de la misma transacción. Un fallo no marca una migración como aplicada. Las semillas insertan solamente registros ausentes; no reemplazan textos ni crean planeaciones de ejemplo. Los registros antiguos sin docente continúan sin propietario hasta una recuperación explícita.
- La recuperación local requiere un inventario de identificadores, una cuenta existente y un propietario confirmado. Crea un respaldo antes de modificar datos, rechaza relaciones con otra cuenta y conserva el documento antiguo original. El documento `artes` recuperado también aparece como programa editable. No existe una ruta pública para reclamar documentos por correo. Procedimiento: [recuperación de datos](recuperacion-datos.md).
- Duplicar proyectos incluye sus planeaciones en una transacción. Mover una planeación hacia un proyecto hereda su programa. Cambiar el programa del proyecto actualiza las referencias de sus planeaciones sin reemplazar su contenido. Eliminar un programa desvincula proyectos y planeaciones; se conserva al menos un programa por docente, incluso con solicitudes simultáneas.
- Eliminar un proyecto requiere confirmación visible. Sus planeaciones conservan contenido y programa, quedan sin proyecto y se pueden encontrar desde **Planeaciones sin proyecto**. Un fallo revierte el borrado y la desvinculación juntos.
- El generador muestra borrador, guardando, guardado o cambios sin guardar. Solo ofrece continuar con el programa guardado cuando coincide con la vista actual. Un error conserva el formulario y permite reintentar. El editor usa los títulos reales de las secciones del documento generado. Crear un proyecto desde ese editor preselecciona el programa de la misma cuenta. Las varitas reciben el contenido del programa seleccionado.
- El espacio principal permite filtrar por programa y buscar por título, temática o grupo. Cada proyecto muestra su programa, grupos, número de planeaciones y producto. Un fallo de carga conserva lo que ya se veía y muestra recuperación explícita; nunca se presenta como una cuenta vacía. El detalle incluye también las planeaciones antiguas sin grupo reconocido.

Aceptación: conservar textos y relaciones; fallos parciales sin escrituras incompletas; impedir acceso de otro docente; guardar/reabrir/vincular/generar/exportar en navegador; eliminar preservando las sesiones; errores de red recuperables; presentación legible en escritorio y móvil. Las pruebas de sistema solo usan la base temporal y el servidor del verificador. Google OAuth real, calidad pedagógica del proveedor remoto y capacidad bajo carga siguen fuera de esta comprobación.

Verificación final de este bloque: `npm run verify` aprobado el 25 de octubre de 2026, con 14 tests de lógica/integridad, 14 comprobaciones de integración y 16 casos de navegador, además de lint y compilación. La revisión visual cubrió la lista con programa, grupo y producto en escritorio y móvil; el navegador verificó ausencia de desplazamiento horizontal. No hubo errores SQLite ni respuestas 500 inesperadas en el log del servidor aislado.

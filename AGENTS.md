# Trabajo en esta aplicación

La aplicación está en `planeaciones-app/`. Lee `docs/contrato-funcional.md` antes de cambiar un flujo y actualiza ese contrato si cambia su comportamiento.

## Criterio para terminar

- Define el resultado observable y los casos de error antes de implementar.
- Añade pruebas de comportamiento para lógica, persistencia, permisos y flujos críticos afectados. Para ajustes visuales menores basta la verificación visual apropiada.
- Ejecuta `npm run verify` desde `planeaciones-app/` antes de declarar terminada una tarea de código. Si falla, corrige y repite las comprobaciones afectadas y finalmente la puerta completa.
- No desactives pruebas, rebajes aserciones, uses `.only`/`.skip` ni agregues reintentos para ocultar fallos. Una comprobación bloqueada no cuenta como aprobada.
- Informa qué cambió, qué se verificó y qué quedó pendiente. Una compilación correcta no acredita un recorrido de usuario.

## Datos, IA y arquitectura

- Las pruebas de sistema deben usar exclusivamente la base temporal y el servidor propio creados por `scripts/verify.mjs`. Nunca usar la base del docente ni el puerto 3000 abierto por el usuario.
- Toda lectura o escritura de datos privados debe verificar la sesión y la propiedad en servidor; toda mutación debe verificar origen. Prueba también con otro docente.
- No sobrescribas decisiones del docente con plantillas o propuestas de IA. Aplicar una propuesta debe ser una decisión explícita y reversible.
- Un borrador local debe identificarse como tal. Los tests locales no prueban Google OAuth real ni la calidad del modelo remoto.
- Mantén la lógica de dominio reutilizable en `src/lib`, los componentes de interacción en `src/components` y las rutas como adaptadores. Evita duplicar reglas entre pantallas.
- No cambies migraciones o relaciones sin describir el efecto sobre datos existentes y añadir una prueba de conservación.
- Conserva cambios ajenos. Nunca publiques credenciales, datos reales ni artefactos temporales.

## Entrega

GitHub Actions debe ejecutar la misma puerta local. La rama principal debe exigir ese resultado antes de integrar cambios; un archivo de workflow local por sí solo no activa protección en GitHub. La revisión humana sigue siendo necesaria para UX, contenido pedagógico y cambios de datos sensibles.

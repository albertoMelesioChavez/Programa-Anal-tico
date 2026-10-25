# Planeaciones App

Aplicación de planeación didáctica para Artes. La interfaz se puede publicar
en Vercel, pero los proyectos y las planeaciones necesitan una base de datos
Turso configurada en el entorno de despliegue.

## Funcionalidades

- Crear y administrar proyectos de arte vinculados a un proyecto escolar.
- Identificar en la lista qué proyecto escolar da contexto a cada proyecto de
  arte; los proyectos sin vínculo también se señalan claramente.
- Consultar, desde cada proyecto de arte, cuántas planeaciones están vinculadas
  a él.

## Desarrollo local

```bash
cp .env.example .env.local
npm run dev
```

En desarrollo, deja `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` vacías para usar
SQLite local y guardar los proyectos de prueba. Configúralas si deseas usar
Turso; en producción son necesarias para guardar los proyectos.

En desarrollo, la pantalla de acceso incluye un usuario de prueba de un clic.
Para iniciar sesión con Google, crea credenciales OAuth 2.0 de tipo aplicación
web y agrega `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y
`NEXT_PUBLIC_APP_URL` a `.env.local`. Usa como URI de redirección autorizada:

```text
http://localhost:3000/api/auth/google/callback
```

## Creación de proyectos y asistencia por campo

El botón **Crear proyecto** abre idea y grupos, ajustes opcionales,
currículo y revisión. El inicio rápido pide una idea, formato y grupos; el modo
manual permite editar título, temática y producto por separado. Los nuevos
proyectos parten de una plantilla editable con ocho sesiones y cuatro criterios
de evaluación; usa 50 minutos, el ciclo escolar vigente (agosto a julio), el
nombre de la cuenta y Artes Visuales como valores iniciales modificables.
Solo completa campos vacíos. El diagnóstico, las fuentes y los PDA requieren
información real. Los proyectos existentes conservan sus rutas y decisiones.

Las sesiones se editan una a la vez. Datos escolares, fechas, adaptaciones por
grupo y otros detalles se despliegan cuando se necesitan. El borrador nuevo se
recupera en el mismo navegador y cuenta; **Crear proyecto** lo guarda en la base
de datos. La edición de proyectos existentes requiere **Guardar cambios**.

El **Inicio rápido** permite escribir una sola idea o elegir un tema y un formato
(mural, teatro, música o danza). Prepara título, producto y borrador, y salta los
ajustes opcionales. Los grupos se pueden añadir por bloques A/B o recuperar del
proyecto anterior. La escuela y los espacios se reutilizan del último proyecto
cuando no hay borrador. El currículo ofrece PDA reales filtrados por grado,
lenguaje y fase, ordenados por coincidencias de palabras; se vinculan con un clic
y requieren revisión docente. Estos accesos rápidos usan plantillas, no IA.

Cada campo de redacción tiene una varita en la esquina superior derecha. La
solicitud incluye el campo y su ubicación (grupo, sesión o criterio), su texto
actual y el formulario completo sin guardar, con los contenidos y PDA elegidos.
La propuesta se puede editar, aplicar o descartar junto al campo.

Con `GOOGLE_AI_STUDIO_API_KEY` configurada en `.env.local` se utiliza Gemini;
`GOOGLE_AI_MODEL` permite elegir el modelo. Reinicia el servidor al cambiar estas
variables. Sin clave, los campos ofrecen plantillas identificadas como
**Borrador local · IA sin conectar**. Estas plantillas no son respuestas de IA.
La sugerencia de contenidos/PDA requiere IA y valida las opciones del catálogo.

## Verificación obligatoria

Usa Node 22 actualizado (se recomienda 22.13 o posterior). La instalación inicial y la puerta completa son:

```bash
npm ci
npx playwright install chromium
npm run verify
```

La verificación ejecuta lint, pruebas de lógica, compilación, API y navegador en escritorio y móvil. Crea una base temporal y un servidor propio; no necesita el servidor de desarrollo ni modifica tus datos. Las pruebas usan el modo local sin créditos de IA. Un fallo interrumpe la puerta y devuelve un código de error.

Para iterar: `npm run test:unit` comprueba lógica y `npm run test:system` comprueba compilación, API y navegador. Antes de terminar una tarea se debe aprobar `npm run verify`. Los fallos conservan un informe en `playwright-report` y diagnósticos en `test-results`; abre el informe con `npx playwright show-report`.

El [contrato funcional](docs/contrato-funcional.md) documenta todas las superficies, las reglas, cobertura y pendientes para escalar. Las [reglas de colaboración](../AGENTS.md) establecen el criterio de entrega. El workflow se publicó en el [PR 1](https://github.com/albertoMelesioChavez/Programa-Anal-tico/pull/1). La protección de `main` exige su check `verify`, la rama actualizada y conversaciones resueltas, también para administradores. El PR permanece como borrador para revisión; los datos anteriores sin docente asignado necesitan una migración antes de desplegar.

## Despliegue en Vercel

En **Project Settings → Environment Variables**, agrega estas variables para
Production (y Preview si también quieres probar ahí):

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `GOOGLE_AI_STUDIO_API_KEY` (opcional; sin ella se usa la plantilla local)

La importación extrae texto de archivos; no publica una copia del original. La carga de imágenes está deshabilitada hasta disponer de almacenamiento privado.

Después de guardarlas, vuelve a desplegar. En una base Turso vacía, la primera
petición crea y carga las tablas de catálogo automáticamente.

Si alguna operación falla, revisa **Vercel → Deployments → Functions → Logs**.
El mensaje `Base de datos no configurada (Faltan variables de entorno)` indica
que faltan las dos variables de Turso o que se guardaron solo para otro entorno.

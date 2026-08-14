# Planeaciones App

Aplicación de planeación didáctica para Artes. La interfaz se puede publicar
en Vercel, pero los proyectos y las planeaciones necesitan una base de datos
Turso configurada en el entorno de despliegue.

## Desarrollo local

```bash
cp .env.example .env.local
npm run dev
```

Completa `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` en `.env.local` para probar
las operaciones de guardado. Sin ellos, solo funcionan los catálogos de
consulta y las plantillas de IA locales.

## Despliegue en Vercel

En **Project Settings → Environment Variables**, agrega estas variables para
Production (y Preview si también quieres probar ahí):

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `GOOGLE_AI_STUDIO_API_KEY` (opcional; sin ella se usa la plantilla local)
- `BLOB_READ_WRITE_TOKEN` (opcional; necesario para conservar archivos subidos)

Después de guardarlas, vuelve a desplegar. En una base Turso vacía, la primera
petición crea y carga las tablas de catálogo automáticamente.

Si alguna operación falla, revisa **Vercel → Deployments → Functions → Logs**.
El mensaje `Base de datos no configurada (Faltan variables de entorno)` indica
que faltan las dos variables de Turso o que se guardaron solo para otro entorno.

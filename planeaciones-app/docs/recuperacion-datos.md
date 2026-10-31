# Recuperación local de documentos anteriores a las cuentas

Esta herramienta administra una base SQLite local concreta. No inicia sesión en Google ni modifica la base publicada. El propietario debe confirmar previamente qué registros le pertenecen. No ejecutar contra una base de otra persona o elegir un correo por suposición.

Desde `planeaciones-app/`, con la aplicación inicializada:

1. Crear la cuenta desde `/acceso`, o usar la herramienta administrativa cuando el propietario lo autorice:

   ```bash
   node scripts/local-account.mjs database/app.db docente@example.com 'Nombre del docente'
   ```

   Genera una contraseña aleatoria, guarda únicamente su hash en la base y entrega el acceso en `.private/cuenta-local.txt` (permisos 0600). Rechaza cuentas y archivos de credenciales existentes. No imprime la contraseña. `.private/` está excluida de Git; no compartir ni adjuntar ese archivo a un PR.

2. Crear un inventario explícito de registros sin propietario:

   ```bash
   mkdir -p .private
   node scripts/legacy-data.mjs inspect --database database/app.db --plan .private/recuperacion.json
   ```

   La inspección no asigna registros. Revisar los identificadores de programas, proyectos, planeaciones y nombres de documentos antiguos; incluir sus relaciones. El plan no contiene textos, pero se mantiene privado. No sobrescribe un plan existente.

3. Después de confirmar propietario e inventario, ejecutar:

   ```bash
   node scripts/legacy-data.mjs assign --database database/app.db --plan .private/recuperacion.json --email docente@example.com
   ```

   Crea una copia consistente en `database/backups/antes-recuperacion-<fecha>.db`, aplica las migraciones pendientes y asigna el conjunto dentro de una transacción. Rechaza cuentas inexistentes, registros ajenos, relaciones ausentes y conflictos con documentos propios ya editados. Ante un conflicto revierte toda la asignación. Conserva el documento antiguo original y registra el manifiesto en `legacy_assignments`; `artes` se copia además a un programa editable.

4. Comprobar los recuentos por propietario y entrar con la cuenta destinataria para revisar el contenido. Comparar con el respaldo que los textos, configuraciones y evaluaciones se conservan. Los tests automatizados se ejecutan exclusivamente en bases temporales: nunca usar esta base para las pruebas de sistema.

Para restaurar, detener los procesos que usan la base, conservar aparte el estado actual y restaurar la copia seleccionada con las herramientas de SQLite. No reemplazar una base abierta ni restaurar una copia antigua si hubo ediciones posteriores sin revisar primero cómo conservarlas. Esta tarea incluye una prueba que abre el respaldo y comprueba su contenido; no certifica recuperación ante todos los fallos de infraestructura.

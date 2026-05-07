const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initProjectsTable() {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS proyectos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        tematica TEXT,
        introduccion TEXT,
        productos TEXT, -- JSON string
        vinculacion TEXT, -- JSON string
        configuracion TEXT, -- JSON para extras (duración, fases activas, etc)
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Tabla 'proyectos' inicializada correctamente.");
  } catch (error) {
    console.error("Error inicializando tabla 'proyectos':", error);
  }
}

initProjectsTable();

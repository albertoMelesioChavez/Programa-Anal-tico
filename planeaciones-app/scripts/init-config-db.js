const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initConfigTable() {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT
      )
    `);
    console.log("Tabla 'configuracion' inicializada.");
  } catch (error) {
    console.error("Error:", error);
  }
}

initConfigTable();

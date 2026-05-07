const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function addEvidenciasColumn() {
  try {
    // Intentar añadir la columna evidencias
    await client.execute(`
      ALTER TABLE planeaciones ADD COLUMN evidencias TEXT;
    `);
    console.log("Columna 'evidencias' añadida correctamente a la tabla 'planeaciones'.");
  } catch (error) {
    if (error.message.includes("duplicate column name")) {
        console.log("La columna 'evidencias' ya existe.");
    } else {
        console.error("Error añadiendo columna 'evidencias':", error);
    }
  }
}

addEvidenciasColumn();

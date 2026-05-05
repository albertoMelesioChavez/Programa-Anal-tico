import { createClient } from '@libsql/client';

// Turso Cloud Config
const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

// Si no hay URL de Turso, usamos el archivo local
const dbUrl = url || "file:database/app.db";

export const db = createClient({
  url: dbUrl,
  authToken: authToken,
});

// Helper para manejar queries de forma consistente
export async function query(sql, params = []) {
  try {
    return await db.execute({ sql, args: params });
  } catch (error) {
    console.error("Database Query Error:", error);
    throw error;
  }
}

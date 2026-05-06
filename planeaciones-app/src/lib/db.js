import { createClient } from '@libsql/client';

// Turso Cloud Config
const url = process.env.TURSO_DATABASE_URL?.trim() || "";
const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || "";

// Función para obtener el cliente de forma segura
function getDbClient() {
    try {
        // Si no hay URL de Turso, intentamos usar SQLite local solo si estamos en desarrollo
        // En Vercel, si no hay URL, el cliente de LibSQL puede fallar si intenta abrir un archivo inexistente.
        const dbUrl = url || (process.env.NODE_ENV === 'development' ? "file:database/app.db" : "");

        if (!dbUrl) {
            console.warn("ADVERTENCIA: No se detectó TURSO_DATABASE_URL. La base de datos no funcionará en producción.");
            return {
                execute: async () => { throw new Error("Base de datos no configurada (Faltan variables de entorno)"); }
            };
        }

        return createClient({
            url: dbUrl,
            authToken: authToken,
        });
    } catch (e) {
        console.error("Error al inicializar el cliente de LibSQL:", e.message);
        return {
            execute: async () => { throw new Error("Fallo en la inicialización de DB: " + e.message); }
        };
    }
}

export const db = getDbClient();

// Helper para manejar queries de forma consistente
export async function query(sql, params = []) {
    try {
        return await db.execute({ sql, args: params });
    } catch (error) {
        console.error("Database Query Error:", error.message);
        throw error;
    }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import dataFallback from '@/lib/data/catalogs.json';

import { ensureTablesExist } from '@/lib/db-init';

export async function GET() {
    try {
        // Asegurar que la base de datos está poblada en Turso
        await ensureTablesExist();
        
        // En LibSQL/Turso, podemos ejecutar múltiples queries o secuenciales
        const fases = await db.execute('SELECT * FROM fases ORDER BY id ASC');
        const grados = await db.execute('SELECT * FROM grados ORDER BY id ASC');
        const lenguajes = await db.execute('SELECT * FROM lenguajes_artisticos ORDER BY id ASC');
        const ejes_articuladores = await db.execute('SELECT * FROM ejes_articuladores ORDER BY id ASC');

        return NextResponse.json({ 
            fases: fases.rows, 
            grados: grados.rows, 
            lenguajes: lenguajes.rows, 
            ejes_articuladores: ejes_articuladores.rows 
        });
    } catch (error) {
        console.error("Turso Catalogs Error:", error);
        // Fallback a los datos estáticos si falla la conexión
        return NextResponse.json(dataFallback);
    }
}

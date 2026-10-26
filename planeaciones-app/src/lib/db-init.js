import { db } from './db';
import { migrate } from './migrations.mjs';
import catalogs from '@/lib/data/catalogs.json';
import nacionales from '@/lib/data/contenidos_nacionales.json';
import estatales from '@/lib/data/contenidos_estatales.json';
import pdas from '@/lib/data/pdas.json';
import orientaciones from '@/lib/data/orientaciones_didacticas.json';
import actividades from '@/lib/data/actividades_libro.json';
import materiales from '@/lib/data/material_consulta.json';

let ready;
export function ensureTablesExist() {
    if (!ready) ready = migrate(db, { catalogs, nacionales, estatales, pdas, orientaciones, actividades, materiales }).catch(error => {
        ready = undefined;
        throw error;
    });
    return ready;
}

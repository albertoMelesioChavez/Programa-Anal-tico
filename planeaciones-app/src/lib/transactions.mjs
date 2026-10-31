const queues = new WeakMap();
export async function writeTransaction(client, operation) {
    const previous = queues.get(client) || Promise.resolve();
    const result = previous.catch(() => {}).then(() => performTransaction(client, operation));
    queues.set(client, result);
    try { return await result; }
    finally { if (queues.get(client) === result) queues.delete(client); }
}

async function performTransaction(client, operation) {
    let transaction;
    for (let attempt = 0; ; attempt++) {
        try { transaction = await client.transaction('write'); break; }
        catch (error) {
            if (attempt >= 6 || !/SQLITE_BUSY|database is locked/i.test(error.message)) throw error;
            // El adaptador SQLite puede conservar el BEGIN fallido como sentencia activa.
            // Renueva solo esa conexión antes de volver a pedir el bloqueo, sin repetir escrituras.
            if (client.protocol === 'file') await client.reconnect();
            await new Promise(resolve => setTimeout(resolve, 25 * 2 ** attempt));
        }
    }
    try {
        const result = await operation(transaction);
        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        throw error;
    } finally { transaction.close(); }
}

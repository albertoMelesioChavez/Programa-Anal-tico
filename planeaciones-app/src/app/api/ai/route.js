import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

import { createClient } from '@libsql/client';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function POST(request) {
    try {
        const { prompt, context } = await request.json();
        
        let apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;

        // Si no está en env, buscar en DB
        if (!apiKey) {
            const dbRes = await client.execute({
                sql: "SELECT valor FROM configuracion WHERE clave = 'GOOGLE_AI_KEY'",
                args: []
            });
            if (dbRes.rows.length > 0) {
                apiKey = dbRes.rows[0].valor;
            }
        }

        if (!apiKey) {
            return NextResponse.json({ 
                error: "Configuración incompleta", 
                details: "Falta la API Key de Google AI Studio. Ve a la configuración de la app para añadirla." 
            }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey.trim());
        
        // Intentamos varios modelos. Ponemos gemini-pro primero porque es el más compatible
        // aunque gemini-1.5-flash sea mejor, queremos asegurar que funcione YA.
        const modelsToTry = ["gemini-pro", "gemini-1.5-flash", "gemini-1.5-pro"];
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`Intentando con modelo: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1' });
                
                const systemInstruction = `Eres un asistente experto en educación básica en México, especializado en el Nuevo Modelo Educativo (NEM). 
                Tu objetivo es ayudar a docentes a redactar planeaciones didácticas y programas analíticos de alta calidad.
                Usa un lenguaje profesional pero cercano. 
                Si se te pide una planeación, asegúrate de incluir Inicio, Desarrollo y Cierre.
                Si se te pide redactar contenido para el programa analítico, sé académico y estructurado.`;

                const fullPrompt = `Contexto académico: ${JSON.stringify(context)}\n\nInstrucción del docente: ${prompt}`;

                const result = await model.generateContent([systemInstruction, fullPrompt]);
                const response = await result.response;
                const text = response.text();

                return NextResponse.json({ text, modelUsed: modelName });
            } catch (error) {
                console.error(`Error con modelo ${modelName}:`, error.message);
                lastError = error;
                // Si el error es 404, probamos el siguiente
                if (error.message.includes("404")) continue;
                // Si es otro error (ej. permisos), lanzamos de una vez
                throw error;
            }
        }

        throw lastError;
    } catch (error) {
        console.error("AI Generation Final Failure:", error);
        return NextResponse.json({ 
            error: "Fallo al generar contenido", 
            details: error.message,
            suggestion: "Verifica que tu API Key sea de Google AI Studio (aistudio.google.com) y no de Google Cloud Console."
        }, { status: 500 });
    }
}

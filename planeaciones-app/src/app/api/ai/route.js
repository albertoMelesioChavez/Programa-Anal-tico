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
        
        const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
        let errors = [];

        for (const modelName of modelsToTry) {
            try {
                // Probamos sin especificar apiVersion para que el SDK use su mejor opción
                const model = genAI.getGenerativeModel({ model: modelName });
                
                const systemInstruction = `Eres un asistente experto en educación básica en México, especializado en el Nuevo Modelo Educativo (NEM). 
                Tu objetivo es ayudar a docentes a redactar planeaciones didácticas y programas analíticos de alta calidad.`;

                const fullPrompt = `Contexto académico: ${JSON.stringify(context)}\n\nInstrucción del docente: ${prompt}`;

                const result = await model.generateContent([systemInstruction, fullPrompt]);
                const response = await result.response;
                const text = response.text();

                return NextResponse.json({ text, modelUsed: modelName });
            } catch (error) {
                console.error(`Error con modelo ${modelName}:`, error.message);
                errors.push(`${modelName}: ${error.message}`);
                continue;
            }
        }

        return NextResponse.json({ 
            error: "Fallo al generar contenido con todos los modelos", 
            details: errors.join(" | "),
            suggestion: "Tu API Key parece no tener permiso para usar Gemini. Intenta crear una NUEVA llave en un proyecto nuevo en Google AI Studio."
        }, { status: 500 });
    } catch (error) {
        console.error("AI Generation Final Failure:", error);
        return NextResponse.json({ error: "Error fatal de IA", details: error.message }, { status: 500 });
    }
}

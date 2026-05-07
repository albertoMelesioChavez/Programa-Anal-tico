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

        // Limpieza extrema de la API Key
        const cleanKey = apiKey.trim().replace(/[^a-zA-Z0-9_-]/g, '');
        
        const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanKey}`;
                
                const payload = {
                    contents: [
                        {
                            role: "user",
                            parts: [
                                { text: `Eres un asistente experto en educación básica en México (NEM). Contexto: ${JSON.stringify(context)}\n\nInstrucción: ${prompt}` }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    }
                };

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (!response.ok) {
                    console.error(`Error con ${modelName}:`, data);
                    lastError = data.error?.message || response.statusText;
                    continue;
                }

                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) return NextResponse.json({ text, modelUsed: modelName });
                
                throw new Error("No se generó texto en la respuesta");
            } catch (error) {
                console.error(`Fallo en fetch con ${modelName}:`, error);
                lastError = error.message;
            }
        }

        return NextResponse.json({ 
            error: "Fallo total en la conexión con la IA de Google", 
            details: lastError,
            suggestion: "Tu cuenta de Google podría tener restricciones para usar Gemini en aplicaciones externas. Prueba a usar una cuenta de Gmail personal diferente."
        }, { status: 500 });

    } catch (error) {
        console.error("AI Fatal Error:", error);
        return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 });
    }
}

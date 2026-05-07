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
        
        // PASO 1: DIAGNÓSTICO - Preguntar a Google qué modelos ve esta llave
        try {
            const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${cleanKey}`;
            const listRes = await fetch(listUrl);
            const listData = await listRes.json();
            
            if (listData.error) {
                return NextResponse.json({ 
                    error: "Error de Llave API", 
                    details: listData.error.message,
                    suggestion: "Tu API Key parece ser incorrecta o está desactivada. Por favor, genera una nueva en Google AI Studio." 
                }, { status: 401 });
            }

            if (listRes.ok && listData.models) {
                // Buscamos un modelo que soporte generación de contenido (preferencia gemini-1.5-flash)
                const compatibleModels = listData.models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
                const selectedModel = compatibleModels.find(m => m.name.includes("gemini-1.5-flash")) || compatibleModels[0];

                if (selectedModel) {
                    const modelName = selectedModel.name; // Ej: models/gemini-1.5-flash
                    const url = `https://generativelanguage.googleapis.com/v1/${modelName}:generateContent?key=${cleanKey}`;
                    
                    const payload = {
                        contents: [{ role: "user", parts: [{ text: `Contexto del proyecto: ${JSON.stringify(context)}\n\nInstrucción: ${prompt}` }] }]
                    };

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const data = await response.json();
                    if (response.ok) {
                        return NextResponse.json({ text: data.candidates?.[0]?.content?.parts?.[0]?.text });
                    } else {
                        // Si el modelo seleccionado falla, lanzamos error detallado
                        return NextResponse.json({ 
                            error: `Error con el modelo ${modelName}`, 
                            details: data.error?.message || "Error desconocido en generación" 
                        }, { status: response.status });
                    }
                }
            }
        } catch (diagError) {
            console.error("Error en diagnóstico:", diagError);
        }

        // Si nada funcionó
        return NextResponse.json({ 
            error: "No se encontró ningún modelo compatible", 
            details: "Tu API Key no tiene permiso para usar modelos generativos o el servicio no está disponible en tu región.",
            suggestion: "Prueba creando una API Key con una cuenta personal (@gmail.com) para descartar bloqueos institucionales."
        }, { status: 500 });

    } catch (error) {
        console.error("AI Fatal Error:", error);
        return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 });
    }
}

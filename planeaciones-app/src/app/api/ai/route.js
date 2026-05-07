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
            
            if (listRes.ok && listData.models) {
                console.log("Modelos disponibles para esta llave:", listData.models.map(m => m.name));
                // Si encontramos modelos, intentamos el primero que sea compatible con generateContent
                const compatibleModel = listData.models.find(m => m.supportedGenerationMethods.includes("generateContent"));
                if (compatibleModel) {
                    const modelName = compatibleModel.name; // Ya viene con "models/"
                    const url = `https://generativelanguage.googleapis.com/v1/${modelName}:generateContent?key=${cleanKey}`;
                    
                    const payload = {
                        contents: [{ role: "user", parts: [{ text: `Eres un asistente experto en NEM. Contexto: ${JSON.stringify(context)}\n\nInstrucción: ${prompt}` }] }]
                    };

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const data = await response.json();
                    if (response.ok) {
                        return NextResponse.json({ text: data.candidates?.[0]?.content?.parts?.[0]?.text });
                    }
                }
            } else {
                console.error("No se pudieron listar modelos:", listData);
            }
        } catch (diagError) {
            console.error("Error en diagnóstico:", diagError);
        }

        // Si el diagnóstico falla o no encuentra nada, probamos el método estándar como último recurso
        const modelName = "gemini-1.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${cleanKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();

        return NextResponse.json({ 
            error: "La IA de Google no reconoce tu llave para ningún modelo", 
            details: data.error?.message || "Acceso denegado",
            suggestion: "Tu cuenta de Google tiene bloqueado el acceso a la IA. POR FAVOR, prueba creando una llave con un correo @gmail.com diferente (personal)."
        }, { status: 500 });

    } catch (error) {
        console.error("AI Fatal Error:", error);
        return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 });
    }
}

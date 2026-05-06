import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

// Inicializamos la IA con la API KEY del entorno
// El usuario debe configurar GOOGLE_AI_STUDIO_API_KEY en Vercel
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_STUDIO_API_KEY || "");

export async function POST(request) {
    try {
        const { prompt, context } = await request.json();
        
        if (!process.env.GOOGLE_AI_STUDIO_API_KEY) {
            return NextResponse.json({ 
                error: "Configuración incompleta", 
                details: "Falta la API Key de Google AI Studio. Asegúrate de añadir GOOGLE_AI_STUDIO_API_KEY a tus variables de entorno." 
            }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemInstruction = `Eres un asistente experto en educación básica en México, especializado en el Nuevo Modelo Educativo (NEM). 
        Tu objetivo es ayudar a docentes a redactar planeaciones didácticas y programas analíticos de alta calidad.
        Usa un lenguaje profesional pero cercano. 
        Si se te pide una planeación, asegúrate de incluir Inicio, Desarrollo y Cierre.
        Si se te pide redactar contenido para el programa analítico, sé académico y estructurado.`;

        const fullPrompt = `Contexto académico: ${JSON.stringify(context)}\n\nInstrucción del docente: ${prompt}`;

        const result = await model.generateContent([systemInstruction, fullPrompt]);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ text });
    } catch (error) {
        console.error("AI Generation Error:", error);
        return NextResponse.json({ error: "Fallo al generar contenido", details: error.message }, { status: 500 });
    }
}

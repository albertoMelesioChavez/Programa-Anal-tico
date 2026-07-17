import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import path from 'node:path';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Next.js no copia automáticamente el worker de PDF.js a sus chunks del servidor.
PDFParse.setWorker(path.resolve(process.cwd(), 'node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs'));

export const DOCUMENT_ACCEPT = '.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown';

export function titleFromFilename(filename, fallback) {
    return String(filename || fallback).replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() || fallback;
}

export async function extractTextFromDocument(file) {
    if (file.size > MAX_FILE_SIZE) {
        throw new Error('El archivo excede el límite de 10 MB.');
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    if (file.type === 'application/pdf' || extension === 'pdf') {
        const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
        try {
            const result = await parser.getText();
            return result.text?.trim() || '';
        } finally {
            await parser.destroy();
        }
    }

    if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        extension === 'docx'
    ) {
        const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
        return result.value?.trim() || '';
    }

    if (['txt', 'md'].includes(extension) || file.type.startsWith('text/')) {
        return new TextDecoder('utf-8').decode(arrayBuffer).trim();
    }

    throw new Error('Formato no compatible. Usa PDF, DOCX, TXT o Markdown.');
}

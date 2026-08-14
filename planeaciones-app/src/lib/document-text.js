import mammoth from 'mammoth';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const DOCUMENT_ACCEPT = '.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown';

export function titleFromFilename(filename, fallback) {
    return String(filename || fallback).replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() || fallback;
}

async function extractPdfText(arrayBuffer) {
    // pdf-parse 2 carga PDF.js al importar el módulo y falla en Vercel porque
    // el runtime no expone DOMMatrix. El build legacy de PDF.js sí es compatible
    // con Node y se carga únicamente al procesar un PDF, no al consultar proyectos.
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = getDocument({ data: new Uint8Array(arrayBuffer), useWorker: false });

    try {
        const pdf = await task.promise;
        const pages = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
        }
        return pages.join('\n').trim();
    } finally {
        await task.destroy();
    }
}

export async function extractTextFromDocument(file) {
    if (file.size > MAX_FILE_SIZE) {
        throw new Error('El archivo excede el límite de 10 MB.');
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    if (file.type === 'application/pdf' || extension === 'pdf') {
        return extractPdfText(arrayBuffer);
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

import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import MarkdownViewer from '@/components/MarkdownViewer';

export const dynamic = 'force-dynamic';

export default async function ProgramaAnaliticoPage() {
    // Read the markdown file from the public directory
    const filePath = path.join(process.cwd(), 'public', 'programa_analitico.md');
    let markdownContent = '';

    try {
        markdownContent = await fs.promises.readFile(filePath, 'utf8');
    } catch (error) {
        console.error('Error reading markdown file:', error);
        markdownContent = 'Error: No se pudo encontrar el archivo programa_analitico.md en la carpeta public.';
    }

    return (
        <div className="w-full flex flex-col items-center">
            {/* Nav and header container */}
            <div className="w-full max-w-5xl mb-8 animate-fade-in flex flex-col gap-4">
                <div className="flex justify-start w-full">
                    <Link href="/" className="btn btn-glass hover:border-[var(--primary)] group flex items-center gap-2 px-4 py-2 text-sm shadow-md">
                        <span className="text-xl leading-none transition-transform group-hover:-translate-x-1">←</span>
                        <span>Volver a tus Planeaciones</span>
                    </Link>
                </div>

                <div className="w-full rounded-2xl bg-gradient-to-br from-[var(--surface)] to-transparent border border-[var(--surface-border)] p-8 text-center shadow-2xl relative overflow-hidden backdrop-blur-xl">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500 rounded-full mix-blend-multiply filter blur-[60px] opacity-20"></div>
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500 rounded-full mix-blend-multiply filter blur-[60px] opacity-20"></div>

                    <h2 className="relative z-10 text-3xl font-bold text-white mb-2">
                        Documento Analítico
                    </h2>
                    <p className="relative z-10 text-[var(--text-muted)] max-w-2xl mx-auto">
                        A continuación se presenta el contenido oficial del programa en formato estructurado, fácil de leer y copiar.
                    </p>
                </div>
            </div>

            {/* Markdown Content Section */}
            <div className="w-full max-w-5xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="glass-panel p-6 md:p-12 shadow-2xl overflow-hidden relative">
                    <MarkdownViewer content={markdownContent} />
                </div>
            </div>
        </div>
    );
}

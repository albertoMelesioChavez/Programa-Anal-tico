import { readFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'artes_primaria_analitico_2025.pdf');
  
  try {
    const fileBuffer = await readFile(filePath);
    
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="artes_primaria_analitico_2025.pdf"',
      },
    });
  } catch (error) {
    console.error('Error serving PDF:', error);
    return new Response('PDF not found', { status: 404 });
  }
}

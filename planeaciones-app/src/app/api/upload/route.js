import { NextResponse } from 'next/server';
import { requireSameOrigin, requireUser } from '@/lib/auth';

export async function POST(request) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const auth = await requireUser(request); if (auth.error) return auth.error;
    return NextResponse.json({ error: 'La subida de archivos está desactivada hasta configurar almacenamiento privado por docente.' }, { status: 503 });
}

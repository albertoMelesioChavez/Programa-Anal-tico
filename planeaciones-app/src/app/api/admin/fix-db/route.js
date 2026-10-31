import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ error: 'Esta operación administrativa ya no está disponible.' }, { status: 410 });
}

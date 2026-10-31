import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

export async function GET(request) {
    const auth = await requireUser(request); if (auth.error) return auth.error;
    return NextResponse.json({ user: auth.user });
}

import { NextResponse } from 'next/server';
import { deleteSession, requireSameOrigin } from '@/lib/auth';

export async function POST(request) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    return deleteSession(request, NextResponse.json({ success: true }));
}

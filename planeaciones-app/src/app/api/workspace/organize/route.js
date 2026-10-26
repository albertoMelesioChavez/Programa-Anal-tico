import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureTablesExist } from '@/lib/db-init';
import { requireSameOrigin, requireUser } from '@/lib/auth';
import { organizeWorkspace } from '@/lib/workspace-operations.mjs';

export async function POST(request) {
    const originError = requireSameOrigin(request); if (originError) return originError;
    const auth = await requireUser(request); if (auth.error) return auth.error;
    try {
        await ensureTablesExist();
        return NextResponse.json(await organizeWorkspace(db, auth.user.id, await request.json()));
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
}

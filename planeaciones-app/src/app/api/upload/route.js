import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');

        if (!filename) {
            return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
        }

        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            return NextResponse.json({ error: 'Vercel Blob storage not configured' }, { status: 503 });
        }

        const blob = await put(filename, request.body, {
            access: 'public',
        });

        return NextResponse.json(blob);
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Failed to upload file: ' + error.message }, { status: 500 });
    }
}

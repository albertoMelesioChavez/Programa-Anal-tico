import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request) {
    try {
        const { content, fileName } = await request.json();
        
        if (!content || !fileName) {
            return NextResponse.json({ error: 'Missing content or fileName' }, { status: 400 });
        }

        // Target file in the public directory
        const filePath = path.join(process.cwd(), 'public', fileName);
        
        await fs.writeFile(filePath, content, 'utf8');

        return NextResponse.json({ success: true, message: 'File saved successfully' });
    } catch (error) {
        console.error('Error saving file:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

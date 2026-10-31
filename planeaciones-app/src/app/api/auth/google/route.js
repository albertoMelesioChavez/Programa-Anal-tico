import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { appOrigin, GOOGLE_STATE_COOKIE, OAUTH_COOKIE_OPTIONS } from '@/lib/auth';

export async function GET(request) {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) return NextResponse.redirect(new URL('/acceso?error=google_no_configurado', request.url));
    const state = randomBytes(32).toString('base64url');
    const callback = `${appOrigin(request)}/api/auth/google/callback`;
    const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authorization.search = new URLSearchParams({ client_id: clientId, redirect_uri: callback, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' }).toString();
    const response = NextResponse.redirect(authorization);
    response.cookies.set(GOOGLE_STATE_COOKIE, state, OAUTH_COOKIE_OPTIONS);
    return response;
}

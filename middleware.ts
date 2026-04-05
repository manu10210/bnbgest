import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Pages qui nécessitent une authentification
const PROTECTED_PATHS = [
  '/dashboard',
  '/properties',
  '/bookings',
  '/guests',
  '/employee',
  '/settings',
  '/admin',
  '/inventory',
  '/maintenance',
  '/cleaning',
  '/contracts',
  '/reviews',
  '/gallery',
  '/monitoring',
  '/upload-video',
];

// Simple rate limit store (in-memory, par IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true; // OK
  }
  entry.count++;
  if (entry.count > limit) return false; // Bloqué
  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // ── Rate limiting sur les endpoints auth sensibles ──────────────────────────
  const authEndpoints = [
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/signin',
  ];
  if (authEndpoints.some(ep => pathname.startsWith(ep))) {
    const key = `auth:${ip}`;
    if (!checkRateLimit(key, 10, 60_000)) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans 1 minute.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  // ── Protection des pages : vérification du cookie de session ────────────────
  const isProtected = PROTECTED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

  if (isProtected) {
    // NextAuth v5 utilise authjs.session-token (prod) ou next-auth.session-token (dev)
    const sessionToken =
      request.cookies.get('authjs.session-token')?.value ||
      request.cookies.get('next-auth.session-token')?.value ||
      request.cookies.get('__Secure-authjs.session-token')?.value ||
      request.cookies.get('__Secure-next-auth.session-token')?.value;

    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();

  // Security Headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https: blob:;
    media-src 'self' data: blob:;
    connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com;
    frame-src 'self' https://accounts.google.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

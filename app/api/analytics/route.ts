export const dynamic = 'force-dynamic';

/**
 * 📊 Analytics API
 * ✅ Protected: Auth required, Rate limited (relaxed: 100/10s)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'edge';

interface AnalyticsPayload {
  metric: string;
  value: number;
  pathname: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'relaxed');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const payload: AnalyticsPayload = await request.json();
    
    // Validation
    if (!payload.metric || typeof payload.value !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Log les métriques (en production, envoyer vers une base de données)
    console.log('[Analytics]', {
      metric: payload.metric,
      value: payload.value,
      pathname: payload.pathname,
      timestamp: payload.timestamp,
    });

    // Retourner success
    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('[Analytics] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({ 
      status: 'Analytics endpoint active',
      metrics: ['CLS', 'FID', 'FCP', 'LCP', 'TTFB', 'INP'],
    }),
    { 
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    }
  );
}

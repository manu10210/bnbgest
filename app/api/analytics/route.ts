export const runtime = 'edge';

interface AnalyticsPayload {
  metric: string;
  value: number;
  pathname: string;
  timestamp: string;
}

export async function POST(request: Request) {
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

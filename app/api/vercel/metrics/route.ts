export const dynamic = 'force-dynamic';

export const runtime = 'edge';

interface SystemMetrics {
  uptime: number;
  services: {
    api: boolean;
    auth: boolean;
    database: boolean;
    storage: boolean;
    edge: boolean;
  };
  performance: {
    avgResponseTime: number;
    requestCount: number;
    errorRate: number;
  };
}

// Simuler des métriques (en production, connecter à une vraie base de données)
const getMockMetrics = (): SystemMetrics => ({
  uptime: 3600, // 1 heure en secondes
  services: {
    api: true,
    auth: true,
    database: true,
    storage: true,
    edge: true,
  },
  performance: {
    avgResponseTime: 45,
    requestCount: 12543,
    errorRate: 0.02,
  },
});

export async function GET(request: Request) {
  try {
    // Protection : token Bearer obligatoire
    const authHeader = request.headers.get('authorization');
    const internalToken = process.env.INTERNAL_API_TOKEN?.trim();

    if (!internalToken || authHeader !== `Bearer ${internalToken}`) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();
    
    const metrics = getMockMetrics();
    
    // Ajouter la latence de la requête
    const latency = Date.now() - startTime;
    
    return new Response(
      JSON.stringify({
        success: true,
        data: metrics,
        latency,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=5, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('[Metrics] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to fetch metrics' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Edge Function pour les API ultra-rapides
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface SystemStatus {
  status: 'operational' | 'degraded' | 'down';
  timestamp: string;
  region: string;
  latency: number;
  services: {
    api: boolean;
    auth: boolean;
    database: boolean;
    storage: boolean;
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Récupérer la région Vercel
    const region = request.headers.get('x-vercel-id')?.split(':')[0] || 'unknown';
    
    // Vérifier les services (simulé pour l'instant)
    const services = {
      api: true,
      auth: true,
      database: true, // À remplacer par une vraie vérification
      storage: true,
    };
    
    const allHealthy = Object.values(services).every(Boolean);
    const latency = Date.now() - startTime;
    
    const status: SystemStatus = {
      status: allHealthy ? 'operational' : latency > 1000 ? 'degraded' : 'operational',
      timestamp: new Date().toISOString(),
      region,
      latency,
      services,
    };

    return NextResponse.json(status, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
        'CDN-Cache-Control': 'public, s-maxage=60',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=3600',
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: 'down',
      timestamp: new Date().toISOString(),
      error: 'System check failed',
    }, {
      status: 503,
    });
  }
}

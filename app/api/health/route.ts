import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: boolean;
    api: boolean;
    auth: boolean;
  };
  memory?: {
    used: number;
    total: number;
  };
}

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Vérification basique des services
    const services = {
      database: true, // À remplacer par une vraie vérification de DB
      api: true,
      auth: true,
    };

    // Informations système (si disponibles)
    let memory;
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      memory = {
        used: Math.round(mem.heapUsed / 1024 / 1024),
        total: Math.round(mem.heapTotal / 1024 / 1024),
      };
    }

    const health: HealthStatus = {
      status: Object.values(services).every(Boolean) ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? Math.round(process.uptime()) : 0,
      version: '1.0.0',
      services,
      memory,
    };

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      ...health,
      responseTime: `${responseTime}ms`,
    }, {
      status: health.status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  }
}

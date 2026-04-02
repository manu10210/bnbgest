import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: boolean;
    databaseLatency?: number;
    api: boolean;
    auth: boolean;
  };
  memory?: {
    used: number;
    total: number;
  };
  responseTime: number;
}

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Vérification base de données avec latence
    let databaseHealthy = false;
    let dbLatency = 0;
    
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
      databaseHealthy = true;
    } catch (error) {
      console.error('[Health Check] Database error:', error);
    }

    // Vérification basique des services
    const services = {
      database: databaseHealthy,
      databaseLatency: dbLatency,
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

    const responseTime = Date.now() - startTime;

    const health: HealthStatus = {
      status: Object.values(services).every(v => typeof v === 'boolean' ? v : true) ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? Math.round(process.uptime()) : 0,
      version: '1.0.1',
      services,
      memory,
      responseTime,
    };

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

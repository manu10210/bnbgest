export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Web Vitals API Endpoint
 * 
 * Session 21: Performance Monitoring (Enhanced in Session 24)
 * - Receives Core Web Vitals metrics from client
 * - Stores metrics in database for historical analysis
 * - Logs metrics in development
 * - Ready for integration with external analytics (Google Analytics, Datadog, etc.)
 */

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id: string;
  navigationType?: string;
  timestamp?: number;
  url?: string;
  userAgent?: string;
  page?: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const metric: WebVitalMetric = await request.json();

    // Validate metric
    if (!metric.name || typeof metric.value !== 'number') {
      return NextResponse.json(
        { error: 'Invalid metric data' },
        { status: 400 }
      );
    }

    // Log metric in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals]', {
        metric: metric.name,
        value: Math.round(metric.value),
        rating: metric.rating,
        page: metric.page || metric.url,
      });
    }

    // Store in database (async, don't wait for response)
    // This is fire-and-forget to not slow down client
    prisma.webVital.create({
      data: {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        page: metric.page || (metric.url ? new URL(metric.url).pathname : '/'),
        userId: metric.userId || null,
        userAgent: metric.userAgent || request.headers.get('user-agent') || null,
        timestamp: new Date(),
      },
    }).catch((error: unknown) => {
      // Log error but don't fail the request
      if (error instanceof Error) {
        console.error('[Web Vitals] Failed to store metric:', error.message);
      }
    });

    // TODO: Send to external analytics service
    // Examples:
    // - Google Analytics 4: gtag('event', metric.name, { value: metric.value })
    // - Datadog: datadogRum.addTiming(metric.name, metric.value)
    // - Vercel Analytics: Already integrated via @vercel/analytics
    // - Custom analytics: await sendToAnalytics(metric)

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Web Vitals] Error processing metric:', error);
    return NextResponse.json(
      { error: 'Failed to process metric' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'web-vitals-collector',
    timestamp: new Date().toISOString(),
  });
}

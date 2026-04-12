import { NextRequest, NextResponse } from 'next/server';

/**
 * Web Vitals API Endpoint
 * 
 * Session 21: Performance Monitoring
 * - Receives Core Web Vitals metrics from client
 * - Logs metrics for analysis
 * - Can be extended to send to analytics service (Google Analytics, Datadog, etc.)
 */

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
  timestamp: number;
  url: string;
  userAgent: string;
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

    // Log metric (in production, send to analytics service)
    console.log('[Web Vitals]', {
      metric: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
      url: new URL(metric.url).pathname,
      timestamp: new Date(metric.timestamp).toISOString(),
    });

    // TODO: Send to analytics service
    // Examples:
    // - Google Analytics 4: gtag('event', metric.name, { value: metric.value })
    // - Datadog: datadogRum.addTiming(metric.name, metric.value)
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

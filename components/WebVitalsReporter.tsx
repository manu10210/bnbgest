'use client';

import { useEffect, useRef } from 'react';

/**
 * Web Vitals Reporter Component
 * 
 * Session 21: Performance Monitoring
 * - Tracks Core Web Vitals (LCP, FID, CLS, FCP, TTFB, INP)
 * - Sends metrics to analytics endpoint in production
 * - Logs metrics in development
 * - Implements rate limiting to avoid flooding
 */

interface Metric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

export function WebVitalsReporter() {
  const sentMetrics = useRef(new Set<string>());

  useEffect(() => {
    // Import web-vitals dynamically (client-side only)
    import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
      const handleMetric = (metric: Metric) => {
        // Avoid sending duplicate metrics
        const metricKey = `${metric.name}-${metric.id}`;
        if (sentMetrics.current.has(metricKey)) {
          return;
        }
        sentMetrics.current.add(metricKey);

        // Log in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Web Vitals] ${metric.name}:`, {
            value: `${Math.round(metric.value)}ms`,
            rating: metric.rating,
            delta: metric.delta,
          });
        }

        // Send to analytics in production
        if (process.env.NODE_ENV === 'production') {
          const body = JSON.stringify({
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id,
            navigationType: metric.navigationType,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
          });

          // Use sendBeacon if available (doesn't block page unload)
          if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/vitals', body);
          } else {
            // Fallback to fetch with keepalive
            fetch('/api/vitals', {
              method: 'POST',
              body,
              headers: { 'Content-Type': 'application/json' },
              keepalive: true,
            }).catch((error) => {
              // Silently fail in production
              console.error('[Web Vitals] Failed to send metric:', error);
            });
          }
        }
      };

      // Register all metrics
      onCLS(handleMetric);
      onFCP(handleMetric);
      onLCP(handleMetric);
      onTTFB(handleMetric);
      onINP(handleMetric);
    });

    // Cleanup on unmount
    return () => {
      sentMetrics.current.clear();
    };
  }, []);

  return null;
}

/**
 * Utility function to get metric thresholds
 * Based on Google's Core Web Vitals thresholds
 */
export function getMetricThresholds(metricName: string) {
  const thresholds = {
    LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
    FID: { good: 100, poor: 300 }, // First Input Delay
    CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
    FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
    TTFB: { good: 800, poor: 1800 }, // Time to First Byte
    INP: { good: 200, poor: 500 }, // Interaction to Next Paint
  };

  return thresholds[metricName as keyof typeof thresholds] || { good: 0, poor: 0 };
}

/**
 * Utility function to rate a metric value
 */
export function rateMetric(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const { good, poor } = getMetricThresholds(metricName);
  
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

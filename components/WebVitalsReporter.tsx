'use client';

import { useEffect, useRef } from 'react';
import { reportWebVitals } from '@/lib/web-vitals-tracker';

/**
 * Web Vitals Reporter Component
 * 
 * Session 21: Performance Monitoring (Enhanced in Session 24)
 * - Tracks Core Web Vitals (LCP, INP, CLS, FCP, TTFB)
 * - Sends metrics to analytics endpoint with user context
 * - Logs metrics in development with color coding
 * - Implements rate limiting to avoid flooding
 * - Stores in database for historical analysis
 */

export function WebVitalsReporter() {
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Initialize only once
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Use our enhanced tracker from lib/web-vitals-tracker.ts
    // It handles:
    // - All Core Web Vitals (LCP, INP, CLS, FCP, TTFB)
    // - Logging in development with colors
    // - Sending to /api/vitals
    // - User context (page, userId, userAgent)
    reportWebVitals();
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
    INP: { good: 200, poor: 500 }, // Interaction to Next Paint
    CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
    FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
    TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  };

  return thresholds[metricName as keyof typeof thresholds] || { good: 0, poor: 0 };
}

/**
 * Format metric value for display
 */
export function formatMetricValue(name: string, value: number): string {
  if (name === 'CLS') {
    return value.toFixed(3);
  }
  return `${Math.round(value)}ms`;
}

/**
 * Get rating color for UI display
 */
export function getRatingColor(rating: 'good' | 'needs-improvement' | 'poor'): string {
  const colors = {
    good: 'text-green-600',
    'needs-improvement': 'text-yellow-600',
    poor: 'text-red-600',
  };
  return colors[rating] || 'text-gray-600';
}

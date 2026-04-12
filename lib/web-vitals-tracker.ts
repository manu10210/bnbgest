/**
 * Web Vitals Tracker
 * 
 * Custom tracking for Core Web Vitals with database storage
 * Captures: LCP, FCP, CLS, FID, TTFB
 * Sends to /api/vitals for storage and analytics
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

interface WebVitalsData extends Metric {
  page?: string;
  userId?: string;
  userAgent?: string;
}

/**
 * Get user ID from session/cookie if available
 */
function getUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  
  try {
    // Try to get from session storage
    const sessionData = sessionStorage.getItem('bnbgest_user');
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      return parsed.id || parsed.email;
    }
  } catch (e) {
    // Silent fail
  }
  
  return undefined;
}

/**
 * Report metric to API endpoint
 */
async function sendToAPI(metric: WebVitalsData): Promise<void> {
  try {
    await fetch('/api/vitals', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metric),
      // Don't wait for response
      keepalive: true,
    });
  } catch (error) {
    // Silent fail - don't break user experience
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to send Web Vitals:', error);
    }
  }
}

/**
 * Log metric to console in development
 */
function logMetric(metric: Metric): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  const colors = {
    good: '\x1b[32m', // Green
    'needs-improvement': '\x1b[33m', // Yellow
    poor: '\x1b[31m', // Red
    reset: '\x1b[0m',
  };
  
  const color = colors[metric.rating] || colors.reset;
  const icon = metric.rating === 'good' ? '✅' : metric.rating === 'needs-improvement' ? '⚠️' : '❌';
  
  console.log(
    `${icon} ${color}${metric.name}: ${Math.round(metric.value)}${metric.name === 'CLS' ? '' : 'ms'} (${metric.rating})${colors.reset}`
  );
}

/**
 * Main Web Vitals reporting function
 * 
 * @param onPerfEntry - Optional callback for custom handling
 */
export function reportWebVitals(onPerfEntry?: (metric: WebVitalsData) => void): void {
  if (typeof window === 'undefined') return;
  
  const reportMetric = (metric: Metric) => {
    const data: WebVitalsData = {
      ...metric,
      page: window.location.pathname,
      userId: getUserId(),
      userAgent: navigator.userAgent,
    };
    
    // Log in development
    logMetric(metric);
    
    // Call custom callback if provided
    if (onPerfEntry) {
      onPerfEntry(data);
    }
    
    // Send to API for storage
    sendToAPI(data);
  };

  // Register all Core Web Vitals
  onCLS(reportMetric);
  onFCP(reportMetric);
  onINP(reportMetric); // Interaction to Next Paint (replaces FID)
  onLCP(reportMetric);
  onTTFB(reportMetric);
}

/**
 * Get rating thresholds for each metric
 */
export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },      // Largest Contentful Paint
  FCP: { good: 1800, poor: 3000 },      // First Contentful Paint
  CLS: { good: 0.1, poor: 0.25 },       // Cumulative Layout Shift
  INP: { good: 200, poor: 500 },        // Interaction to Next Paint
  TTFB: { good: 800, poor: 1800 },      // Time to First Byte
} as const;

/**
 * Calculate rating based on value and thresholds
 */
export function calculateRating(
  metricName: keyof typeof WEB_VITALS_THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[metricName];
  
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

export default reportWebVitals;

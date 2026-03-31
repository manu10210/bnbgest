'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Web Vitals tracking pour Vercel Analytics
export default function AnalyticsWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Track page views
    if (typeof window !== 'undefined' && pathname) {
      // Vercel Analytics tracking
      if ('__VERCEL_ANALYTICS__' in window) {
        console.log('[Analytics] Page view:', pathname);
      }

      // Track navigation timing
      if (window.performance && window.performance.navigation) {
        const navTiming = window.performance.navigation;
        const perfData = window.performance.timing;
        
        if (perfData.loadEventEnd > 0) {
          const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
          const connectTime = perfData.responseEnd - perfData.requestStart;
          const renderTime = perfData.domComplete - perfData.domLoading;
          
          console.log('[Performance]', {
            pathname,
            pageLoadTime: `${pageLoadTime}ms`,
            connectTime: `${connectTime}ms`,
            renderTime: `${renderTime}ms`,
          });
        }
      }
    }
  }, [pathname]);

  useEffect(() => {
    // Track Web Vitals
    if (typeof window !== 'undefined') {
      import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
        onCLS((metric: any) => {
          console.log('[Web Vital] CLS:', metric.value);
          sendToAnalytics('CLS', metric.value);
        });
        
        onFCP((metric: any) => {
          console.log('[Web Vital] FCP:', metric.value);
          sendToAnalytics('FCP', metric.value);
        });
        
        onLCP((metric: any) => {
          console.log('[Web Vital] LCP:', metric.value);
          sendToAnalytics('LCP', metric.value);
        });
        
        onTTFB((metric: any) => {
          console.log('[Web Vital] TTFB:', metric.value);
          sendToAnalytics('TTFB', metric.value);
        });

        onINP((metric: any) => {
          console.log('[Web Vital] INP:', metric.value);
          sendToAnalytics('INP', metric.value);
        });
      });
    }
  }, []);

  return <>{children}</>;
}

function sendToAnalytics(metric: string, value: number) {
  // Envoyer les métriques à Vercel Analytics
  if (typeof window !== 'undefined' && '__VERCEL_ANALYTICS__' in window) {
    try {
      // @ts-ignore
      window.__VERCEL_ANALYTICS__.track(metric, { value });
    } catch (error) {
      console.error('[Analytics] Failed to send metric:', error);
    }
  }

  // Envoyer également à l'API pour logging
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metric,
      value,
      pathname: window.location.pathname,
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {
    // Silently fail - analytics shouldn't break the app
  });
}

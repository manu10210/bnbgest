/**
 * Rate Limiting Middleware
 * Protège les routes API contre les abus et attaques DDoS
 * 
 * Note: Nécessite Upstash Redis
 * Installation: npm install @upstash/ratelimit @upstash/redis
 * 
 * Configuration .env:
 * UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
 * UPSTASH_REDIS_REST_TOKEN=AXXXxxx
 */

import { NextResponse } from 'next/server';

// Simple in-memory rate limiter pour développement
// En production, utiliser Upstash Redis

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  
  constructor() {
    // Nettoyage toutes les 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetTime < now) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }
  
  async limit(identifier: string, maxRequests: number, windowMs: number) {
    const now = Date.now();
    const entry = this.store.get(identifier);
    
    if (!entry || entry.resetTime < now) {
      // Nouveau window
      this.store.set(identifier, {
        count: 1,
        resetTime: now + windowMs
      });
      
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: now + windowMs
      };
    }
    
    if (entry.count >= maxRequests) {
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: entry.resetTime
      };
    }
    
    entry.count++;
    
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - entry.count,
      reset: entry.resetTime
    };
  }
  
  cleanup() {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Instance singleton
const rateLimiter = new InMemoryRateLimiter();

// Configuration des limites par type
export const RATE_LIMITS = {
  // Routes ultra sensibles (auth, paiements)
  strict: {
    requests: 10,
    window: 10 * 1000, // 10 req / 10s
  },
  
  // Routes normales (CRUD standard)
  normal: {
    requests: 30,
    window: 10 * 1000, // 30 req / 10s
  },
  
  // Routes de lecture (GET)
  relaxed: {
    requests: 100,
    window: 10 * 1000, // 100 req / 10s
  },
  
  // Upload fichiers
  upload: {
    requests: 5,
    window: 60 * 1000, // 5 req / minute
  },
  
  // Webhooks externes
  webhook: {
    requests: 50,
    window: 10 * 1000, // 50 req / 10s
  },
} as const;

/**
 * Applique rate limiting sur une requête
 * @param request - Requête HTTP
 * @param type - Type de limite (strict, normal, relaxed, upload, webhook)
 * @returns null si OK, NextResponse avec 429 si limite atteinte
 */
export async function rateLimit(
  request: Request,
  type: keyof typeof RATE_LIMITS = 'normal'
) {
  try {
    // Identifier l'utilisateur (IP ou user ID)
    const identifier = getIdentifier(request);
    
    // Configuration de la limite
    const config = RATE_LIMITS[type];
    
    // Vérifier la limite
    const { success, limit, remaining, reset } = await rateLimiter.limit(
      `${type}:${identifier}`,
      config.requests,
      config.window
    );
    
    // Headers de rate limit (standard RFC)
    const headers = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toISOString(),
      'X-RateLimit-Policy': `${config.requests};w=${config.window/1000}`,
    };
    
    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please retry after ${retryAfter} seconds.`,
          limit,
          remaining: 0,
          reset: new Date(reset).toISOString(),
          retryAfter,
        }),
        { 
          status: 429,
          headers: {
            ...headers,
            'Retry-After': retryAfter.toString(),
            'Content-Type': 'application/json',
          }
        }
      );
    }
    
    // OK - retourner null avec headers en contexte
    // Les headers seront ajoutés par l'appelant si nécessaire
    return null;
    
  } catch (error) {
    console.error('Rate limit error:', error);
    // En cas d'erreur, laisser passer (fail open)
    // En production, vous pourriez préférer fail closed
    return null;
  }
}

/**
 * Extrait un identifiant unique de la requête
 * Utilise en priorité: User ID > IP > Anonymous
 */
function getIdentifier(request: Request): string {
  // TODO: Extraire user ID de session si disponible
  // const session = await auth();
  // if (session?.user?.id) return session.user.id;
  
  // Utiliser l'IP comme fallback
  const ip = 
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ?? // Cloudflare
    'anonymous';
  
  // Nettoyer l'IP (prendre la première si multiple)
  return ip.split(',')[0].trim();
}

/**
 * Helper pour ajouter les headers de rate limit à une réponse
 */
export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  reset: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString());
  
  return response;
}

/**
 * Version avancée avec Upstash Redis (production)
 * Décommenter après installation de @upstash/ratelimit
 */
/*
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const rateLimiters = {
  strict: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10 s'),
    analytics: true,
    prefix: 'ratelimit:strict',
  }),
  
  normal: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '10 s'),
    analytics: true,
    prefix: 'ratelimit:normal',
  }),
  
  relaxed: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '10 s'),
    analytics: true,
    prefix: 'ratelimit:relaxed',
  }),
  
  upload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    analytics: true,
    prefix: 'ratelimit:upload',
  }),
  
  webhook: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '10 s'),
    analytics: true,
    prefix: 'ratelimit:webhook',
  }),
};

export async function rateLimitUpstash(
  request: Request,
  type: keyof typeof rateLimiters = 'normal'
) {
  const identifier = getIdentifier(request);
  const { success, limit, remaining, reset } = 
    await rateLimiters[type].limit(identifier);
  
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Too Many Requests',
        limit,
        remaining,
        reset: new Date(reset).toISOString(),
        retryAfter,
      }),
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(reset).toISOString(),
          'Retry-After': retryAfter.toString(),
          'Content-Type': 'application/json',
        }
      }
    );
  }
  
  return null;
}
*/

/**
 * Cleanup (pour tests uniquement)
 */
export function cleanupRateLimiter() {
  rateLimiter.cleanup();
}

/**
 * 🚀 Caching & Data Fetching System
 * Production-ready caching with SWR-like patterns
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  revalidateOnFocus?: boolean; // Revalidate when window gains focus
  revalidateOnReconnect?: boolean; // Revalidate when network reconnects
  dedupingInterval?: number; // Deduping interval in milliseconds (default: 2 seconds)
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private subscribers = new Map<string, Set<(data: any) => void>>();
  private focusHandler: (() => void) | null = null;
  private reconnectHandler: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupEventListeners();
    }
  }

  private setupEventListeners() {
    // Revalidate on focus
    this.focusHandler = () => {
      this.revalidateAll({ onFocus: true });
    };
    window.addEventListener('focus', this.focusHandler);

    // Revalidate on reconnect
    this.reconnectHandler = () => {
      this.revalidateAll({ onReconnect: true });
    };
    window.addEventListener('online', this.reconnectHandler);
  }

  /**
   * Get data from cache or fetch if not available/expired
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const {
      ttl = 5 * 60 * 1000, // 5 minutes default
      dedupingInterval = 2000,
    } = options;

    const now = Date.now();
    const cached = this.cache.get(key);

    // Return cached data if valid
    if (cached && now < cached.expiresAt) {
      // Trigger background revalidation if close to expiry (last 10%)
      const timeUntilExpiry = cached.expiresAt - now;
      if (timeUntilExpiry < ttl * 0.1) {
        this.revalidate(key, fetcher, options).catch(console.error);
      }
      return cached.data as T;
    }

    // Dedupe simultaneous requests
    const pending = this.pendingRequests.get(key);
    if (pending && now - (cached?.timestamp || 0) < dedupingInterval) {
      return pending;
    }

    // Fetch new data
    const request = this.fetch(key, fetcher, ttl);
    this.pendingRequests.set(key, request);

    try {
      const data = await request;
      return data;
    } finally {
      // Clean up pending request after deduping interval
      setTimeout(() => {
        if (this.pendingRequests.get(key) === request) {
          this.pendingRequests.delete(key);
        }
      }, dedupingInterval);
    }
  }

  /**
   * Internal fetch method
   */
  private async fetch<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
    try {
      const data = await fetcher();
      const now = Date.now();

      this.cache.set(key, {
        data,
        timestamp: now,
        expiresAt: now + ttl,
      });

      // Notify subscribers
      this.notify(key, data);

      return data;
    } catch (error) {
      this.pendingRequests.delete(key);
      throw error;
    }
  }

  /**
   * Revalidate a specific key in the background
   */
  private async revalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<void> {
    const { ttl = 5 * 60 * 1000 } = options;
    
    try {
      await this.fetch(key, fetcher, ttl);
    } catch (error) {
      console.error(`Failed to revalidate ${key}:`, error);
    }
  }

  /**
   * Revalidate all cached entries
   */
  private revalidateAll(context: { onFocus?: boolean; onReconnect?: boolean }) {
    // TODO: Implement selective revalidation based on options
    console.log('Revalidating cache:', context);
  }

  /**
   * Subscribe to cache updates for a key
   */
  subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  /**
   * Notify subscribers of data changes
   */
  private notify(key: string, data: any) {
    const subscribers = this.subscribers.get(key);
    if (subscribers) {
      subscribers.forEach(callback => callback(data));
    }
  }

  /**
   * Set data in cache manually
   */
  set<T>(key: string, data: T, ttl = 5 * 60 * 1000) {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
    this.notify(key, data);
  }

  /**
   * Invalidate (delete) cache entry
   */
  invalidate(key: string) {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.invalidate(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      entries: this.cache.size,
      pending: this.pendingRequests.size,
      subscribers: this.subscribers.size,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Destroy cache manager
   */
  destroy() {
    if (typeof window !== 'undefined') {
      if (this.focusHandler) {
        window.removeEventListener('focus', this.focusHandler);
      }
      if (this.reconnectHandler) {
        window.removeEventListener('online', this.reconnectHandler);
      }
    }
    this.clear();
  }
}

// Singleton instance
export const cache = new CacheManager();

/**
 * Utility function for API requests with caching
 */
export async function fetchWithCache<T>(
  url: string,
  options?: RequestInit & { cacheOptions?: CacheOptions }
): Promise<T> {
  const { cacheOptions, ...fetchOptions } = options || {};
  const cacheKey = `fetch:${url}:${JSON.stringify(fetchOptions)}`;

  return cache.get(
    cacheKey,
    async () => {
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    cacheOptions
  );
}

/**
 * Prefetch data and store in cache
 */
export function prefetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  return cache.get(key, fetcher, options);
}

/**
 * Mutate cache data
 */
export function mutate<T>(key: string, data: T, ttl?: number) {
  cache.set(key, data, ttl);
}

/**
 * Invalidate cache
 */
export function invalidate(key: string | RegExp) {
  if (typeof key === 'string') {
    cache.invalidate(key);
  } else {
    cache.invalidatePattern(key);
  }
}

// Auto cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 5 * 60 * 1000);
}

export default cache;

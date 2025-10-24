/**
 * ETag Cache Entry
 * Stores ETags and response data for 304 Not Modified support
 */
export interface ETagCacheEntry {
  etag: string;
  data: any;
  timestamp: number;
  hits: number;
  lastAccessed: number;
}

/**
 * ETag Cache Configuration
 */
export interface ETagConfig {
  enabled?: boolean;
  maxCacheSize?: number;
}

/**
 * Cache Statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * ETag Cache Implementation
 * 
 * Provides in-memory caching for ETags and response data with:
 * - LRU eviction when maxCacheSize is reached
 * - Statistics tracking (hits, misses, hit rate)
 * - Stable cache key generation from query parameters
 */
export class ETagCache {
  private cache: Map<string, ETagCacheEntry>;
  private enabled: boolean;
  private maxCacheSize: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(config?: ETagConfig) {
    this.cache = new Map();
    this.enabled = config?.enabled !== false; // Default to true
    this.maxCacheSize = config?.maxCacheSize ?? 100;
  }

  /**
   * Checks if ETag caching is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Generates a cache key from connection, endpoint, and query parameters
   */
  generateCacheKey(connection: string, endpoint: string, params?: any): string {
    const queryString = params ? JSON.stringify(this.canonicalizeParams(params)) : '';
    const hash = this.simpleHash(queryString);
    return `${connection}:${endpoint}:${hash}`;
  }

  /**
   * Canonicalizes parameters for stable hashing
   * Sorts object keys recursively to ensure same query = same hash
   */
  private canonicalizeParams(params: any): any {
    if (params === null || params === undefined) return params;
    if (typeof params !== 'object') return params;
    if (Array.isArray(params)) return params.map(p => this.canonicalizeParams(p));

    const sorted: any = {};
    Object.keys(params)
      .sort()
      .forEach(key => {
        sorted[key] = this.canonicalizeParams(params[key]);
      });
    return sorted;
  }

  /**
   * Simple hash function for cache keys
   * Uses base64 encoding of the stringified params or djb2 hash
   */
  private simpleHash(str: string): string {
    if (!str) return 'empty';
    
    try {
      // Use btoa for browser environments
      if (typeof btoa !== 'undefined') {
        return btoa(unescape(encodeURIComponent(str)))
          .replace(/[+/=]/g, '');
      }
      
      // Fallback for Node.js environments
      if (typeof Buffer !== 'undefined') {
        return Buffer.from(str)
          .toString('base64')
          .replace(/[+/=]/g, '');
      }
      
      // Simple djb2 hash fallback
      let hash = 5381;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) + hash) + char; // hash * 33 + char
      }
      return Math.abs(hash).toString(36);
    } catch (error) {
      console.warn('[ETagCache] Failed to hash string, using timestamp:', error);
      return Date.now().toString(36);
    }
  }

  /**
   * Gets a cached entry by key
   */
  get(key: string): ETagCacheEntry | null {
    if (!this.enabled) return null;

    const entry = this.cache.get(key);
    if (entry) {
      // Update access time and hit count
      entry.lastAccessed = Date.now();
      entry.hits++;
      this.hits++;
      return entry;
    }

    this.misses++;
    return null;
  }

  /**
   * Stores an entry in the cache
   * Implements LRU eviction when cache is full
   */
  set(key: string, etag: string, data: any): void {
    if (!this.enabled) return;

    // Check if we need to evict
    if (this.cache.size >= this.maxCacheSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      etag,
      data,
      timestamp: now,
      hits: 0,
      lastAccessed: now,
    });
  }

  /**
   * Evicts the least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clears cache entries matching a pattern
   * Pattern format: "connection:endpoint:" to clear all queries for that endpoint
   */
  clearByPattern(pattern: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Clears a specific cache entry
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clears all cache entries and resets statistics
   */
  clearAll(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Gets cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Gets the current cache size
   */
  size(): number {
    return this.cache.size;
  }
}


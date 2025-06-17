import { CacheStorage, CacheEntry, CacheConfig } from './CacheStorage.js';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

/**
 * Default cache storage that automatically selects the best storage mechanism
 * - Browser: IndexedDB (with idb library)
 * - Node.js: In-memory Map
 */
export class DefaultCacheStorage implements CacheStorage {
  private storage: CacheStorage;

  constructor(config: CacheConfig = {}) {
    if (isBrowser) {
      this.storage = new IndexedDBStorage(config);
    } else {
      this.storage = new MemoryStorage(config);
    }
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    return this.storage.get(key);
  }

  async set<T>(key: string, value: CacheEntry<T>): Promise<void> {
    return this.storage.set(key, value);
  }

  async delete(key: string): Promise<void> {
    return this.storage.delete(key);
  }

  async clear(): Promise<void> {
    return this.storage.clear();
  }

  async deleteByPattern(pattern: string): Promise<void> {
    return this.storage.deleteByPattern(pattern);
  }

  async size(): Promise<number> {
    return this.storage.size();
  }
}

/**
 * IndexedDB-based cache storage for browsers
 */
class IndexedDBStorage implements CacheStorage {
  private dbPromise: Promise<any> | null = null;
  private config: CacheConfig;

  constructor(config: CacheConfig = {}) {
    this.config = { ttl: 5 * 60 * 1000, maxSize: 1000, ...config }; // 5 minutes default TTL
    this.initDB();
  }

  private async initDB(): Promise<void> {
    if (this.dbPromise) return;

    try {
      // Dynamic import of idb for browsers only (requires: npm install idb)
      const { openDB } = await import('idb');

      this.dbPromise = openDB('vysta-cache', 1, {
        upgrade(db: any) {
          if (!db.objectStoreNames.contains('cache')) {
            db.createObjectStore('cache');
          }
        },
      });
    } catch (error) {
      // Fallback to memory storage if IndexedDB fails
      console.warn('[VystaCache] IndexedDB not available, falling back to memory storage:', error);
      const memoryStorage = new MemoryStorage(this.config);
      Object.setPrototypeOf(this, Object.getPrototypeOf(memoryStorage));
      Object.assign(this, memoryStorage);
    }
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      if (!this.dbPromise) return null;
      const db = await this.dbPromise;
      const entry = await db.get('cache', key);

      if (!entry) return null;

      // Check TTL
      const now = Date.now();
      const entryTtl = entry.ttl || this.config.ttl;
      if (entryTtl && now > entry.timestamp + entryTtl) {
        await this.delete(key);
        return null;
      }

      return entry;
    } catch (error) {
      console.warn('[VystaCache] Failed to get from IndexedDB:', error);
      return null;
    }
  }

  async set<T>(key: string, value: CacheEntry<T>): Promise<void> {
    try {
      if (!this.dbPromise) return;
      const db = await this.dbPromise;

      // Apply TTL from config if not set on entry
      if (!value.ttl) {
        value.ttl = this.config.ttl;
      }

      await db.put('cache', value, key);

      // Check size limit and evict if necessary
      if (this.config.maxSize) {
        await this.evictIfNeeded();
      }
    } catch (error) {
      console.warn('[VystaCache] Failed to set in IndexedDB:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (!this.dbPromise) return;
      const db = await this.dbPromise;
      await db.delete('cache', key);
    } catch (error) {
      console.warn('[VystaCache] Failed to delete from IndexedDB:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      if (!this.dbPromise) return;
      const db = await this.dbPromise;
      await db.clear('cache');
    } catch (error) {
      console.warn('[VystaCache] Failed to clear IndexedDB:', error);
    }
  }

  async deleteByPattern(pattern: string): Promise<void> {
    try {
      if (!this.dbPromise) return;
      const db = await this.dbPromise;
      const tx = db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      const keys = await store.getAllKeys();

      for (const key of keys) {
        if (typeof key === 'string' && key.includes(pattern)) {
          await store.delete(key);
        }
      }
      await tx.done;
    } catch (error) {
      console.warn('[VystaCache] Failed to delete by pattern from IndexedDB:', error);
    }
  }

  async size(): Promise<number> {
    try {
      if (!this.dbPromise) return 0;
      const db = await this.dbPromise;
      return await db.count('cache');
    } catch (error) {
      console.warn('[VystaCache] Failed to get size from IndexedDB:', error);
      return 0;
    }
  }

  private async evictIfNeeded(): Promise<void> {
    if (!this.config.maxSize || !this.dbPromise) return;

    try {
      const db = await this.dbPromise;
      const tx = db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      const entries = await store.getAll();

      if (entries.length > this.config.maxSize) {
        // Sort by timestamp (LRU eviction)
        entries.sort((a: any, b: any) => a.timestamp - b.timestamp);
        const toDelete = entries.slice(0, entries.length - this.config.maxSize);

        for (const entry of toDelete) {
          const key = await store.getKey(entry);
          if (key) await store.delete(key);
        }
      }
      await tx.done;
    } catch (error) {
      console.warn('[VystaCache] Failed to evict entries:', error);
    }
  }
}

/**
 * In-memory cache storage for Node.js environments
 */
class MemoryStorage implements CacheStorage {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;

  constructor(config: CacheConfig = {}) {
    this.config = { ttl: 5 * 60 * 1000, maxSize: 1000, ...config };
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    const now = Date.now();
    const entryTtl = entry.ttl || this.config.ttl;
    if (entryTtl && now > entry.timestamp + entryTtl) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  async set<T>(key: string, value: CacheEntry<T>): Promise<void> {
    // Apply TTL from config if not set on entry
    if (!value.ttl) {
      value.ttl = this.config.ttl;
    }

    this.cache.set(key, value);

    // Check size limit and evict if necessary
    if (this.config.maxSize && this.cache.size > this.config.maxSize) {
      await this.evictOldest();
    }
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async deleteByPattern(pattern: string): Promise<void> {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  private async evictOldest(): Promise<void> {
    // Find oldest entry (LRU eviction)
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

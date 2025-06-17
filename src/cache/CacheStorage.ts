export interface Range {
  start: number;
  end: number;
}

export interface CacheEntry<T> {
  records: T[];
  loadedRanges: Range[];
  totalCount?: number;
  timestamp: number;
  ttl?: number;
}

export interface CacheConfig {
  enabled?: boolean;
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

export interface CacheStorage {
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, value: CacheEntry<T>): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  deleteByPattern(pattern: string): Promise<void>;
  size(): Promise<number>;
} 
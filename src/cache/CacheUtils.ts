import { Range } from './CacheStorage.js';

/**
 * Generates a deterministic cache key from service identity and parameters
 */
export function generateCacheKey(
  connection: string,
  entity: string,
  method: string,
  params?: any,
): string {
  const baseKey = `${connection}:${entity}:${method}`;

  if (!params) {
    return baseKey;
  }

  // For range-aware caching, exclude offset and limit from key generation (ignored vars prefixed with _)
  const { offset: _offset, limit: _limit, ...cacheableParams } = params;
  // Explicitly mark unused destructured vars to satisfy eslint
  void _offset;
  void _limit;

  if (Object.keys(cacheableParams).length === 0) {
    return baseKey;
  }

  const paramHash = hashObject(cacheableParams);
  return `${baseKey}:${paramHash}`;
}

/**
 * Creates a deterministic hash from an object
 */
function hashObject(obj: any): string {
  try {
    // Sort keys for deterministic serialization
    const sorted = sortObjectKeys(obj);
    const serialized = JSON.stringify(sorted);

    // Simple hash using btoa (base64 encoding)
    // For production, consider using a proper hash function
    return btoa(unescape(encodeURIComponent(serialized)))
      .replace(/[+/=]/g, '') // Remove URL-unsafe characters
      .substring(0, 32); // Limit length
  } catch (error) {
    console.warn('[VystaCache] Failed to hash object, using timestamp:', error);
    return Date.now().toString();
  }
}

/**
 * Recursively sorts object keys for deterministic serialization
 */
function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }

  const sorted: any = {};
  Object.keys(obj)
    .sort()
    .forEach(key => {
      sorted[key] = sortObjectKeys(obj[key]);
    });

  return sorted;
}

/**
 * Checks if a requested range is covered by existing loaded ranges
 */
export function isRangeCovered(
  requestedOffset: number,
  requestedLimit: number,
  loadedRanges: Range[],
  totalCount?: number,
): boolean {
  const requestedStart = requestedOffset;
  let requestedEnd = requestedOffset + requestedLimit - 1;

  if (typeof totalCount === 'number') {
    // Cap the requested end to the last available record index
    const maxIndex = totalCount - 1;
    if (requestedStart > maxIndex) {
      return false; // Requested range starts beyond available data
    }
    requestedEnd = Math.min(requestedEnd, maxIndex);
  }

  for (const range of loadedRanges) {
    if (range.start <= requestedStart && range.end >= requestedEnd) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts records from cached data for a specific range
 */
export function extractRangeFromCache<T>(
  cachedRecords: T[],
  requestedOffset: number,
  requestedLimit: number,
  loadedRanges: Range[],
  totalCount?: number,
): T[] | null {
  if (!isRangeCovered(requestedOffset, requestedLimit, loadedRanges, totalCount)) {
    return null;
  }

  const startIndex = requestedOffset;
  let endIndex = startIndex + requestedLimit;

  if (typeof totalCount === 'number') {
    endIndex = Math.min(endIndex, totalCount);
  }

  // Ensure we don't exceed the cached array length
  endIndex = Math.min(endIndex, cachedRecords.length);

  const slice = cachedRecords.slice(startIndex, endIndex).filter(record => record !== null);
  return slice;
}

/**
 * Merges new records into existing cache, updating loaded ranges
 */
export function mergeRangeIntoCache<T>(
  existingRecords: T[],
  existingRanges: Range[],
  newRecords: T[],
  newOffset: number,
): { records: T[]; ranges: Range[] } {
  // Clone existing data
  const records = [...existingRecords];
  const ranges = [...existingRanges];

  // Insert new records at the correct position
  const newEnd = newOffset + newRecords.length - 1;

  // Extend records array if needed
  while (records.length <= newEnd) {
    records.push(null as any);
  }

  // Insert new records
  for (let i = 0; i < newRecords.length; i++) {
    records[newOffset + i] = newRecords[i];
  }

  // Add new range
  const newRange: Range = { start: newOffset, end: newEnd };
  ranges.push(newRange);

  // Merge overlapping ranges
  ranges.sort((a, b) => a.start - b.start);
  const mergedRanges: Range[] = [];

  for (const range of ranges) {
    if (mergedRanges.length === 0) {
      mergedRanges.push(range);
      continue;
    }

    const lastRange = mergedRanges[mergedRanges.length - 1];
    if (range.start <= lastRange.end + 1) {
      // Merge overlapping or adjacent ranges
      lastRange.end = Math.max(lastRange.end, range.end);
    } else {
      mergedRanges.push(range);
    }
  }

  return { records, ranges: mergedRanges };
}

/**
 * Generates pattern for cache invalidation based on connection and entity
 */
export function generateInvalidationPattern(connection: string, entity: string): string {
  return `${connection}:${entity}:`;
}

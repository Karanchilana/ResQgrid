/**
 * Lightweight in-memory TTL (Time-To-Live) cache.
 * Avoids extra external dependencies while offering exact TTL expiration semantics.
 */
class MemoryCache {
  constructor(defaultTtlSeconds = 60) {
    this.defaultTtl = defaultTtlSeconds * 1000;
    this.store = new Map();
  }

  /**
   * Store a value with optional custom TTL in seconds
   */
  set(key, value, ttlSeconds = null) {
    const ttl = ttlSeconds !== null ? ttlSeconds * 1000 : this.defaultTtl;
    const expiresAt = Date.now() + ttl;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Retrieve a value if not expired
   */
  get(key) {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  /**
   * Check if a valid (non-expired) entry exists
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Delete an entry
   */
  del(key) {
    return this.store.delete(key);
  }

  /**
   * Clear all entries
   */
  clear() {
    this.store.clear();
  }

  /**
   * Current number of entries (including any un-evicted expired entries)
   */
  size() {
    return this.store.size;
  }
}

// Export singleton instance with default 60s TTL, plus the class for isolated instances (e.g. testing)
const defaultCache = new MemoryCache(60);
module.exports = {
  cache: defaultCache,
  MemoryCache,
};

/**
 * Application Cache — PRODUCTION PERFORMANCE FIX
 *
 * Problem: Every authenticated request was hitting the database for:
 *   - Brand info (name, industry, active_platforms)
 *   - Priority goals (read before EVERY AI call)
 *   - API keys (fetched on every AI request)
 *   - Benchmark data (static reference data)
 *
 * Fix: In-memory TTL cache. Each item expires after its TTL.
 * No Redis needed for this level of caching.
 *
 * Cache TTLs:
 *   - Brand info:    5 minutes (changes rarely)
 *   - Active goals:  2 minutes (can change on reorder)
 *   - API keys:      10 minutes (rarely change)
 *   - Health score:  15 minutes (expensive to recompute)
 *   - Benchmarks:    1 hour (static reference data)
 */
import { pool } from '../db/db.js';


class TTLCache {
   store = new Map();
   ttlMs
   maxSize
   name

  constructor(name, ttlSeconds, maxSize = 500) {
    this.name  = name;
    this.ttlMs = ttlSeconds * 1000;
    this.maxSize = maxSize;

    // Clean expired entries every minute
    setInterval(() => this.cleanup(), 60_000).unref();
  }

  get(key){
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    entry.hits++;
    return entry.value;
  }

  set(key, value) {
    // Evict oldest entries if at max size
    if (this.store.size >= this.maxSize) {
      const oldest = [...this.store.entries()]
        .sort(([,a], [,b]) => a.expiresAt - b.expiresAt)[0];
      if (oldest) this.store.delete(oldest[0]);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs, hits: 0 });
  }

  invalidate(key) {
    this.store.delete(key);
  }

  invalidatePrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

   cleanup() {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) { this.store.delete(key); removed++; }
    }
    if (removed > 0) {
      // Only log in debug mode
      if (process.env.CACHE_DEBUG) {
        console.log(`[Cache:${this.name}] Cleaned ${removed} expired entries. Size: ${this.store.size}`);
      }
    }
  }

  stats() {
    return { name: this.name, size: this.store.size, maxSize: this.maxSize, ttlSeconds: this.ttlMs / 1000 };
  }
}

// ── Cache instances ───────────────────────────────────────────────────
export const brandCache   = new TTLCache('brand',   5 * 60);   // 5 min
export const goalsCache   = new TTLCache('goals',   2 * 60);   // 2 min
export const apiKeyCache  = new TTLCache('apikeys', 10 * 60);  // 10 min
export const healthCache  = new TTLCache('health',  15 * 60);  // 15 min
export const benchCache   = new TTLCache('bench',   60 * 60);  // 1 hour

// ── Cache-aware query helpers ─────────────────────────────────────────



/** Get brand with caching — avoids repeated SELECT on every dashboard load */
export const getCachedBrand = async (brandId) => {
  const cached = brandCache.get(brandId);
  if (cached) return cached;

  const { rows } = await query(
    'SELECT b.*, o.currency, o.timezone, o.features FROM brands b LEFT JOIN organisations o ON o.id = b.organisation_id WHERE b.id = $1',
    [brandId]
  );
  const brand = rows[0] || null;
  if (brand) brandCache.set(brandId, brand);
  return brand;
};

/** Get active goals with caching — called before EVERY AI request */
export const getCachedGoals = async (brandId) => {
  const cacheKey = `goals:${brandId}`;
  const cached = goalsCache.get(cacheKey);
  if (cached) return cached 

  const { rows } = await query(
    'SELECT * FROM priority_goals WHERE brand_id=$1 AND is_active=true ORDER BY priority_rank ASC',
    [brandId]
  );
  goalsCache.set(cacheKey, rows);
  return rows;
};

/** Get stored API key with caching — avoids decrypt on every AI call */
export const getCachedApiKey = async (brandId, platform) => {
  const cacheKey = `${brandId}:${platform}`;
  const cached = apiKeyCache.get(cacheKey);
  if (cached !== null) return cached ;

  const { rows } = await query(
    'SELECT encrypted_key FROM api_keys_store WHERE brand_id=$1 AND platform=$2 AND is_active=true',
    [brandId, platform]
  ).catch(() => ({ rows: [] }));

  if (!rows[0]) {
    // Cache the miss too (null) so we don't keep hitting DB
    const envKey = platform === 'anthropic' ? (process.env.ANTHROPIC_API_KEY || null) : null;
    apiKeyCache.set(cacheKey, envKey);
    return envKey;
  }

  // Decrypt key
  const crypto = require('crypto');
  try {
    const key = Buffer.from((process.env.ENCRYPTION_KEY || 'dev-fallback-key-NOT-for-prod!!!').slice(0, 32));
    const [a, b, t] = rows[0].encrypted_key.split(':');
    const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(a, 'hex'));
    d.setAuthTag(Buffer.from(t, 'hex'));
    const decrypted = d.update(Buffer.from(b, 'hex')) + d.final('utf8');
    apiKeyCache.set(cacheKey, decrypted);
    return decrypted;
  } catch {
    return null;
  }
};

/** Invalidate cache when user updates their configuration */
export const invalidateBrandCache = (brandId) => {
  brandCache.invalidate(brandId);
  goalsCache.invalidatePrefix(`goals:${brandId}`);
  apiKeyCache.invalidatePrefix(brandId);
  healthCache.invalidate(`health:${brandId}`);
};

/** Cache stats endpoint for monitoring */
export const getCacheStats = () => [
  brandCache.stats(), goalsCache.stats(), apiKeyCache.stats(),
  healthCache.stats(), benchCache.stats(),
];

export const db = {
  brandCache, goalsCache, apiKeyCache, healthCache, benchCache,
  getCachedBrand, getCachedGoals, getCachedApiKey,
  invalidateBrandCache, getCacheStats,
};

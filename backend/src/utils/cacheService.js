/**
 * cacheService.js
 *
 * Redis-backed cache with:
 *  1. getOrSet()   — cache-aside with in-process mutex to prevent stampedes
 *  2. del() / delMany() — key invalidation for write-through
 *  3. queueSpotWrite() — write-behind queue for high-frequency spot updates
 *     (flushes every 500 ms; excluded from payment / wallet flows)
 *
 * If Redis is unavailable the cache degrades gracefully: every call goes
 * straight to the fetchFn / DB with no caching, so the app keeps working.
 */

const Redis = require('ioredis');
const logger = require('../config/logger');

// ─── Redis client ──────────────────────────────────────────────────────────────
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,       // fail fast rather than blocking every request
  enableOfflineQueue: false,     // don't queue commands while disconnected
  lazyConnect: true,             // don't throw at startup if Redis isn't running
});

let redisOk = false;

redis.on('connect', () => {
  redisOk = true;
  logger.info('cache_service_redis_connected');
});

redis.on('error', (err) => {
  if (redisOk) {
    logger.warn('cache_service_redis_error', { message: err.message });
  }
  redisOk = false;
});

// Attempt initial connection (non-fatal — the app runs without cache).
redis.connect().catch(() => {});

// ─── In-process stampede-prevention mutex ─────────────────────────────────────
/** @type {Map<string, Promise<any>>} */
const inFlight = new Map();

// ─── Public helpers ────────────────────────────────────────────────────────────

/**
 * Cache-aside read with stampede protection.
 *
 * @param {string} key        Redis key
 * @param {number} ttlSeconds TTL in seconds
 * @param {() => Promise<any>} fetchFn  Called on cache miss; return value is stored
 * @returns {Promise<any>}
 */
async function getOrSet(key, ttlSeconds, fetchFn) {
  if (redisOk) {
    try {
      const cached = await redis.get(key);
      if (cached !== null) {
        return JSON.parse(cached);
      }
    } catch (_) {
      // Redis read failed — fall through to fetch
    }
  }

  // If another coroutine is already fetching this key, piggyback on it.
  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = fetchFn().then(async (value) => {
    inFlight.delete(key);
    if (redisOk && value !== undefined && value !== null) {
      try {
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
      } catch (_) {
        // Non-fatal: cache write failed
      }
    }
    return value;
  }).catch((err) => {
    inFlight.delete(key);
    throw err;
  });

  inFlight.set(key, promise);
  return promise;
}

/**
 * Delete one or more cache keys.
 *
 * @param {...string} keys
 */
async function del(...keys) {
  if (!redisOk || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    logger.warn('cache_del_failed', { keys, message: err.message });
  }
}

/**
 * Convenience alias for deleting several related keys at once.
 * @param {string[]} keys
 */
async function delMany(keys) {
  return del(...keys);
}

// ─── Write-behind queue ────────────────────────────────────────────────────────
/**
 * Pending spot updates: spotId (string) → partial update object.
 * Merged on repeated calls so only the freshest values are written.
 *
 * This is intentionally NOT used for wallet/payment routes (those live in
 * paymentRoutes.js and must be immediately consistent).
 */
const _writeQueue = new Map();

/**
 * Queue a non-financial spot field update to be flushed in the next
 * 500 ms write-behind cycle.
 *
 * @param {string} spotId      Mongoose ObjectId string
 * @param {object} updateFields  Plain object of fields to $set on the document
 * @param {Function} saveFn    Async function (spotId, updateFields) → void;
 *                             injected from ParkingRoutes to avoid circular deps
 */
function queueSpotWrite(spotId, updateFields, saveFn) {
  const id = spotId.toString();
  _writeQueue.set(id, {
    ..._writeQueue.get(id),
    fields: { ...(_writeQueue.get(id)?.fields || {}), ...updateFields },
    saveFn,   // always use the freshest caller-supplied save function
  });
}

// Flush the write-behind queue every 500 ms.
setInterval(async () => {
  if (_writeQueue.size === 0) return;
  const batch = new Map(_writeQueue);
  _writeQueue.clear();

  for (const [spotId, { fields, saveFn }] of batch) {
    try {
      await saveFn(spotId, fields);
      // Invalidate affected cache keys after successful write.
      await delMany([`spot:${spotId}`, 'spots:all', 'spots:available']);
    } catch (err) {
      logger.error('write_behind_flush_failed', {
        spotId,
        fields,
        message: err.message,
      });
    }
  }
}, 500);

module.exports = { getOrSet, del, delMany, queueSpotWrite };

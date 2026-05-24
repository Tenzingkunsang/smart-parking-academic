/**
 * withTransaction.js — graceful transaction wrapper.
 *
 * Bug HIGH-2: Mongo only supports transactions on a replica set or sharded
 * cluster. On a standalone mongod (common in dev / academic deployments) any
 * `session.withTransaction(...)` call throws with code 20 ("Transaction numbers
 * are only allowed on a replica set member").
 *
 * This wrapper tries a real transaction first. If the server reports that it
 * does not support transactions, it falls back to running the work *without*
 * a session — preserving correctness for single-instance Mongo, while still
 * giving full ACID guarantees on production replica sets.
 *
 * Callers should write their work block so each step is idempotent or
 * self-rolling-back where possible; the fallback path cannot undo partial
 * writes the way a real transaction can.
 */

const mongoose = require('mongoose');
const logger = require('../config/logger');

const TXN_UNSUPPORTED_CODES = new Set([20, 40573, 263, 251]);
const TXN_UNSUPPORTED_MARKERS = [
  'Transaction numbers are only allowed',
  'replica set',
  'not supported on a standalone',
  'sharded clusters',
];

let cachedTransactionSupport = null;

function isTxnUnsupportedError(err) {
  if (!err) return false;
  if (TXN_UNSUPPORTED_CODES.has(err.code)) return true;
  if (typeof err.message === 'string' && TXN_UNSUPPORTED_MARKERS.some((m) => err.message.includes(m))) return true;
  return false;
}

/**
 * Run `work` inside a transaction if the server supports one, otherwise run
 * it without a session.
 *
 * @param {(session: import('mongoose').ClientSession | null) => Promise<any>} work
 * @returns {Promise<any>} whatever `work` returned
 */
async function withTransaction(work) {
  if (cachedTransactionSupport === false) {
    return work(null);
  }

  let session;
  try {
    session = await mongoose.startSession();
  } catch (e) {
    // No connection / driver error — bubble up as-is.
    throw e;
  }

  let result;
  try {
    await session.withTransaction(async () => {
      result = await work(session);
    });
    cachedTransactionSupport = true;
    return result;
  } catch (e) {
    if (isTxnUnsupportedError(e)) {
      cachedTransactionSupport = false;
      logger?.warn?.('transactions_unsupported_falling_back', { message: e.message });
      // Re-run the work without a session.
      return work(null);
    }
    throw e;
  } finally {
    try { await session.endSession(); } catch { /* ignore */ }
  }
}

module.exports = { withTransaction, isTxnUnsupportedError };

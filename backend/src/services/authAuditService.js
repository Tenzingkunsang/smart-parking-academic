const AuthAuditLog = require('../models/AuthAuditLog');
const logger = require('../config/logger');

async function logAuthEvent({ userId = null, event, req, meta = {} }) {
  try {
    await AuthAuditLog.create({
      user: userId,
      event,
      requestId: req?.requestId || '',
      ipAddress: req?.ip || '',
      userAgent: req?.headers?.['user-agent'] || '',
      meta,
    });
  } catch (error) {
    logger.error('auth_audit_log_failed', { event, message: error.message });
  }
}

module.exports = { logAuthEvent };

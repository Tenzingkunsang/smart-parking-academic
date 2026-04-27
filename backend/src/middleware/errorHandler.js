const logger = require('../config/logger');
const AppError = require('../errors/AppError');

function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Something went wrong';

  logger.error('request_failed', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code,
    message,
    stack: err.stack,
  });

  const response = {
    success: false,
    error: {
      code,
      message,
      requestId: req.requestId,
    },
  };

  if (process.env.NODE_ENV !== 'production' && err.details) {
    response.error.details = err.details;
  }

  res.status(statusCode).json(response);
}

module.exports = { notFound, errorHandler };

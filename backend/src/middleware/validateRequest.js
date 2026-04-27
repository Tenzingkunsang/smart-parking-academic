const { validationResult } = require('express-validator');
const AppError = require('../errors/AppError');

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors.array()));
  }
  return next();
}

module.exports = validateRequest;

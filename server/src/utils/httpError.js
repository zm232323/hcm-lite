'use strict';

class HttpError extends Error {
  constructor(statusCode, code, message, fields) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields || null;
  }
}

const unauthorized = (message = 'Not authenticated') =>
  new HttpError(401, 'UNAUTHORIZED', message);

const forbidden = (message = 'Forbidden') =>
  new HttpError(403, 'FORBIDDEN', message);

const notFound = (message = 'Not found') =>
  new HttpError(404, 'NOT_FOUND', message);

const conflict = (message = 'Resource already exists') =>
  new HttpError(409, 'CONFLICT', message);

const validation = (message = 'Validation failed', fields) =>
  new HttpError(422, 'VALIDATION_ERROR', message, fields);

const businessRule = (message = 'Business rule violation') =>
  new HttpError(422, 'BUSINESS_RULE_VIOLATION', message);

module.exports = { HttpError, unauthorized, forbidden, notFound, conflict, validation, businessRule };

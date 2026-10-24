'use strict';
const { validation } = require('../utils/httpError');

/**
 * Factory: validate(zodSchema)
 * Validates req.body against the schema. On failure returns 422 with field errors.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.');
        fields[key] = issue.message;
      }
      return next(validation('Validation failed', fields));
    }
    req.body = result.data;
    next();
  };
}

module.exports = validate;

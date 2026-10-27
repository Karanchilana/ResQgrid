/**
 * Centralized Express Error Handling Middleware.
 * Normalizes Mongoose errors, CastErrors, JSON syntax issues, and unhandled exceptions.
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log in development or test if not an expected validation error
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${err.name || 'Error'}: ${err.message}`);
  }

  // Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Resource not found with id of '${err.value}'`;
    return res.status(404).json({
      success: false,
      error: message,
    });
  }

  // Mongoose Duplicate Key (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `Duplicate value entered for ${field}. Please use another value.`;
    return res.status(409).json({
      success: false,
      error: message,
    });
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: messages,
    });
  }

  // JSON Syntax Error in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON payload in request body.',
    });
  }

  // Default to 500 Internal Server Error
  const statusCode = err.statusCode || res.statusCode >= 400 ? res.statusCode : 500;
  return res.status(statusCode).json({
    success: false,
    error: error.message || 'Server Error',
  });
};

module.exports = errorHandler;

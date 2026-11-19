function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof SyntaxError && error.status === 400 && Object.prototype.hasOwnProperty.call(error, 'body')) {
    return res.status(400).json({ success: false, message: 'Request body must contain valid JSON.' });
  }
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'record';
    return res.status(409).json({ success: false, message: `A record with this ${field} already exists.` });
  }
  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors).map((item) => item.message);
    return res.status(400).json({ success: false, message: 'Validation failed.', details });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${error.path}.` });
  }

  console.error(error);
  const databaseUnavailable = error.name === 'MongoServerSelectionError' ||
    error.name === 'MongoNetworkError' || error.name === 'MongoServerError';
  return res.status(databaseUnavailable ? 503 : 500).json({
    success: false,
    message: databaseUnavailable
      ? 'Database unavailable. Check that MongoDB is running and MONGODB_URI is correct.'
      : 'An unexpected server error occurred.'
  });
}

module.exports = { notFound, errorHandler };

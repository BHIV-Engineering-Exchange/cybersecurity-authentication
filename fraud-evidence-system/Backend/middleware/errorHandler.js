// Production-ready global error handler
const auditService = require('../services/auditService');

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const globalErrorHandler = async (err, req, res, next) => {
  try {
    // Log error details
    console.error('Global Error Handler:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      userRole: req.user?.role
    });

    // Determine error type and response
    let errorResponse = {
      error: true,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    };

    // Handle different error types
    if (err.name === 'ValidationError') {
      errorResponse.code = 400;
      errorResponse.message = 'Validation Error';
      errorResponse.details = formatValidationErrors(err);
    } else if (err.name === 'CastError') {
      errorResponse.code = 400;
      errorResponse.message = 'Invalid ID format';
      errorResponse.details = { field: err.path, value: err.value };
    } else if (err.name === 'MongoError' && err.code === 11000) {
      errorResponse.code = 409;
      errorResponse.message = 'Duplicate entry';
      errorResponse.details = { field: Object.keys(err.keyPattern)[0] };
    } else if (err.name === 'JsonWebTokenError') {
      errorResponse.code = 401;
      errorResponse.message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
      errorResponse.code = 401;
      errorResponse.message = 'Token expired';
    } else if (err.name === 'MulterError') {
      errorResponse.code = 400;
      errorResponse.message = 'File upload error';
      errorResponse.details = { type: err.code, field: err.field };
    } else if (err.name === 'RateLimitError') {
      errorResponse.code = 429;
      errorResponse.message = 'Too many requests';
      errorResponse.details = { 
        limit: err.limit,
        remaining: err.remaining,
        resetTime: err.resetTime
      };
    } else if (err.status || err.statusCode) {
      errorResponse.code = err.status || err.statusCode;
      errorResponse.message = err.message || 'Request failed';
    } else {
      // Default server error
      errorResponse.code = 500;
      errorResponse.message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message;
    }

    // Add request ID for tracking
    errorResponse.requestId = req.requestId || generateRequestId();

    // Log audit event for errors
    if (req.user?.id) {
      try {
        await auditService.logEvent({
          userId: req.user.id,
          userEmail: req.user.email,
          userRole: req.user.role,
          action: 'error_occurred',
          resource: req.originalUrl,
          resourceType: 'system',
          method: req.method,
          endpoint: req.originalUrl,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          success: false,
          statusCode: errorResponse.code,
          details: {
            errorType: err.name,
            errorMessage: err.message,
            requestId: errorResponse.requestId
          },
          auditLevel: errorResponse.code >= 500 ? 'high' : 'standard'
        });
      } catch (auditError) {
        console.error('Failed to log error audit event:', auditError);
      }
    }

    // Send error response
    res.status(errorResponse.code).json(errorResponse);

  } catch (handlerError) {
    console.error('Error in global error handler:', handlerError);
    
    // Fallback error response
    res.status(500).json({
      error: true,
      code: 500,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      requestId: req.requestId || generateRequestId()
    });
  }
};

/**
 * Handle 404 errors
 */
const notFoundHandler = (req, res) => {
  const errorResponse = {
    error: true,
    code: 404,
    message: 'Resource not found',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    requestId: req.requestId || generateRequestId()
  };

  res.status(404).json(errorResponse);
};

/**
 * Handle async errors
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Format validation errors
 */
const formatValidationErrors = (err) => {
  const errors = {};
  
  for (const field in err.errors) {
    const error = err.errors[field];
    errors[field] = {
      message: error.message,
      value: error.value,
      type: error.kind
    };
  }
  
  return errors;
};

/**
 * Generate unique request ID
 */
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Request ID middleware
 */
const requestIdMiddleware = (req, res, next) => {
  req.requestId = generateRequestId();
  res.set('X-Request-ID', req.requestId);
  next();
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  
  next();
};

/**
 * API versioning middleware
 */
const apiVersioning = (req, res, next) => {
  const version = req.headers['api-version'] || 'v1';
  req.apiVersion = version;
  res.set('API-Version', version);
  next();
};

/**
 * Response time middleware
 */
const responseTime = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    res.set('X-Response-Time', `${duration}ms`);
    
    // Log slow requests
    if (duration > 5000) { // 5 seconds
      console.warn(`Slow request detected: ${req.method} ${req.originalUrl} - ${duration}ms`);
    }
  });
  
  next();
};

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  asyncErrorHandler,
  requestIdMiddleware,
  securityHeaders,
  apiVersioning,
  responseTime
};

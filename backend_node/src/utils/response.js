/**
 * Standard Response Utilities
 * Shri Ramya E-Commerce Platform
 *
 * Ensures consistent API response format across all endpoints:
 * {
 *   success: boolean,
 *   message: string,
 *   data: object | array | null,
 *   error: string | null,
 *   meta: object (optional)
 * }
 */

/**
 * Success Response
 *
 * @param {Object} res - Express response object
 * @param {any} data - Response data (null by default)
 * @param {string} message - Success message ("Success" by default)
 * @param {number} statusCode - HTTP status code (200 by default)
 * @param {Object} meta - Optional metadata (pagination, etc.)
 * @returns {Object} Express response
 *
 * @example
 * return successResponse(res, { id: 1, name: 'Product' }, 'Product retrieved', 200);
 */
const successResponse = (res, data = null, message = "Success", statusCode = 200, meta = null) => {
    const response = {
        success: true,
        message,
        data,
        error: null,
    };

    if (meta) {
        response.meta = meta;
    }

    return res.status(statusCode).json(response);
};

/**
 * Paginated Response
 *
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination info { page, limit, total, totalPages }
 * @param {string} message - Success message
 * @returns {Object} Express response
 *
 * @example
 * return paginatedResponse(res, products, { page: 1, limit: 20, total: 100, totalPages: 5 }, 'Products retrieved');
 */
const paginatedResponse = (res, data, pagination, message = "Success") => {
    return res.status(200).json({
        success: true,
        message,
        data,
        error: null,
        meta: {
            pagination: {
                page: pagination.page || 1,
                limit: pagination.limit || 20,
                total: pagination.total || 0,
                totalPages: pagination.totalPages || 0,
                hasNext: pagination.page < pagination.totalPages,
                hasPrev: pagination.page > 1,
            }
        }
    });
};

/**
 * Created Response (201)
 *
 * @param {Object} res - Express response object
 * @param {any} data - Created resource data
 * @param {string} message - Success message ("Resource created successfully" by default)
 * @returns {Object} Express response
 *
 * @example
 * return createdResponse(res, { id: 1, name: 'Product' }, 'Product created successfully');
 */
const createdResponse = (res, data, message = "Resource created successfully") => {
    return res.status(201).json({
        success: true,
        message,
        data,
        error: null,
    });
};

/**
 * No Content Response (204)
 *
 * @param {Object} res - Express response object
 * @param {string} message - Success message ("Resource deleted successfully" by default)
 * @returns {Object} Express response
 *
 * @example
 * return noContentResponse(res, 'Product deleted successfully');
 */
const noContentResponse = (res, message = "Resource deleted successfully") => {
    return res.status(204).json({
        success: true,
        message,
        data: null,
        error: null,
    });
};

/**
 * Error Response
 *
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {any} error - Error details (stack trace in development)
 * @returns {Object} Express response
 *
 * @example
 * return errorResponse(res, 'Product not found', 404);
 */
const errorResponse = (res, message, statusCode, error = null) => {
    return res.status(statusCode).json({
        success: false,
        message,
        data: null,
        error: error || message,
    });
};

/**
 * Validation Error Response (400)
 *
 * @param {Object} res - Express response object
 * @param {Array} errors - Array of validation errors
 * @param {string} message - Error message
 * @returns {Object} Express response
 *
 * @example
 * return validationErrorResponse(res, [{ field: 'email', message: 'Invalid email' }]);
 */
const validationErrorResponse = (res, errors, message = "Validation error") => {
    return res.status(400).json({
        success: false,
        message,
        data: null,
        error: {
            type: "ValidationError",
            details: errors,
        },
    });
};

/**
 * Unauthorized Response (401)
 *
 * @param {Object} res - Express response object
 * @param {string} message - Error message ("Unauthorized" by default)
 * @returns {Object} Express response
 *
 * @example
 * return unauthorizedResponse(res, 'Invalid credentials');
 */
const unauthorizedResponse = (res, message = "Unauthorized") => {
    return res.status(401).json({
        success: false,
        message,
        data: null,
        error: message,
    });
};

/**
 * Forbidden Response (403)
 *
 * @param {Object} res - Express response object
 * @param {string} message - Error message ("Access denied" by default)
 * @returns {Object} Express response
 *
 * @example
 * return forbiddenResponse(res, 'Insufficient permissions');
 */
const forbiddenResponse = (res, message = "Access denied") => {
    return res.status(403).json({
        success: false,
        message,
        data: null,
        error: message,
    });
};

/**
 * Not Found Response (404)
 *
 * @param {Object} res - Express response object
 * @param {string} message - Error message ("Resource not found" by default)
 * @returns {Object} Express response
 *
 * @example
 * return notFoundResponse(res, 'Product not found');
 */
const notFoundResponse = (res, message = "Resource not found") => {
    return res.status(404).json({
        success: false,
        message,
        data: null,
        error: message,
    });
};

/**
 * Conflict Response (409)
 *
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} Express response
 *
 * @example
 * return conflictResponse(res, 'Email already exists');
 */
const conflictResponse = (res, message = "Resource already exists") => {
    return res.status(409).json({
        success: false,
        message,
        data: null,
        error: message,
    });
};

/**
 * Too Many Requests Response (429)
 *
 * @param {Object} res - Express response object
 * @param {string} message - Error message ("Too many requests" by default)
 * @returns {Object} Express response
 *
 * @example
 * return tooManyRequestsResponse(res, 'Rate limit exceeded');
 */
const tooManyRequestsResponse = (res, message = "Too many requests") => {
    return res.status(429).json({
        success: false,
        message,
        data: null,
        error: message,
    });
};

/**
 * Internal Server Error Response (500)
 *
 * @param {Object} res - Express response object
 * @param {string} message - Error message ("Internal server error" by default)
 * @param {any} error - Error details (only in development)
 * @returns {Object} Express response
 *
 * @example
 * return internalErrorResponse(res, 'Something went wrong', error);
 */
const internalErrorResponse = (res, message = "Internal server error", error = null) => {
    return res.status(500).json({
        success: false,
        message,
        data: null,
        error: error || message,
    });
};

/**
 * Service Unavailable Response (503)
 *
 * @param {Object} res - Express response object
 * @param {string} message - Error message ("Service temporarily unavailable" by default)
 * @returns {Object} Express response
 *
 * @example
 * return serviceUnavailableResponse(res, 'Database connection failed');
 */
const serviceUnavailableResponse = (res, message = "Service temporarily unavailable") => {
    return res.status(503).json({
        success: false,
        message,
        data: null,
        error: message,
    });
};

module.exports = {
    successResponse,
    paginatedResponse,
    createdResponse,
    noContentResponse,
    errorResponse,
    validationErrorResponse,
    unauthorizedResponse,
    forbiddenResponse,
    notFoundResponse,
    conflictResponse,
    tooManyRequestsResponse,
    internalErrorResponse,
    serviceUnavailableResponse,
};


const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

/**
 * Validate Numeric ID
 * Ensures ID is a positive integer
 *
 * @param {any} id - The ID to validate
 * @param {string} paramName - Parameter name for error message (default: 'ID')
 * @returns {number} - Parsed integer ID
 * @throws {ApiError} - If ID is invalid
 *
 * @example
 * const orderId = validateId(req.params.id, 'Order');
 */
const validateId = (id, paramName = 'ID') => {
  const parsed = parseInt(id, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid ${paramName} ID. Must be a positive integer.`
    );
  }
  return parsed;
};

/**
 * Validate MongoDB ObjectId
 * Ensures ID is a valid 24-character hexadecimal string
 *
 * @param {string} id - The ID to validate
 * @param {string} paramName - Parameter name for error message (default: 'ID')
 * @returns {string} - Validated ObjectId string
 * @throws {ApiError} - If ID is invalid
 *
 * @example
 * const userId = validateObjectId(req.params.user_id, 'User');
 */
const validateObjectId = (id, paramName = 'ID') => {
  if (!id || typeof id !== 'string') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `${paramName} must be a string`
    );
  }

  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  if (!objectIdPattern.test(id)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid ${paramName} format. Must be a 24-character hexadecimal string.`
    );
  }

  return id;
};

/**
 * Validate UUID
 * Ensures ID is a valid UUID v4
 *
 * @param {string} id - The ID to validate
 * @param {string} paramName - Parameter name for error message (default: 'ID')
 * @returns {string} - Validated UUID string
 * @throws {ApiError} - If ID is invalid
 *
 * @example
 * const sessionId = validateUuid(req.params.session_id, 'Session');
 */
const validateUuid = (id, paramName = 'ID') => {
  if (!id || typeof id !== 'string') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `${paramName} must be a string`
    );
  }

  const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  if (!uuidPattern.test(id)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid ${paramName} format. Must be a valid UUID v4.`
    );
  }

  return id;
};

/**
 * Validate Slug
 * Ensures slug is URL-friendly
 *
 * @param {string} slug - The slug to validate
 * @param {string} paramName - Parameter name for error message (default: 'slug')
 * @returns {string} - Validated slug
 * @throws {ApiError} - If slug is invalid
 *
 * @example
 * const categorySlug = validateSlug(req.params.slug, 'Category');
 */
const validateSlug = (slug, paramName = 'slug') => {
  if (!slug || typeof slug !== 'string') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `${paramName} must be a string`
    );
  }

  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugPattern.test(slug)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid ${paramName} format. Must be URL-friendly (lowercase alphanumeric with hyphens).`
    );
  }

  return slug;
};

/**
 * Validate Email
 *
 * @param {string} email - The email to validate
 * @param {string} paramName - Parameter name for error message (default: 'email')
 * @returns {string} - Validated email
 * @throws {ApiError} - If email is invalid
 *
 * @example
 * const userEmail = validateEmail(req.body.email, 'Email');
 */
const validateEmail = (email, paramName = 'Email') => {
  if (!email || typeof email !== 'string') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `${paramName} must be a string`
    );
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid ${paramName} format. Must be a valid email address.`
    );
  }

  return email;
};

/**
 * Validate Phone Number (Indian format)
 *
 * @param {string} phone - The phone number to validate
 * @param {string} paramName - Parameter name for error message (default: 'phone')
 * @returns {string} - Validated phone number
 * @throws {ApiError} - If phone is invalid
 *
 * @example
 * const userPhone = validatePhone(req.body.phone, 'Phone');
 */
const validatePhone = (phone, paramName = 'phone') => {
  if (!phone || typeof phone !== 'string') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `${paramName} must be a string`
    );
  }

  // Indian phone number pattern (with or without +91)
  const phonePattern = /^(\+91[\-\s]?)?[6789]\d{9}$/;
  if (!phonePattern.test(phone.replace(/[\s-]/g, ''))) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid ${paramName} format. Must be a valid 10-digit Indian mobile number.`
    );
  }

  return phone;
};

/**
 * Validate PIN Code (Indian)
 *
 * @param {string} pincode - The PIN code to validate
 * @param {string} paramName - Parameter name for error message (default: 'pincode')
 * @returns {string} - Validated PIN code
 * @throws {ApiError} - If PIN code is invalid
 *
 * @example
 * const areaPincode = validatePincode(req.body.pincode, 'PIN code');
 */
const validatePincode = (pincode, paramName = 'pincode') => {
  if (!pincode) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `${paramName} is required`
    );
  }

  const pincodePattern = /^[1-9]\d{5}$/;
  const pincodeStr = pincode.toString();
  if (!pincodePattern.test(pincodeStr)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid ${paramName} format. Must be a valid 6-digit Indian PIN code.`
    );
  }

  return pincodeStr;
};

/**
 * Validate Pagination Parameters
 *
 * @param {Object} params - Pagination parameters object
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 20, max: 100)
 * @returns {Object} - Validated pagination parameters
 *
 * @example
 * const { page, limit } = validatePagination(req.query);
 */
const validatePagination = ({ page = 1, limit = 20 } = {}) => {
  const validatedPage = parseInt(page, 10);
  const validatedLimit = parseInt(limit, 10);

  if (Number.isNaN(validatedPage) || validatedPage < 1) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Page must be a positive integer'
    );
  }

  if (Number.isNaN(validatedLimit) || validatedLimit < 1 || validatedLimit > 100) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Limit must be between 1 and 100'
    );
  }

  return {
    page: validatedPage,
    limit: validatedLimit,
    offset: (validatedPage - 1) * validatedLimit,
  };
};

/**
 * Validate Sort Parameters
 *
 * @param {Object} params - Sort parameters object
 * @param {string} params.sortBy - Field to sort by
 * @param {string} params.order - Sort order (asc/desc)
 * @param {string[]} allowedFields - Allowed fields for sorting
 * @returns {Object} - Validated sort parameters
 *
 * @example
 * const { sortBy, order } = validateSorting(req.query, ['createdAt', 'name'], ['createdAt']);
 */
const validateSorting = ({ sortBy = 'createdAt', order = 'desc' } = {}, allowedFields = ['createdAt', 'name', 'id']) => {
  const validatedSortBy = sortBy || 'createdAt';
  const validatedOrder = (order || 'desc').toLowerCase();

  if (!allowedFields.includes(validatedSortBy)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Invalid sort field. Allowed fields: ${allowedFields.join(', ')}`
    );
  }

  if (!['asc', 'desc'].includes(validatedOrder)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Sort order must be either "asc" or "desc"'
    );
  }

  return {
    sortBy: validatedSortBy,
    order: validatedOrder,
  };
};

module.exports = {
  validateId,
  validateObjectId,
  validateUuid,
  validateSlug,
  validateEmail,
  validatePhone,
  validatePincode,
  validatePagination,
  validateSorting,
};

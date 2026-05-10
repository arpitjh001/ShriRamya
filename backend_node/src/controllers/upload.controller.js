/**
 * Upload Controller (Enhanced)
 * Handles image uploads with optimization
 */

const imageService = require('../services/images/imageOptimization.service');
const { successResponse } = require('../utils/response');
const httpStatus = require('http-status');
const config = require('../config/config');

const rewriteOrigin = (value, fromOrigin, toOrigin) => {
  if (typeof value === 'string') {
    return value.startsWith(fromOrigin) ? `${toOrigin}${value.slice(fromOrigin.length)}` : value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => rewriteOrigin(entry, fromOrigin, toOrigin));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, rewriteOrigin(entry, fromOrigin, toOrigin)])
    );
  }

  return value;
};

const normalizeUploadUrls = (result, req) => {
  if (!result || config.cdnBaseUrl) {
    return result;
  }

  const requestOrigin = `${req.protocol}://${req.get('host')}`;

  let configuredOrigin = null;
  try {
    configuredOrigin = new URL(config.publicBaseUrl).origin;
  } catch (error) {
    configuredOrigin = null;
  }

  if (!configuredOrigin || configuredOrigin === requestOrigin) {
    return result;
  }

  return rewriteOrigin(result, configuredOrigin, requestOrigin);
};

/**
 * Upload single image with optimization
 * POST /api/v1/upload/image
 */
const uploadImage = async (req, res, next) => {
  try {
    // Handle both 'file' and 'image' field names from multer.fields()
    const file = req.files?.file?.[0] || req.files?.image?.[0] || req.file;
    
    if (!file) {
      const error = new Error('No file uploaded');
      error.statusCode = httpStatus.BAD_REQUEST;
      throw error;
    }

    // Extract options from body
    const category = req.body.category || 'products';
    const originalOnly = req.body.originalOnly === 'true';

    console.log(`[UploadController] Processing upload: ${file.originalname}, category=${category}, originalOnly=${originalOnly}`);

    const result = normalizeUploadUrls(await imageService.processImage(file, category, { originalOnly }), req);

    return successResponse(res, result, 'Image uploaded and optimized successfully', httpStatus.CREATED);
  } catch (error) {
    console.error('[UploadController] Image upload failed:', error.message);
    next(error);
  }
};

/**
 * Upload multiple images
 * POST /api/v1/upload/images
 */
const uploadMultipleImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      const error = new Error('No files uploaded');
      error.statusCode = httpStatus.BAD_REQUEST;
      throw error;
    }

    const category = req.body.category || 'products';
    const originalOnly = req.body.originalOnly === 'true';

    console.log(`[UploadController] Processing multiple uploads: ${req.files.length} files, category=${category}, originalOnly=${originalOnly}`);

    const results = normalizeUploadUrls(await imageService.processMultipleImages(req.files, category, { originalOnly }), req);

    return successResponse(res, results, 'Images uploaded and optimized successfully', httpStatus.CREATED);
  } catch (error) {
    console.error('[UploadController] Multiple image upload failed:', error.message);
    next(error);
  }
};

/**
 * Delete image
 * DELETE /api/v1/upload/image/:imageUrl
 */
const deleteImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.params;
    await imageService.deleteImage(imageUrl);
    return successResponse(res, { deleted: true }, 'Image deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get CDN URL for image
 * GET /api/v1/upload/cdn-url/:filename
 */
const getCdnUrl = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const { size = 'medium' } = req.query;
    
    const cdnUrl = imageService.getCdnUrl(filename, size);
    return successResponse(res, { url: cdnUrl, size });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate placeholder image
 * POST /api/v1/upload/placeholder
 */
const generatePlaceholder = async (req, res, next) => {
  try {
    const { width = 800, height = 800, text } = req.query;
    const result = await imageService.generatePlaceholder(
      parseInt(width),
      parseInt(height),
      text
    );
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  getCdnUrl,
  generatePlaceholder
};

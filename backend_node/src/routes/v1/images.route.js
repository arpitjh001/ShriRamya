const express = require('express');
const httpStatus = require('http-status');
const Image = require('../../models/images.model');

const router = express.Router();

const KNOWN_IMAGE_EXT_RE = /\.(webp|jpe?g|png|gif)$/i;
const ALLOWED_SIZES = new Set(['thumbnail', 'medium', 'large', 'original']);

/**
 * GET /api/v1/images/:imageId/:sizeName
 *
 * Public endpoint: serves optimized images stored in MongoDB (serverless-safe).
 * We accept optional extensions (e.g. `thumbnail.webp`) for backward compatibility.
 */
router.get('/:imageId/:sizeName', async (req, res, next) => {
  try {
    const { imageId } = req.params;
    const rawSizeName = req.params.sizeName;

    const sizeName = String(rawSizeName || '').replace(KNOWN_IMAGE_EXT_RE, '');
    if (!imageId || !sizeName) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Missing imageId or sizeName',
      });
    }

    if (!ALLOWED_SIZES.has(sizeName)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: `Invalid sizeName. Allowed: ${Array.from(ALLOWED_SIZES).join(', ')}`,
      });
    }

    const imageDoc = await Image.findOne({ imageId });
    if (!imageDoc) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Image not found',
      });
    }

    const base64Data = imageDoc?.images?.[sizeName];
    if (!base64Data) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Image not found',
      });
    }

    const imageBuffer = Buffer.from(base64Data, 'base64');
    const format = imageDoc?.metadata?.format || 'webp';
    const contentType = format === 'webp' ? 'image/webp' : `image/${format}`;

    // Cache for 30 days (safe because imageId is immutable and content-addressed in DB).
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=2592000',
      'Content-Length': imageBuffer.length,
    });

    return res.send(imageBuffer);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;


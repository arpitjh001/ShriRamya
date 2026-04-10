const express = require('express');
const multer = require('multer');
const path = require('path');
const { auth, requireRole } = require('../../middlewares/authRBAC');
const uploadController = require('../../controllers/upload.controller');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');
const Image = require('../../models/images.model');

// IMPORTANT:
// The upload controller runs image optimization via Sharp and expects `file.buffer`.
// That only exists when using `multer.memoryStorage()`.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {  
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new ApiError(httpStatus.BAD_REQUEST, 'Invalid file type. Only JPG, PNG, GIF, and WEBP are allowed.'));
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: fileFilter,
});

const router = express.Router();

// Accept both 'file' and 'image' field names for compatibility
router.post('/image', auth, requireRole('Admin', 'Editor'), upload.fields([{ name: 'file', maxCount: 1 }, { name: 'image', maxCount: 1 }]), uploadController.uploadImage);
router.post('/images', auth, requireRole('Admin', 'Editor'), upload.array('files', 10), uploadController.uploadMultipleImages);

/**
 * GET /api/v1/images/:imageId/:sizeName
 * Retrieve image from MongoDB (for Vercel/serverless environments)
 * Public endpoint - no auth required
 */
router.get('/:imageId/:sizeName', async (req, res, next) => {
    try {
        const { imageId, sizeName } = req.params;
        
        // Validate parameters
        if (!imageId || !sizeName) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Missing imageId or sizeName'
            });
        }
        
        // Find image in database
        const imageDoc = await Image.findOne({ imageId });
        
        if (!imageDoc || !imageDoc.images[sizeName]) {
            return res.status(httpStatus.NOT_FOUND).json({
                success: false,
                message: 'Image not found'
            });
        }
        
        // Convert base64 to buffer
        const imageBuffer = Buffer.from(imageDoc.images[sizeName], 'base64');
        
        // Determine content type based on format
        const contentType = imageDoc.metadata.format === 'webp' ? 'image/webp' : `image/${imageDoc.metadata.format}`;
        
        // Set cache headers (cache for 30 days)
        res.set({
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=2592000',
            'Content-Length': imageBuffer.length
        });
        
        // Send image
        res.send(imageBuffer);
    } catch (error) {
        console.error('[ImageRoute] Error retrieving image:', error.message);
        next(error);
    }
});

module.exports = router;


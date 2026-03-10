const express = require('express');
const multer = require('multer');
const path = require('path');
const auth = require('../../middlewares/auth');
const uploadController = require('../../controllers/upload.controller');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');

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
router.post('/image', auth(['admin']), upload.fields([{ name: 'file', maxCount: 1 }, { name: 'image', maxCount: 1 }]), uploadController.uploadImage);
router.post('/images', auth(['admin']), upload.array('files', 10), uploadController.uploadMultipleImages);

module.exports = router;


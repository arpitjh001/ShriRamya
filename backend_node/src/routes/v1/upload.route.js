const express = require('express');
const multer = require('multer');
const path = require('path');
const uuid = require('uuid');
const auth = require('../../middlewares/auth');
const uploadController = require('../../controllers/upload.controller');
const ApiError = require('../../utils/ApiError');
const httpStatus = require('http-status');

const uploadDir = path.join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuid.v4()}${ext}`);
    },
});

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

router.post('/', auth(['admin']), upload.single('file'), uploadController.uploadFile);

module.exports = router;


const path = require('path');
const uuid = require('uuid');
const fs = require('fs');
const httpStatus = require('http-status');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const uploadFile = async (req, res, next) => {
    try {
        if (!req.file) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Please upload a file');
        }

        const file = req.file;
        const baseUrl = config.publicBaseUrl || 'http://localhost:8000';
        const fileUrl = `${baseUrl.replace(/\/$/, '')}/uploads/${file.filename}`;

        res.status(httpStatus.CREATED).send({
            success: true,
            message: 'File uploaded successfully',
            url: fileUrl,
            filename: file.filename,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    uploadFile,
};

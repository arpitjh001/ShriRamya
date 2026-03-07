/**
 * Image Optimization Service
 * Handles image upload, resize, thumbnail generation, and compression
 * Uses Sharp for image processing
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const config = require('../../config/config');

// Image sizes configuration
const IMAGE_SIZES = {
  thumbnail: { width: 300, height: 300, suffix: '_thumb' },
  medium: { width: 800, height: 800, suffix: '_med' },
  large: { width: 1600, height: 1600, suffix: '_lg' },
  original: { width: null, height: null, suffix: '_orig' }
};

// Quality settings
const QUALITY_SETTINGS = {
  thumbnail: 70,
  medium: 80,
  large: 85,
  original: 90
};

class ImageOptimizationService {
  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'images');
    this.cdnBaseUrl = config.cdnBaseUrl || config.publicBaseUrl || 'http://localhost:8000';
    
    // Ensure upload directory exists
    this._ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   */
  async _ensureUploadDirectory() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error.message);
    }
  }

  /**
   * Process uploaded image
   * @param {Object} file - Multer file object
   * @param {String} category - Image category (products, banners, etc.)
   * @returns {Object} Processed image URLs
   */
  async processImage(file, category = 'products') {
    const imageId = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = `${category}_${imageId}`;

    // Validate file type
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    if (!allowedTypes.includes(ext)) {
      throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }

    // Convert to WebP for better compression (except for GIF)
    const outputFormat = ext === '.gif' ? 'gif' : 'webp';
    const outputExt = outputFormat === 'gif' ? '.gif' : '.webp';

    const results = {};

    // Process each size
    for (const [sizeName, sizeConfig] of Object.entries(IMAGE_SIZES)) {
      if (sizeName === 'original') {
        // Store original
        const originalPath = path.join(this.uploadDir, `${baseName}_orig${outputExt}`);
        await this._processAndSaveImage(file.buffer, originalPath, null, null, QUALITY_SETTINGS.original, outputFormat);
        results.original = this._generateUrl(`${baseName}_orig${outputExt}`);
      } else {
        // Generate resized versions
        const sizedPath = path.join(this.uploadDir, `${baseName}${sizeConfig.suffix}${outputExt}`);
        await this._processAndSaveImage(
          file.buffer,
          sizedPath,
          sizeConfig.width,
          sizeConfig.height,
          QUALITY_SETTINGS[sizeName],
          outputFormat
        );
        results[sizeName] = this._generateUrl(`${baseName}${sizeConfig.suffix}${outputExt}`);
      }
    }

    // Generate CDN URLs
    results.cdn = {
      thumbnail: this._generateCdnUrl(`${baseName}${IMAGE_SIZES.thumbnail.suffix}${outputExt}`),
      medium: this._generateCdnUrl(`${baseName}${IMAGE_SIZES.medium.suffix}${outputExt}`),
      large: this._generateCdnUrl(`${baseName}${IMAGE_SIZES.large.suffix}${outputExt}`),
      original: this._generateCdnUrl(`${baseName}_orig${outputExt}`)
    };

    // Store metadata
    results.metadata = {
      imageId,
      category,
      originalName: file.originalname,
      format: outputFormat,
      sizes: Object.keys(IMAGE_SIZES),
      uploadedAt: new Date().toISOString()
    };

    return results;
  }

  /**
   * Process and save image
   */
  async _processAndSaveImage(buffer, outputPath, width, height, quality, format) {
    let pipeline = sharp(buffer);

    // Get metadata
    const metadata = await pipeline.metadata();

    // Resize if dimensions specified
    if (width && height) {
      pipeline = pipeline.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert format and compress
    if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    } else if (format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality });
    } else if (format === 'png') {
      pipeline = pipeline.png({ quality: Math.floor(quality / 10) });
    }
    // GIF stays as is

    // Save the processed image
    await pipeline.toFile(outputPath);
  }

  /**
   * Generate local URL
   */
  _generateUrl(filename) {
    return `${this.cdnBaseUrl}/uploads/images/${filename}`;
  }

  /**
   * Generate CDN URL
   */
  _generateCdnUrl(filename) {
    // If CDN is configured, use CDN URL
    if (config.cdnBaseUrl && config.cdnBaseUrl !== this.cdnBaseUrl) {
      return `${config.cdnBaseUrl}/uploads/images/${filename}`;
    }
    return this._generateUrl(filename);
  }

  /**
   * Process multiple images
   */
  async processMultipleImages(files, category = 'products') {
    if (!Array.isArray(files)) {
      files = [files];
    }

    const results = [];
    for (const file of files) {
      try {
        const result = await this.processImage(file, category);
        results.push(result);
      } catch (error) {
        console.error(`Error processing image ${file.originalname}:`, error.message);
        results.push({
          error: error.message,
          originalName: file.originalname
        });
      }
    }

    return results;
  }

  /**
   * Delete image and all its sizes
   */
  async deleteImage(imageUrl) {
    try {
      // Extract filename from URL
      const filename = imageUrl.split('/').pop();
      const baseName = filename.replace(/\.(webp|jpg|jpeg|png|gif)$/, '');
      
      // Delete all size variants
      for (const sizeConfig of Object.values(IMAGE_SIZES)) {
        const pattern = sizeConfig.suffix === '_orig' 
          ? `${baseName}_orig`
          : `${baseName}${sizeConfig.suffix}`;
        
        const files = await this._findFilesByPattern(pattern);
        for (const filePath of files) {
          await fs.unlink(filePath);
        }
      }

      return { success: true, deleted: imageUrl };
    } catch (error) {
      console.error('Error deleting image:', error.message);
      throw error;
    }
  }

  /**
   * Find files matching pattern
   */
  async _findFilesByPattern(pattern) {
    const files = await fs.readdir(this.uploadDir);
    return files
      .filter(f => f.startsWith(pattern))
      .map(f => path.join(this.uploadDir, f));
  }

  /**
   * Get image metadata
   */
  async getImageMetadata(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: metadata.size,
        space: metadata.space
      };
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error.message}`);
    }
  }

  /**
   * Optimize existing image (without upload)
   */
  async optimizeImage(inputPath, outputPath, options = {}) {
    const {
      width = null,
      height = null,
      quality = 80,
      format = 'webp'
    } = options;

    let pipeline = sharp(inputPath);

    if (width && height) {
      pipeline = pipeline.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    } else if (format === 'jpeg') {
      pipeline = pipeline.jpeg({ quality });
    }

    await pipeline.toFile(outputPath);

    return {
      inputPath,
      outputPath,
      format,
      quality
    };
  }

  /**
   * Generate placeholder image
   */
  async generatePlaceholder(width = 800, height = 800, text = 'No Image') {
    const imageId = uuidv4();
    const filename = `placeholder_${imageId}.webp`;
    const outputPath = path.join(this.uploadDir, filename);

    // Create placeholder with sharp
    await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 240, g: 240, b: 240 }
      }
    })
    .jpeg({ quality: 80 })
    .toFile(outputPath);

    return {
      url: this._generateUrl(filename),
      cdnUrl: this._generateCdnUrl(filename),
      width,
      height
    };
  }

  /**
   * Get CDN URL for image
   */
  getCdnUrl(filename, size = 'medium') {
    const sizeConfig = IMAGE_SIZES[size];
    
    if (!sizeConfig) {
      throw new Error(`Invalid size: ${size}. Available: ${Object.keys(IMAGE_SIZES).join(', ')}`);
    }

    // Determine the sized filename
    let sizedFilename;
    if (size === 'original') {
      sizedFilename = filename.replace(/\.(webp|jpg|jpeg|png|gif)$/, '_orig.$1');
    } else {
      sizedFilename = filename.replace(/\.(webp|jpg|jpeg|png|gif)$/, `${sizeConfig.suffix}.$1`);
    }

    return this._generateCdnUrl(sizedFilename);
  }
}

// Export singleton instance
module.exports = new ImageOptimizationService();

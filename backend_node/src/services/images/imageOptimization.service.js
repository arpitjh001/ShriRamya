/**
 * Image Optimization Service
 * Handles image upload, resize, thumbnail generation, and compression
 * Uses Sharp for image processing
 * 
 * NOTE: In Vercel/serverless environments, images are stored in MongoDB for persistence.
 *       For local development, images are saved to /uploads/images directory.
 *       For production, configure AWS S3 or CDN_BASE_URL environment variable.
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const config = require('../../config/config');
const Image = require('../../models/images.model');

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
    // Check if running in Vercel (serverless environment)
    this.isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV;
    
    // Use /tmp for Vercel (temporary), or uploads/images for local development
    if (this.isVercel) {
      this.uploadDir = '/tmp/uploads/images';
      this.useDatabase = true;
      console.log('[ImageService] Running in Vercel environment, using MongoDB for image storage');
    } else {
      this.uploadDir = path.join(process.cwd(), 'uploads', 'images');
      this.useDatabase = false;
    }
    
    this.cdnBaseUrl = config.cdnBaseUrl || config.publicBaseUrl || 'http://localhost:8000';
    
    // Ensure upload directory exists (for local development)
    this._ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   */
  async _ensureUploadDirectory() {
    if (this.isVercel) return; // Skip for serverless
    
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('[ImageService] Error creating upload directory:', error.message);
      // Don't throw - continue anyway; writes may still work
    }
  }

  /**
   * Process uploaded image and store (either filesystem or database)
   * @param {Object} file - Multer file object
   * @param {String} category - Image category (products, banners, etc.)
   * @returns {Object} Processed image URLs and metadata
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
    const processedImages = {}; // Store processed image buffers for database storage

    // Process each size
    for (const [sizeName, sizeConfig] of Object.entries(IMAGE_SIZES)) {
      if (sizeName === 'original') {
        // Store original
        const originalPath = path.join(this.uploadDir, `${baseName}_orig${outputExt}`);
        const originalBuffer = await this._processImage(file.buffer, null, null, QUALITY_SETTINGS.original, outputFormat);
        processedImages.original = originalBuffer;
        await this._saveImage(originalPath, originalBuffer);
        results.original = this._generateUrl(imageId, 'original', outputExt);
      } else {
        // Generate resized versions
        const sizedPath = path.join(this.uploadDir, `${baseName}${sizeConfig.suffix}${outputExt}`);
        const sizedBuffer = await this._processImage(file.buffer, sizeConfig.width, sizeConfig.height, QUALITY_SETTINGS[sizeName], outputFormat);
        processedImages[sizeName] = sizedBuffer;
        await this._saveImage(sizedPath, sizedBuffer);
        results[sizeName] = this._generateUrl(imageId, sizeName, outputExt);
      }
    }

    // If using database storage, save to MongoDB
    if (this.useDatabase && Image) {
      try {
        const imageDoc = new Image({
          imageId,
          category,
          originalName: file.originalname,
          images: {
            thumbnail: processedImages.thumbnail?.toString('base64') || null,
            medium: processedImages.medium?.toString('base64') || null,
            large: processedImages.large?.toString('base64') || null,
            original: processedImages.original?.toString('base64') || null
          },
          urls: results,
          metadata: {
            format: outputFormat,
            sizes: Object.keys(IMAGE_SIZES),
            fileSize: file.size
          }
        });
        await imageDoc.save();
        console.log(`[ImageService] Image metadata saved to MongoDB: ${imageId}`);
      } catch (dbError) {
        console.warn('[ImageService] Warning: Could not save image metadata to MongoDB:', dbError.message);
        // Continue anyway - image processing succeeded
      }
    }

    // Generate CDN URLs
    results.cdn = {
      thumbnail: this._generateCdnUrl(imageId, 'thumbnail', outputExt),
      medium: this._generateCdnUrl(imageId, 'medium', outputExt),
      large: this._generateCdnUrl(imageId, 'large', outputExt),
      original: this._generateCdnUrl(imageId, 'original', outputExt)
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
   * Process image buffer and return processed buffer
   */
  async _processImage(buffer, width, height, quality, format) {
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

    // Return processed buffer
    return await pipeline.toBuffer();
  }

  /**
   * Save image buffer to filesystem
   * Handles errors gracefully in serverless environments
   */
  async _saveImage(outputPath, imageBuffer) {
    if (this.isVercel) {
      // Skip filesystem write in serverless - images are in MongoDB
      return;
    }

    try {
      await fs.writeFile(outputPath, imageBuffer);
      console.log(`[ImageService] Image saved to ${outputPath}`);
    } catch (error) {
      console.warn(`[ImageService] Warning: Could not save image to ${outputPath}:`, error.message);
      // Don't throw - image processing succeeded, just storage failed
    }
  }

  /**
   * Generate local URL
   */
  _generateUrl(imageId, sizeName, ext) {
    return `${this.cdnBaseUrl}/api/v1/images/${imageId}/${sizeName}${ext}`;
  }

  /**
   * Generate CDN URL
   */
  _generateCdnUrl(imageId, sizeName, ext) {
    // If CDN is configured, use CDN URL
    if (config.cdnBaseUrl && config.cdnBaseUrl !== this.cdnBaseUrl) {
      return `${config.cdnBaseUrl}/api/v1/images/${imageId}/${sizeName}${ext}`;
    }
    return this._generateUrl(imageId, sizeName, ext);
  }

  /**
   * Get image by ID and size (from database or filesystem)
   */
  async getImage(imageId, sizeName = 'original') {
    if (this.useDatabase && Image) {
      try {
        const imageDoc = await Image.findOne({ imageId });
        if (!imageDoc) {
          return null;
        }
        
        const base64Data = imageDoc.images[sizeName];
        if (!base64Data) {
          return null;
        }
        
        return Buffer.from(base64Data, 'base64');
      } catch (error) {
        console.error('[ImageService] Error retrieving image from database:', error.message);
        return null;
      }
    }
    
    // Fallback to filesystem
    return null;
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

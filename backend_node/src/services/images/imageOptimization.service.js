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

const sanitizePathSegment = (value, fallback) => {
  const normalized = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || fallback;
};

const assertSafeFilename = (filename) => {
  const base = path.basename(String(filename || ''));
  if (!base || base !== filename || base.includes('..')) {
    throw new Error('Invalid filename');
  }
  return base;
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
    
    this.publicBaseUrl = config.publicBaseUrl || 'http://localhost:8000';
    this.cdnBaseUrl = config.cdnBaseUrl || this.publicBaseUrl;
    
    // Ensure upload directory exists (for local development)
    this._ensureUploadDirectory();
  }

  _joinUrl(base, pathname) {
    const safeBase = String(base || '').replace(/\/+$/, '');
    const safePath = String(pathname || '').replace(/^\/+/, '');
    return `${safeBase}/${safePath}`;
  }

  _generateApiUrl(base, imageId, sizeName, ext) {
    return this._joinUrl(base, `/api/v1/images/${imageId}/${sizeName}${ext || ''}`);
  }

  _generateStaticUploadUrl(base, filename) {
    return this._joinUrl(base, `/uploads/images/${assertSafeFilename(filename)}`);
  }

  _resolveUploadPath(filename) {
    const safeFilename = assertSafeFilename(filename);
    const baseDir = path.resolve(this.uploadDir);
    const targetPath = path.resolve(baseDir, safeFilename);

    if (targetPath !== baseDir && !targetPath.startsWith(`${baseDir}${path.sep}`)) {
      throw new Error('Invalid upload path');
    }

    return targetPath;
  }

  _resolveExistingUploadPath(filePath, label = 'path') {
    const rawPath = String(filePath || '');
    const baseDir = path.resolve(this.uploadDir);
    const targetPath = path.isAbsolute(rawPath) || /[\\/]/.test(rawPath)
      ? path.resolve(rawPath)
      : this._resolveUploadPath(rawPath);

    if (targetPath !== baseDir && !targetPath.startsWith(`${baseDir}${path.sep}`)) {
      throw new Error(`Invalid ${label}`);
    }

    return targetPath;
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
    const safeCategory = sanitizePathSegment(category, 'products');
    const baseName = `${safeCategory}_${imageId}`;


    // Validate file type
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    if (!allowedTypes.includes(ext)) {
      throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }

    // Convert to WebP for better compression (except for GIF)
    // For original size, we might want to preserve the original format if it's already a good web format
    const isWebFriendly = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    const outputFormat = ext === '.gif' ? 'gif' : 'webp';
    const outputExt = outputFormat === 'gif' ? '.gif' : '.webp';

    const results = {};
    const processedImages = {}; // Store processed image buffers for database storage

    // Process each size
    for (const [sizeName, sizeConfig] of Object.entries(IMAGE_SIZES)) {
      if (sizeName === 'original') {
        // Store original
        // Use original format if requested/appropriate
        const actualFormat = isWebFriendly ? ext.slice(1) : outputFormat;
        const actualExt = isWebFriendly ? ext : outputExt;
        
        const filename = `${baseName}_orig${actualExt}`;
        const originalPath = this._resolveUploadPath(filename);
        const originalBuffer = await this._processImage(file.buffer, null, null, QUALITY_SETTINGS.original, actualFormat);
        processedImages.original = originalBuffer;
        await this._saveImage(originalPath, originalBuffer);

        results.original = this.useDatabase
          ? this._generateApiUrl(this.publicBaseUrl, imageId, 'original', actualExt)
          : this._generateStaticUploadUrl(this.publicBaseUrl, filename);
      } else {
        // Generate resized versions
        const filename = `${baseName}${sizeConfig.suffix}${outputExt}`;
        const sizedPath = this._resolveUploadPath(filename);
        const sizedBuffer = await this._processImage(file.buffer, sizeConfig.width, sizeConfig.height, QUALITY_SETTINGS[sizeName], outputFormat);
        processedImages[sizeName] = sizedBuffer;
        await this._saveImage(sizedPath, sizedBuffer);

        results[sizeName] = this.useDatabase
          ? this._generateApiUrl(this.publicBaseUrl, imageId, sizeName, outputExt)
          : this._generateStaticUploadUrl(this.publicBaseUrl, filename);
      }
    }

    // If using database storage, save to MongoDB
    if (this.useDatabase && Image) {
      try {
        const imageDoc = new Image({
          imageId,
          category: safeCategory,
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
    // We need to define actualExt and outputExt properly for the CDN block
    const actualExt = isWebFriendly ? ext : outputExt;

    results.cdn = this.useDatabase
      ? {
          thumbnail: this._generateApiUrl(this.cdnBaseUrl, imageId, 'thumbnail', outputExt),
          medium: this._generateApiUrl(this.cdnBaseUrl, imageId, 'medium', outputExt),
          large: this._generateApiUrl(this.cdnBaseUrl, imageId, 'large', outputExt),
          original: this._generateApiUrl(this.cdnBaseUrl, imageId, 'original', actualExt),
        }
      : {
          thumbnail: results.thumbnail,
          medium: results.medium,
          large: results.large,
          original: results.original,
        };

    // Store metadata
    results.metadata = {
      imageId,
      category: safeCategory,
      originalName: file.originalname,
      format: outputFormat,
      sizes: Object.keys(IMAGE_SIZES),
      uploadedAt: new Date().toISOString()
    };

    return results;
  }


  /**
   * Process image buffer and return processed buffer
   * Includes auto-rotation and metadata preservation
   */
  async _processImage(buffer, width, height, quality, format) {
    let pipeline = sharp(buffer);

    // Auto-rotate based on EXIF orientation metadata
    pipeline = pipeline.rotate();

    // Preserve metadata (including color profiles, etc.)
    pipeline = pipeline.withMetadata();

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
    } else if (format === 'jpeg' || format === 'jpg') {
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


  // Note: URL generation is handled by `_generateApiUrl` / `_generateStaticUploadUrl`.
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
      const filename = assertSafeFilename(String(imageUrl || '').split('/').pop());
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
    const safePattern = sanitizePathSegment(pattern, '');
    if (!safePattern) return [];

    const files = await fs.readdir(this.uploadDir);
    return files
      .filter(f => f.startsWith(safePattern))
      .map(f => this._resolveUploadPath(f));
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

    const safeInputPath = this._resolveExistingUploadPath(inputPath, 'input path');
    const safeOutputPath = this._resolveExistingUploadPath(outputPath, 'output path');

    let pipeline = sharp(safeInputPath);

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

    await pipeline.toFile(safeOutputPath);

    return {
      inputPath: safeInputPath,
      outputPath: safeOutputPath,
      format,
      quality
    };
  }

  /**
   * Generate placeholder image
   */
  async generatePlaceholder(width = 800, height = 800, text = 'No Image') {
    const imageId = uuidv4();

    // Basic solid placeholder. (We ignore `text` for now to keep sharp usage simple.)
    const placeholderBuffer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 240, g: 240, b: 240 },
      },
    })
      .webp({ quality: 80 })
      .toBuffer();

    if (this.useDatabase && Image) {
      try {
        const imageDoc = new Image({
          imageId,
          category: 'other',
          originalName: 'placeholder.webp',
          images: {
            thumbnail: placeholderBuffer.toString('base64'),
            medium: placeholderBuffer.toString('base64'),
            large: placeholderBuffer.toString('base64'),
            original: placeholderBuffer.toString('base64'),
          },
          urls: {
            thumbnail: this._generateApiUrl(this.publicBaseUrl, imageId, 'thumbnail', ''),
            medium: this._generateApiUrl(this.publicBaseUrl, imageId, 'medium', ''),
            large: this._generateApiUrl(this.publicBaseUrl, imageId, 'large', ''),
            original: this._generateApiUrl(this.publicBaseUrl, imageId, 'original', ''),
          },
          metadata: {
            format: 'webp',
            sizes: Object.keys(IMAGE_SIZES),
            width,
            height,
            fileSize: placeholderBuffer.length,
          },
        });
        await imageDoc.save();
      } catch (dbError) {
        console.warn('[ImageService] Warning: Could not save placeholder to MongoDB:', dbError.message);
      }

      return {
        imageId,
        url: this._generateApiUrl(this.publicBaseUrl, imageId, 'original', ''),
        cdnUrl: this._generateApiUrl(this.cdnBaseUrl, imageId, 'original', ''),
        width,
        height,
      };
    }

    // Local filesystem fallback
    const filename = `placeholder_${imageId}.webp`;
    const outputPath = this._resolveUploadPath(filename);
    try {
      await fs.writeFile(outputPath, placeholderBuffer);
    } catch (error) {
      console.warn('[ImageService] Warning: Could not write placeholder:', error.message);
    }

    return {
      imageId,
      url: this._generateStaticUploadUrl(this.publicBaseUrl, filename),
      cdnUrl: this._generateStaticUploadUrl(this.cdnBaseUrl, filename),
      width,
      height,
    };
  }

  /**
   * Get CDN URL for image
   */
  getCdnUrl(filename, size = 'medium') {
    filename = assertSafeFilename(filename);
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

    if (this.useDatabase) {
      // Try to extract the UUID imageId from the legacy filename pattern.
      const match = String(filename || '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      const imageId = match?.[0] || null;
      if (!imageId) {
        throw new Error('Could not derive imageId from filename in serverless mode');
      }

      // Omit extensions so the /images route can serve the correct format.
      return this._generateApiUrl(this.cdnBaseUrl, imageId, size, '');
    }

    return this._generateStaticUploadUrl(this.cdnBaseUrl, sizedFilename);
  }
}

// Export singleton instance
module.exports = new ImageOptimizationService();

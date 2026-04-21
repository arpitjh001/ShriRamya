#!/usr/bin/env node

/**
 * Image Optimization Script
 * Phase 3: Performance Optimization
 * 
 * Compresses images and converts to WebP format
 * Targets: /uploads and /frontend/assets
 * 
 * Usage: node scripts/optimize-images.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const FRONTEND_ASSETS_DIR = path.join(__dirname, '..', 'frontend', 'src', 'assets');
const QUALITY = 75; // WebP quality (0-100)
const MAX_WIDTH = 1920; // Max width for large images
const MAX_HEIGHT = 1920; // Max height for large images

// Check if sharp is installed
function checkSharp() {
    try {
        require.resolve('sharp');
        return true;
    } catch (e) {
        console.log('Sharp not installed. Installing...');
        execSync('npm install sharp --save-dev', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        return true;
    }
}

// Get all image files recursively
function getImageFiles(dir, extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']) {
    const files = [];
    
    if (!fs.existsSync(dir)) {
        console.log(`Directory not found: ${dir}`);
        return files;
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            // Skip node_modules and other non-image directories
            if (entry.name === 'node_modules' || entry.name === '.git') continue;
            files.push(...getImageFiles(fullPath, extensions));
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (extensions.includes(ext)) {
                files.push(fullPath);
            }
        }
    }
    
    return files;
}

// Optimize a single image using sharp
async function optimizeImage(inputPath, outputDir, options = {}) {
    const sharp = require('sharp');
    const filename = path.basename(inputPath);
    const nameWithoutExt = path.stem || filename.split('.').slice(0, -1).join('.');
    const outputPath = path.join(outputDir, `${nameWithoutExt}.webp`);
    
    try {
        const metadata = await sharp(inputPath).metadata();
        const originalSize = fs.statSync(inputPath).size;
        
        let transformer = sharp(inputPath);
        
        // Resize if image is too large
        if (metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT) {
            transformer = transformer.resize({
                width: MAX_WIDTH,
                height: MAX_HEIGHT,
                fit: 'inside',
                withoutEnlargement: true
            });
        }
        
        // Convert to WebP with quality setting
        transformer = transformer.webp({ 
            quality: QUALITY,
            effort: 6 // Higher effort = better compression (0-6)
        });
        
        await transformer.toFile(outputPath);
        
        const newSize = fs.statSync(outputPath).size;
        const savings = ((originalSize - newSize) / originalSize * 100).toFixed(2);
        
        return {
            input: inputPath,
            output: outputPath,
            originalSize,
            newSize,
            savings: `${savings}%`
        };
    } catch (error) {
        console.error(`Error processing ${inputPath}:`, error.message);
        return null;
    }
}

// Main optimization function
async function optimizeImages() {
    console.log('🚀 Starting Image Optimization...\n');
    
    // Check for sharp
    checkSharp();
    
    const results = {
        processed: 0,
        totalOriginalSize: 0,
        totalNewSize: 0,
        errors: []
    };
    
    // Process uploads directory
    console.log('📁 Processing uploads directory...');
    const uploadImages = getImageFiles(UPLOADS_DIR);
    console.log(`   Found ${uploadImages.length} images in uploads\n`);
    
    for (const imagePath of uploadImages) {
        // Skip already optimized WebP files that are small
        if (imagePath.endsWith('.webp')) {
            const stats = fs.statSync(imagePath);
            if (stats.size < 100 * 1024) { // Skip if already small
                continue;
            }
        }
        
        const dir = path.dirname(imagePath);
        const result = await optimizeImage(imagePath, dir);
        
        if (result) {
            results.processed++;
            results.totalOriginalSize += result.originalSize;
            results.totalNewSize += result.newSize;
            console.log(`   ✓ ${path.basename(imagePath)} → ${path.basename(result.output)} (${result.savings} saved)`);
        } else {
            results.errors.push(imagePath);
        }
    }
    
    // Process frontend assets directory
    if (fs.existsSync(FRONTEND_ASSETS_DIR)) {
        console.log('\n📁 Processing frontend assets directory...');
        const assetImages = getImageFiles(FRONTEND_ASSETS_DIR);
        console.log(`   Found ${assetImages.length} images in frontend assets\n`);
        
        for (const imagePath of assetImages) {
            const dir = path.dirname(imagePath);
            const result = await optimizeImage(imagePath, dir);
            
            if (result) {
                results.processed++;
                results.totalOriginalSize += result.originalSize;
                results.totalNewSize += result.newSize;
                console.log(`   ✓ ${path.basename(imagePath)} → ${path.basename(result.output)} (${result.savings} saved)`);
            } else {
                results.errors.push(imagePath);
            }
        }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Optimization Summary');
    console.log('='.repeat(50));
    console.log(`Images processed: ${results.processed}`);
    console.log(`Original size: ${(results.totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Optimized size: ${(results.totalNewSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total savings: ${((1 - results.totalNewSize / results.totalOriginalSize) * 100).toFixed(2)}%`);
    console.log(`Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
        console.log('\nFailed files:');
        results.errors.forEach(f => console.log(`  - ${f}`));
    }
    
    console.log('='.repeat(50));
    console.log('✅ Image optimization complete!\n');
}

// Run if called directly
if (require.main === module) {
    optimizeImages().catch(console.error);
}

module.exports = { optimizeImages, getImageFiles, optimizeImage };

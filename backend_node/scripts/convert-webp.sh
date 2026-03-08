#!/bin/bash

# Image Optimization Script - WebP Conversion
# Phase 3: Performance Optimization
# Converts all JPG/PNG images in uploads directory to WebP format

UPLOADS_DIR="../uploads"
QUALITY=75

echo "🚀 Starting WebP Image Conversion..."
echo "📁 Directory: $UPLOADS_DIR"
echo "⚙️  Quality: $QUALITY%"
echo ""

# Check if cwebp is installed
if ! command -v cwebp &> /dev/null; then
    echo "❌ cwebp not found. Please install WebP tools:"
    echo "   Windows: npm install -g webp-converter or download from developers.google.com/speed/webp"
    echo "   macOS: brew install webp"
    echo "   Linux: sudo apt-get install webp"
    exit 1
fi

# Counter
converted=0
skipped=0

# Find and convert all JPG/PNG files
find "$UPLOADS_DIR" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) | while read -r img; do
    # Skip if WebP version already exists and is newer
    webp_name="${img%.*}.webp"
    
    if [ -f "$webp_name" ]; then
        echo "⊘ Skipped: $(basename "$img") (WebP exists)"
        ((skipped++))
        continue
    fi
    
    # Convert to WebP
    cwebp -q $QUALITY "$img" -o "$webp_name" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        original_size=$(stat -f%z "$img" 2>/dev/null || stat -c%s "$img" 2>/dev/null)
        new_size=$(stat -f%z "$webp_name" 2>/dev/null || stat -c%s "$webp_name" 2>/dev/null)
        savings=$(( (original_size - new_size) * 100 / original_size ))
        echo "✓ Converted: $(basename "$img") → $(basename "$webp_name") (${savings}% saved)"
        ((converted++))
    else
        echo "✗ Failed: $(basename "$img")"
    fi
done

echo ""
echo "=============================================="
echo "📊 Conversion Summary"
echo "=============================================="
echo "Converted: $converted"
echo "Skipped: $skipped"
echo "=============================================="
echo "✅ WebP conversion complete!"

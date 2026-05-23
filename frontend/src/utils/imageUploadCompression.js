export const VERCEL_FUNCTION_SAFE_UPLOAD_BYTES = 3.75 * 1024 * 1024;

const DEFAULT_MAX_DIMENSION = 1800;
const COMPRESSIBLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const formatFileSize = (bytes = 0) => {
  const value = Number(bytes) || 0;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

const getExtensionForType = (mimeType) => {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  return 'webp';
};

const replaceFileExtension = (filename, extension) => {
  const safeName = String(filename || 'image').replace(/\.[^.]+$/, '');
  return `${safeName}.${extension}`;
};

const loadImageBitmap = async (file) => {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Fall back to an HTMLImageElement decoder for browsers with partial option support.
    }
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read image file'));
    };
    image.src = objectUrl;
  });
};

const canvasToBlob = (canvas, type, quality) => new Promise((resolve) => {
  canvas.toBlob(resolve, type, quality);
});

const createFileFromBlob = (blob, originalFile) => {
  const extension = getExtensionForType(blob.type);
  return new File([blob], replaceFileExtension(originalFile.name, extension), {
    type: blob.type,
    lastModified: Date.now(),
  });
};

export const compressImageForFunctionUpload = async (
  file,
  {
    targetBytes = VERCEL_FUNCTION_SAFE_UPLOAD_BYTES,
    maxDimension = DEFAULT_MAX_DIMENSION,
    preserveOriginal = false,
  } = {}
) => {
  if (!file || file.size <= targetBytes) {
    return { file, compressed: false };
  }

  if (preserveOriginal) {
    throw new Error(`Original-only image uploads must be below ${formatFileSize(targetBytes)}.`);
  }

  if (!COMPRESSIBLE_TYPES.has(file.type)) {
    throw new Error(`This image is ${formatFileSize(file.size)}. Please upload a JPG, PNG, or WEBP below ${formatFileSize(targetBytes)}.`);
  }

  if (typeof document === 'undefined') {
    return { file, compressed: false };
  }

  const bitmap = await loadImageBitmap(file);
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  const baseScale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const scales = [1, 0.85, 0.7, 0.55, 0.4];
  const qualities = [0.82, 0.76, 0.7, 0.64, 0.58];
  const outputTypes = ['image/webp', 'image/jpeg'];
  let bestBlob = null;

  for (const outputType of outputTypes) {
    for (const scale of scales) {
      const width = Math.max(1, Math.round(sourceWidth * baseScale * scale));
      const height = Math.max(1, Math.round(sourceHeight * baseScale * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) continue;

      if (outputType === 'image/jpeg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
      }

      context.drawImage(bitmap, 0, 0, width, height);

      for (const quality of qualities) {
        const blob = await canvasToBlob(canvas, outputType, quality);
        if (!blob) continue;

        if (!bestBlob || blob.size < bestBlob.size) {
          bestBlob = blob;
        }

        if (blob.size <= targetBytes) {
          if (typeof bitmap.close === 'function') bitmap.close();
          return {
            file: createFileFromBlob(blob, file),
            compressed: true,
            originalSize: file.size,
            compressedSize: blob.size,
          };
        }
      }
    }
  }

  if (typeof bitmap.close === 'function') bitmap.close();

  if (bestBlob && bestBlob.size < file.size) {
    throw new Error(`Compressed image is still ${formatFileSize(bestBlob.size)}. Please choose a smaller image.`);
  }

  throw new Error(`Image is ${formatFileSize(file.size)}. Please choose a smaller image.`);
};

const fashionColorMap = require('../constants/fashionColorMap');

function levenshteinDistance(s1, s2) {
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[len1][len2];
}

function normalizeColorName(colorName) {
  if (!colorName || typeof colorName !== 'string') {
    return '';
  }

  let normalized = colorName.toLowerCase().trim();
  
  // Replace hyphens and underscores with spaces
  normalized = normalized.replace(/[-_]+/g, ' ');
  
  // Remove extra spaces
  normalized = normalized.replace(/\s+/g, ' ');

  // Remove generic suffixes like "color", "shade", "colour" when helpful
  normalized = normalized.replace(/\b(color|colour|shade)\b/gi, '').trim();
  
  // Clean up any double spaces that might be left after suffix removal
  normalized = normalized.replace(/\s+/g, ' ');

  return normalized;
}

function fuzzyMatchColor(normalizedName, threshold = 0.25) {
  const keys = Object.keys(fashionColorMap);
  let bestMatch = null;
  let minDistance = Infinity;

  // Exact match first
  if (fashionColorMap[normalizedName]) {
    return normalizedName;
  }

  for (const key of keys) {
    const distance = levenshteinDistance(normalizedName, key);
    const maxLength = Math.max(normalizedName.length, key.length);
    const normalizedDistance = distance / maxLength;

    if (normalizedDistance <= threshold && distance < minDistance) {
      minDistance = distance;
      bestMatch = key;
    }
  }

  return bestMatch;
}

module.exports = {
  normalizeColorName,
  fuzzyMatchColor,
  levenshteinDistance
};

const axios = require('axios');
const fashionColorMap = require('../constants/fashionColorMap');
const ColorReference = require('../models/colorReference.model');
const { normalizeColorName, fuzzyMatchColor } = require('../utils/colorNormalizer');
const { validateHexCode } = require('../utils/colorHexValidator');
const cacheService = require('./cache.service');
const logger = require('../utils/logger');

class ColorResolverService {
  async resolveColorName(colorName, userId = null) {
    if (!colorName || typeof colorName !== 'string' || !colorName.trim()) {
      throw new Error('Color name is required');
    }

    const normalizedName = normalizeColorName(colorName);
    if (!normalizedName) {
      throw new Error('Invalid color name after normalization');
    }

    // 1. Check local curated map (with exact or fuzzy matching)
    const exactLocalHex = this.findInLocalMap(normalizedName);
    if (exactLocalHex) {
      return {
        success: true,
        colorName,
        normalizedName,
        hexCode: exactLocalHex,
        source: 'local_map',
        confidence: 'high',
        message: 'Color resolved successfully from local fashion map'
      };
    }

    const fuzzyLocalKey = fuzzyMatchColor(normalizedName);
    if (fuzzyLocalKey) {
      const fuzzyLocalHex = fashionColorMap[fuzzyLocalKey];
      return {
        success: true,
        colorName,
        normalizedName: fuzzyLocalKey,
        hexCode: fuzzyLocalHex,
        source: 'local_map',
        confidence: 'high',
        message: `Color resolved as "${fuzzyLocalKey}" from local fashion map`
      };
    }

    // 2. Check cache / database
    const dbCached = await this.findInDatabase(normalizedName);
    if (dbCached) {
      return {
        success: true,
        colorName,
        normalizedName: dbCached.normalizedName,
        hexCode: dbCached.hexCode,
        source: dbCached.isManualOverride ? 'admin_manual' : 'database_cache',
        confidence: dbCached.confidence || 'high',
        message: dbCached.isManualOverride ? 'Color resolved from admin manual override' : 'Color resolved from database cache'
      };
    }

    // 3. Check public API (Color Pizza API / Color-Name)
    try {
      const pizzaResult = await this.lookupColorPizza(normalizedName);
      if (pizzaResult && validateHexCode(pizzaResult)) {
        await this.saveResolvedColor({
          name: colorName,
          normalizedName,
          hexCode: pizzaResult,
          source: 'color_pizza',
          confidence: 'medium',
          createdBy: userId
        });
        return {
          success: true,
          colorName,
          normalizedName,
          hexCode: pizzaResult,
          source: 'color_pizza',
          confidence: 'medium',
          message: 'Color resolved successfully via public API'
        };
      }
    } catch (err) {
      logger.error('[ColorResolver] Color Pizza lookup failed:', err.message);
    }

    // 4. Check backend external web-lookup (Yahoo Search fallback)
    try {
      const webResult = await this.lookupExternally(normalizedName);
      if (webResult && validateHexCode(webResult)) {
        await this.saveResolvedColor({
          name: colorName,
          normalizedName,
          hexCode: webResult,
          source: 'web_lookup',
          confidence: 'medium',
          createdBy: userId
        });
        return {
          success: true,
          colorName,
          normalizedName,
          hexCode: webResult,
          source: 'web_lookup',
          confidence: 'medium',
          message: 'Color resolved successfully via web lookup'
        };
      }
    } catch (err) {
      logger.error('[ColorResolver] External web lookup failed:', err.message);
    }

    // 5. Fallback if everything fails
    return {
      success: true,
      colorName,
      normalizedName,
      hexCode: '#CCCCCC',
      source: 'fallback',
      confidence: 'low',
      message: 'Color code could not be detected automatically. Please select manually.'
    };
  }

  findInLocalMap(normalizedName) {
    return fashionColorMap[normalizedName] || null;
  }

  async findInDatabase(normalizedName) {
    try {
      // Check Redis cache first if enabled and healthy
      const cacheKey = `color:resolve:${normalizedName.replace(/\s+/g, '-')}`;
      if (cacheService && typeof cacheService.isHealthy === 'function' && cacheService.isHealthy()) {
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // Check DB
      const ref = await ColorReference.findOne({ normalizedName }).lean();
      if (ref) {
        // Cache it in Redis
        if (cacheService && typeof cacheService.isHealthy === 'function' && cacheService.isHealthy()) {
          await cacheService.set(cacheKey, JSON.stringify(ref), 86400 * 30); // 30 days cache
        }
        return ref;
      }
    } catch (error) {
      logger.error('[ColorResolver] Database lookup failed:', error.message);
    }
    return null;
  }

  async lookupColorPizza(normalizedName) {
    try {
      const response = await axios.get(
        `https://api.color.pizza/v1/names/?name=${encodeURIComponent(normalizedName)}`,
        { timeout: 3000 }
      );
      if (response.data && response.data.colors && response.data.colors.length > 0) {
        const color = response.data.colors[0];
        if (color.hex && validateHexCode(color.hex)) {
          return color.hex;
        }
      }
    } catch (error) {
      logger.warn(`[ColorResolver] Color Pizza lookup failed for "${normalizedName}":`, error.message);
    }
    return null;
  }

  async lookupExternally(normalizedName) {
    const searchTerms = [
      `${normalizedName} hex code ColorHexa`,
      `${normalizedName} hex code Encycolorpedia`,
      `${normalizedName} hex code ColorKit`,
      `${normalizedName} color hex code`
    ];

    for (const term of searchTerms) {
      try {
        const url = `https://search.yahoo.com/search?p=${encodeURIComponent(term)}`;
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          timeout: 4000
        });

        const html = response.data;
        const regexes = [
          /(?:colorhexa\.com|encycolorpedia\.com)(?:%2f|\/)([a-f0-9]{6})\b/i,
          /colorkit\.co(?:%2f|\/)color(?:%2f|\/)(?:[a-z0-9-]+-)?([a-f0-9]{6})\b/i,
          /#([a-f0-9]{6})\b/i
        ];

        for (const regex of regexes) {
          const match = html.match(regex);
          if (match) {
            const hex = match[1] || match[0];
            const formattedHex = hex.startsWith('#') ? hex.toLowerCase() : `#${hex.toLowerCase()}`;
            if (validateHexCode(formattedHex)) {
              return formattedHex;
            }
          }
        }
      } catch (error) {
        logger.warn(`[ColorResolver] External lookup failed for query "${term}":`, error.message);
      }
    }
    return null;
  }

  async saveResolvedColor(data) {
    try {
      const { name, normalizedName, hexCode, source, confidence, isManualOverride = false, createdBy = null } = data;

      const updateData = {
        name,
        hexCode,
        source,
        confidence,
        isManualOverride,
        updatedBy: createdBy
      };

      if (isManualOverride) {
        updateData.source = 'admin_manual';
        updateData.confidence = 'high';
      }

      // Upsert based on normalizedName
      const ref = await ColorReference.findOneAndUpdate(
        { normalizedName },
        { 
          $set: updateData,
          $setOnInsert: { createdBy }
        },
        { upsert: true, new: true }
      ).lean();

      // Invalidate Redis cache
      const cacheKey = `color:resolve:${normalizedName.replace(/\s+/g, '-')}`;
      if (cacheService && typeof cacheService.isHealthy === 'function' && cacheService.isHealthy()) {
        await cacheService.set(cacheKey, JSON.stringify(ref), 86400 * 30);
      }

      return ref;
    } catch (error) {
      logger.error('[ColorResolver] Failed to save resolved color:', error.message);
    }
    return null;
  }
}

module.exports = new ColorResolverService();

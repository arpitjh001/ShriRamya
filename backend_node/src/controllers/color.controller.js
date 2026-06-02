const httpStatus = require('http-status');
const colorResolverService = require('../services/colorResolver.service');
const { successResponse } = require('../utils/response');
const { validateHexCode } = require('../utils/colorHexValidator');

const resolveColor = async (req, res, next) => {
  try {
    const { colorName } = req.body;
    if (!colorName) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'colorName is required'
      });
    }

    const userId = req.user?.id || req.user?._id || null;
    const result = await colorResolverService.resolveColorName(colorName, userId);
    
    return res.status(httpStatus.OK).json(result);
  } catch (error) {
    next(error);
  }
};

const saveManualOverride = async (req, res, next) => {
  try {
    const { colorName, hexCode } = req.body;
    if (!colorName || !hexCode) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'colorName and hexCode are required'
      });
    }

    if (!validateHexCode(hexCode)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Invalid HEX color code format. Must match /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'
      });
    }

    const userId = req.user?.id || req.user?._id || null;
    const normalizedName = colorResolverService.resolveColorName 
      ? require('../utils/colorNormalizer').normalizeColorName(colorName)
      : colorName.toLowerCase().trim().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');

    const result = await colorResolverService.saveResolvedColor({
      name: colorName,
      normalizedName,
      hexCode,
      source: 'admin_manual',
      confidence: 'high',
      isManualOverride: true,
      createdBy: userId
    });

    return res.status(httpStatus.OK).json({
      success: true,
      colorName,
      normalizedName,
      hexCode,
      source: 'admin_manual',
      confidence: 'high',
      message: 'Manual override saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  resolveColor,
  saveManualOverride
};

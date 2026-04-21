const httpStatus = require('http-status');
const { successResponse } = require('../utils/response');
const subcategoryService = require('../services/subcategory.service');

// ─── GROUP ENDPOINTS ───

const getGroupsByCategory = async (req, res, next) => {
  try {
    const groups = await subcategoryService.getGroupsByCategoryId(req.params.categoryId);
    return successResponse(res, groups);
  } catch (error) {
    next(error);
  }
};

const createGroup = async (req, res, next) => {
  try {
    const group = await subcategoryService.createGroup(req.params.categoryId, req.body);
    return successResponse(res, group, 'Subcategory group created', httpStatus.CREATED);
  } catch (error) {
    next(error);
  }
};

const updateGroup = async (req, res, next) => {
  try {
    const updated = await subcategoryService.updateGroup(req.params.groupId, req.body);
    if (!updated) {
      const ApiError = require('../utils/ApiError');
      throw new ApiError(httpStatus.NOT_FOUND, 'Subcategory group not found');
    }
    return successResponse(res, null, 'Subcategory group updated');
  } catch (error) {
    next(error);
  }
};

const deleteGroup = async (req, res, next) => {
    try {
        // Check if user wants to preview deletion impact
        const { preview } = req.query;
        if (preview === 'true') {
            const impact = await subcategoryService.getGroupDeletionImpact(req.params.groupId);
            if (!impact) {
                const ApiError = require('../utils/ApiError');
                throw new ApiError(httpStatus.NOT_FOUND, 'Subcategory group not found');
            }
            return successResponse(res, impact, 'Deletion impact retrieved');
        }

        await subcategoryService.deleteGroup(req.params.groupId);
        return res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
        next(error);
    }
};

// ─── VALUE ENDPOINTS ───

const createValue = async (req, res, next) => {
    try {
        const value = await subcategoryService.createValue(req.params.groupId, req.body);
        return successResponse(res, value, 'Subcategory value created', httpStatus.CREATED);
    } catch (error) {
        next(error);
    }
};

const updateValue = async (req, res, next) => {
    try {
        const updated = await subcategoryService.updateValue(req.params.valueId, req.body);
        if (!updated) {
            const ApiError = require('../utils/ApiError');
            throw new ApiError(httpStatus.NOT_FOUND, 'Subcategory value not found');
        }
        // Return the updated value
        const updatedValue = await subcategoryService.getValueById(req.params.valueId);
        return successResponse(res, updatedValue, 'Subcategory value updated');
    } catch (error) {
        next(error);
    }
};

const deleteValue = async (req, res, next) => {
    try {
        // Check if user wants to preview deletion impact
        const { preview } = req.query;
        if (preview === 'true') {
            const impact = await subcategoryService.getValueDeletionImpact(req.params.valueId);
            if (!impact) {
                const ApiError = require('../utils/ApiError');
                throw new ApiError(httpStatus.NOT_FOUND, 'Subcategory value not found');
            }
            return successResponse(res, impact, 'Deletion impact retrieved');
        }

        await subcategoryService.deleteValue(req.params.valueId);
        return res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
        next(error);
    }
};

module.exports = {
  getGroupsByCategory,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupDeletionImpact: async (req, res, next) => {
    try {
      const impact = await subcategoryService.getGroupDeletionImpact(req.params.groupId);
      if (!impact) {
        const ApiError = require('../utils/ApiError');
        throw new ApiError(httpStatus.NOT_FOUND, 'Subcategory group not found');
      }
      return successResponse(res, impact, 'Deletion impact retrieved');
    } catch (error) {
      next(error);
    }
  },
  getValueDeletionImpact: async (req, res, next) => {
    try {
      const impact = await subcategoryService.getValueDeletionImpact(req.params.valueId);
      if (!impact) {
        const ApiError = require('../utils/ApiError');
        throw new ApiError(httpStatus.NOT_FOUND, 'Subcategory value not found');
      }
      return successResponse(res, impact, 'Deletion impact retrieved');
    } catch (error) {
      next(error);
    }
  },
  createValue,
  updateValue,
  deleteValue,
};

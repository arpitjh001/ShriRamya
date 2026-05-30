const promoBarService = require('../services/promoBar.service');
const { successResponse } = require('../utils/response');

const getPromoBars = async (req, res, next) => {
  try {
    const promoBars = await promoBarService.listPromoBars(req.query);
    return successResponse(res, promoBars, 'Promo bars retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const createPromoBar = async (req, res, next) => {
  try {
    const promoBar = await promoBarService.createPromoBar(req.body);
    return successResponse(res, promoBar, 'Promo bar created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const updatePromoBar = async (req, res, next) => {
  try {
    const promoBar = await promoBarService.updatePromoBar(req.params.id, req.body);
    return successResponse(res, promoBar, 'Promo bar updated successfully');
  } catch (error) {
    next(error);
  }
};

const togglePromoBar = async (req, res, next) => {
  try {
    const promoBar = await promoBarService.togglePromoBar(req.params.id, req.body.isActive);
    return successResponse(res, promoBar, 'Promo bar status updated successfully');
  } catch (error) {
    next(error);
  }
};

const deletePromoBar = async (req, res, next) => {
  try {
    const result = await promoBarService.deletePromoBar(req.params.id);
    return successResponse(res, result, 'Promo bar deleted successfully');
  } catch (error) {
    next(error);
  }
};

const getStorefrontPromoBar = async (req, res, next) => {
  try {
    const promoBar = await promoBarService.getActivePromoBarForLocation(req.query.location);
    return successResponse(res, promoBar, 'Promo bar retrieved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPromoBars,
  createPromoBar,
  updatePromoBar,
  togglePromoBar,
  deletePromoBar,
  getStorefrontPromoBar,
};

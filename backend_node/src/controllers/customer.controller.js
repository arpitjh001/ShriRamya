const customerService = require('../services/customer.service');
const { successResponse } = require('../utils/response');

const getCustomers = async (req, res, next) => {
    try {
        const customers = await customerService.getAllCustomers(req.query);
        return successResponse(res, customers);
    } catch (error) {
        next(error);
    }
};

const getCustomer = async (req, res, next) => {
    try {
        const customer = await customerService.getCustomerById(req.params.customer_id);
        return successResponse(res, customer);
    } catch (error) {
        next(error);
    }
};

const createCustomer = async (req, res, next) => {
    try {
        const result = await customerService.createCustomer(req.body);
        return successResponse(res, result, "Customer created successfully");
    } catch (error) {
        next(error);
    }
};

const updateCustomer = async (req, res, next) => {
    try {
        const result = await customerService.updateCustomer(req.params.customer_id, req.body);
        return successResponse(res, result, "Customer updated successfully");
    } catch (error) {
        next(error);
    }
};

const deleteCustomer = async (req, res, next) => {
    try {
        const result = await customerService.deleteCustomer(req.params.customer_id);
        return successResponse(res, result, "Customer deleted successfully");
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
};

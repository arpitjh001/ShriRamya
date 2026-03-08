/**
 * Native Customer Service
 * Handles customer management using MongoDB User model, replaces WooCommerce integration.
 */

const User = require('../models/user.model');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const getAllCustomers = async (query = {}) => {
    const { page = 1, limit = 10, search } = query;
    const filter = { role: 'user' };

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    const customers = await User.find(filter)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ created_at: -1 })
        .exec();

    const count = await User.countDocuments(filter);

    return {
        customers,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalCustomers: count
    };
};

const getCustomerById = async (id) => {
    const customer = await User.findById(id);
    if (!customer) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
    }
    return customer;
};

const createCustomer = async (customerData) => {
    if (await User.isEmailTaken(customerData.email)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
    }
    const customer = await User.create({
        ...customerData,
        role: 'user'
    });
    return customer;
};

const updateCustomer = async (id, updateData) => {
    const customer = await User.findById(id);
    if (!customer) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
    }

    Object.assign(customer, updateData);
    await customer.save();
    return customer;
};

const deleteCustomer = async (id) => {
    const customer = await User.findById(id);
    if (!customer) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
    }
    await customer.remove();
    return { id, message: 'Customer deleted' };
};

module.exports = {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
};

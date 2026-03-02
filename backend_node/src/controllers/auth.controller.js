const httpStatus = require('http-status');
const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');
const { successResponse } = require('../utils/response');

const register = async (req, res, next) => {
    try {
        const user = await authService.createUser(req.body);
        const tokens = await tokenService.generateAuthTokens(user);
        return successResponse(res, { user, ...tokens }, "User registered successfully", httpStatus.CREATED);
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await authService.loginWithEmailAndPassword(email, password);
        const tokens = await tokenService.generateAuthTokens(user);
        return successResponse(res, { user, ...tokens }, "Logged in successfully");
    } catch (error) {
        next(error);
    }
};

const getMe = async (req, res, next) => {
    try {
        return successResponse(res, req.user);
    } catch (error) {
        next(error);
    }
}

const checkAdmin = async (req, res, next) => {
    try {
        return successResponse(res, {
            is_admin: req.user.role === 'admin'
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    register,
    login,
    getMe,
    checkAdmin
};

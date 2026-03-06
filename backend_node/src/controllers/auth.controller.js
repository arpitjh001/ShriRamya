const httpStatus = require('http-status');
const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');
const { successResponse } = require('../utils/response');
const config = require('../config/config');

const register = async (req, res, next) => {
    try {
        const user = await authService.createUser(req.body);
        const deviceId = req.headers['x-device-id'] || 'unknown_device';

        const accessToken = tokenService.generateAccessToken(user.id, user.role, deviceId);
        const refreshToken = await tokenService.generateRefreshToken(user.id, deviceId);
        const encodedRT = tokenService.encodeRT(user.id, refreshToken);

        // Set HTTPOnly cookie for Refresh Token
        res.cookie('refresh_token', encodedRT, {
            httpOnly: true,
            secure: config.cookie.secure,
            sameSite: config.cookie.secure ? 'Strict' : 'Lax',
            maxAge: config.jwt.refreshExpirationDays * 24 * 60 * 60 * 1000,
        });

        return successResponse(res, {
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            access_token: accessToken
        }, "User registered successfully", httpStatus.CREATED);
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const deviceId = req.headers['x-device-id'] || 'unknown_device';

        const user = await authService.loginWithEmailAndPassword(email, password);

        const accessToken = tokenService.generateAccessToken(user.id, user.role, deviceId);
        const refreshToken = await tokenService.generateRefreshToken(user.id, deviceId);
        const encodedRT = tokenService.encodeRT(user.id, refreshToken);

        res.cookie('refresh_token', encodedRT, {
            httpOnly: true,
            secure: config.cookie.secure,
            sameSite: config.cookie.secure ? 'Strict' : 'Lax',
            maxAge: config.jwt.refreshExpirationDays * 24 * 60 * 60 * 1000,
        });

        return successResponse(res, {
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            access_token: accessToken
        }, "Logged in successfully");
    } catch (error) {
        next(error);
    }
};

const refreshTokens = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refresh_token || req.body.refresh_token;
        const deviceId = req.headers['x-device-id'] || 'unknown_device';

        if (!refreshToken) {
            throw new Error('Refresh token missing');
        }

        const tokens = await tokenService.refreshAuthTokens(refreshToken, deviceId);

        res.cookie('refresh_token', tokens.refresh_token, {
            httpOnly: true,
            secure: config.cookie.secure,
            sameSite: config.cookie.secure ? 'Strict' : 'Lax',
            maxAge: config.jwt.refreshExpirationDays * 24 * 60 * 60 * 1000,
        });

        return successResponse(res, {
            access_token: tokens.access_token
        }, "Tokens refreshed successfully");
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        // Blacklist current access token
        if (req.user && req.user.jti) {
            await tokenService.blacklistAccessToken(req.user.jti, req.user.exp);
        }

        // Clear cookie
        res.clearCookie('refresh_token');

        return successResponse(res, null, "Logged out successfully");
    } catch (error) {
        next(error);
    }
};

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
    refreshTokens,
    logout,
    getMe: (req, res) => successResponse(res, req.user),
    checkAdmin,
};


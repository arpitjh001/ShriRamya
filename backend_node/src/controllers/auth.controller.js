const httpStatus = require('http-status');
const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');
const { successResponse } = require('../utils/response');
const config = require('../config/config');
const { UserRoleService } = require('../models/rbac.model');

/**
 * Get or create user's role mapping in mysql_users for RBAC
 */
const ensureUserRoleMapping = async (userId, email, userRole, tenantId = 1) => {
    const { mysqlPool } = require('../config/db');

    try {
        // Check if mapping exists by MongoDB ID or Email
        const [rows] = await mysqlPool.query(
            'SELECT id, mongo_user_id FROM mysql_users WHERE mongo_user_id = ? OR email = ?',
            [userId, email]
        );

        let mysqlUserId = rows.length > 0 ? rows[0].id : null;
        let existingMongoId = rows.length > 0 ? rows[0].mongo_user_id : null;

        if (!mysqlUserId) {
            // Create mapping
            console.log(`[AuthController] Creating new role mapping for ${email}`);
            const [result] = await mysqlPool.query(
                'INSERT INTO mysql_users (mongo_user_id, email, tenant_id, role) VALUES (?, ?, ?, ?)',
                [userId, email, tenantId, userRole || 'Customer']
            );
            mysqlUserId = result.insertId;
        } else {
            // Update mapping if MongoDB ID has changed (e.g., user re-created)
            // or if role has changed
            console.log(`[AuthController] Updating existing role mapping for ${email}`);
            await mysqlPool.query(
                'UPDATE mysql_users SET mongo_user_id = ?, role = ? WHERE id = ?',
                [userId, userRole || 'Customer', mysqlUserId]
            );
        }

        // Standardize role name for mapping (admin -> Admin, editor -> Editor)
        let roleName = 'Customer';
        const sanitizedRole = (userRole || '').toLowerCase();
        if (sanitizedRole === 'admin') {
            roleName = 'Admin';
        } else if (sanitizedRole === 'editor') {
            roleName = 'Editor';
        }

        const [roleRows] = await mysqlPool.query(
            'SELECT id FROM roles WHERE name = ? LIMIT 1',
            [roleName]
        );

        if (roleRows.length > 0) {
            // Get current roles
            const [existingRoles] = await mysqlPool.query(
                'SELECT role_id FROM user_roles WHERE user_id = ?',
                [mysqlUserId]
            );

            const hasTargetRole = existingRoles.some(r => r.role_id === roleRows[0].id);

            if (!hasTargetRole) {
                console.log(`[AuthController] Assigning role ${roleName} (ID: ${roleRows[0].id}) to user ${mysqlUserId}`);
                // For now, let's keep it simple: sync roles (clear and add)
                await UserRoleService.syncUserRoles(mysqlUserId, [roleRows[0].id], tenantId);
            }
        }

        return mysqlUserId;
    } catch (error) {
        console.error('[AuthController] Error ensuring user role mapping:', error.message);
        return null;
    }
};

const register = async (req, res, next) => {
    try {
        const user = await authService.createUser(req.body);
        const deviceId = req.headers['x-device-id'] || 'unknown_device';
        const tenantId = req.body.tenantId || 1;

        // Ensure RBAC mapping with user's role
        await ensureUserRoleMapping(user.id, user.email, user.role, tenantId);

        const accessToken = await tokenService.generateAccessToken(user.id, user.role, deviceId, tenantId);
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
        const tenantId = req.body.tenantId || 1;

        const user = await authService.loginWithEmailAndPassword(email, password);

        // Ensure RBAC mapping with user's role
        await ensureUserRoleMapping(user.id, user.email, user.role, tenantId);

        const accessToken = await tokenService.generateAccessToken(user.id, user.role, deviceId, tenantId);
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
        // Check if user has Admin role (case-insensitive)
        const userRole = req.user.role?.toLowerCase();
        const userRoles = req.user.roles?.map(r => r.toLowerCase()) || [];

        return successResponse(res, {
            is_admin: userRole === 'admin' || userRoles.includes('admin')
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


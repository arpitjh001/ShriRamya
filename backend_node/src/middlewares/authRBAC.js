/**
 * Enhanced Auth Middleware with Multi-Tenant RBAC Support
 */

const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const redis = require('../config/integrations/redis');
const { UserRoleService } = require('../models/rbac.model');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */
const auth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(new ApiError(httpStatus.UNAUTHORIZED, 'Access token missing'));
        }

        // Verify signature and expiry (Stateless)
        const secret = config.jwt.secret.trim();
        const payload = jwt.verify(token, secret);

        // Check Blacklist in Redis (Stateful check for revoked tokens)
        if (redis) {
            try {
                const isBlacklisted = await redis.get(`at_blacklist:${payload.jti}`);
                if (isBlacklisted) {
                    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Token has been revoked'));
                }
            } catch (redisErr) {
                console.error('[Auth Middleware] Redis error:', redisErr.message);
            }
        }

        // Device Binding Check (Optional)
        const deviceId = req.headers['x-device-id'];
        if (payload.deviceId && deviceId && payload.deviceId !== deviceId) {
            return next(new ApiError(httpStatus.UNAUTHORIZED, 'Device binding mismatch'));
        }

        // Attach to request - Enhanced with multi-tenant RBAC data
        const tenantId = parseInt(payload.tenant_id || payload.tenantId || 1, 10) || 1;
        req.user = {
            id: String(payload.user_id || payload.sub),
            userId: String(payload.user_id || payload.sub),
            tenantId,
            tenant_id: tenantId,
            roles: payload.roles || (payload.role ? [payload.role] : []),
            role: payload.roles?.[0] || payload.role, // Primary role for legacy
            permissions: payload.permissions || [],
            deviceId: payload.deviceId,
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(new ApiError(httpStatus.UNAUTHORIZED, 'Token expired'));
        }
        if (error.name === 'JsonWebTokenError') {
            return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid authentication'));
        }
        return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication failed'));
    }
};

/**
 * Role-Based Authorization Middleware
 * Checks if user has at least one of the required roles
 * 
 * @param  {...string} roles - Required roles (e.g., 'Admin', 'Editor')
 * @returns {Function} Middleware function
 * 
 * Usage:
 * router.post("/products", auth, requireRole("Admin", "Editor"), productController.createProduct)
 */
const requireRole = (...roles) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.id) {
                return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required'));
            }

            const userRoles = (req.user.roles || []).map(r => r.toLowerCase());
            const hasRequiredRole = roles.map(r => r.toLowerCase()).some(role => userRoles.includes(role));

            if (!hasRequiredRole) {
                return next(new ApiError(
                    httpStatus.FORBIDDEN,
                    `Access denied. Required roles: ${roles.join(' or ')}. Your roles: ${userRoles.join(', ') || 'none'}`
                ));
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Permission-Based Authorization Middleware
 * Checks if user has the required permission
 * 
 * @param {string} permission - Required permission (e.g., 'delete_product')
 * @returns {Function} Middleware function
 * 
 * Usage:
 * router.delete("/products/:id", auth, requirePermission('delete_product'), productController.deleteProduct)
 */
const requirePermission = (permission) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.id) {
                return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required'));
            }

            const userPermissions = (req.user.permissions || []).map(p => p.toLowerCase());
            const targetPermission = permission.toLowerCase();

            // Check if user has the permission
            if (!userPermissions.includes(targetPermission)) {
                // Also check against legacy role for backward compatibility
                const userRole = (req.user.role || '').toLowerCase();
                const legacyPermissions = {
                    'admin': ['manage_products', 'manage_orders', 'manage_users', 'delete_product', 'delete_order'],
                    'editor': ['create_product', 'update_product', 'create_blog', 'update_blog'],
                    'customer': ['view_products', 'add_to_cart', 'place_order']
                };

                const roleHasPermission = legacyPermissions[userRole]?.includes(targetPermission);
                if (!roleHasPermission) {
                    return next(new ApiError(
                        httpStatus.FORBIDDEN,
                        `Access denied. Required permission: ${permission}`
                    ));
                }
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Optional Tenant Isolation Middleware
 * Works for both authenticated and public users
 * For public users, uses default tenant or header-provided tenant
 * 
 * Usage:
 * router.get("/products", optionalTenantIsolation, productController.getProducts)
 */
const optionalTenantIsolation = (req, res, next) => {
    try {
        if (req.user && req.user.id) {
            // Authenticated user - use their tenant
            req.tenantId = req.user.tenantId || 1;
            req.tenant_id = req.user.tenantId || 1;
        } else {
            // Public user - use default tenant or header-provided tenant
            req.tenantId = parseInt(req.headers['x-tenant-id']) || 1;
            req.tenant_id = req.tenantId;
        }
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Tenant Isolation Middleware
 * Ensures user can only access data from their own tenant
 * Automatically filters queries by tenant_id
 * REQUIRES authentication
 *
 * Usage:
 * router.get("/orders", auth, ensureTenantIsolation, orderController.getOrders)
 */
const ensureTenantIsolation = (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required'));
        }

        // Attach tenant_id to request for repository layer to use
        req.tenantId = req.user.tenantId || 1;
        req.tenant_id = req.user.tenantId || 1;

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Optional Auth Middleware
 * Attaches user info if token is present, but doesn't require it
 * Useful for endpoints that behave differently for logged-in users
 */
const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            try {
                const payload = jwt.verify(token, config.jwt.secret);
                req.user = {
                    id: payload.user_id || payload.sub,
                    userId: payload.user_id || payload.sub,
                    tenantId: payload.tenant_id || 1,
                    tenant_id: payload.tenant_id || 1,
                    roles: payload.roles || (payload.role ? [payload.role] : []),
                    role: payload.roles?.[0] || payload.role,
                    permissions: payload.permissions || [],
                };
            } catch (err) {
                // Token invalid, continue without user info
                req.user = null;
            }
        } else {
            req.user = null;
        }

        next();
    } catch (error) {
        next();
    }
};

module.exports = {
    auth,
    requireRole,
    requirePermission,
    ensureTenantIsolation,
    optionalTenantIsolation,
    optionalAuth
};

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/config');
const redis = require('../config/integrations/redis');
const { v4: uuidv4 } = require('uuid');
const { UserRoleService } = require('../models/rbac.model');

/**
 * Hash a token before storing in Redis
 */
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

const isLikelyUserId = (value) => {
    return typeof value === 'string' && (/^[a-f0-9]{24}$/i.test(value) || /^\d+$/.test(value));
};

const decodeRefreshToken = (refreshToken, fallbackUserId = null) => {
    const rawRefreshToken = String(refreshToken || '').trim();
    const fallback = fallbackUserId ? String(fallbackUserId).trim() : null;
    let userId = null;
    let token = null;

    try {
        const decoded = Buffer.from(rawRefreshToken, 'base64').toString('utf8');
        const separatorIndex = decoded.indexOf(':');
        if (separatorIndex > 0) {
            const decodedUserId = decoded.slice(0, separatorIndex);
            const decodedToken = decoded.slice(separatorIndex + 1);

            if (isLikelyUserId(decodedUserId) && decodedToken.length > 20) {
                userId = decodedUserId;
                token = decodedToken;
            }
        }
    } catch (error) {
        // Fall through to legacy raw token handling below.
    }

    if ((!userId || !token) && fallback) {
        userId = fallback;
        token = rawRefreshToken;
    }

    return { userId, token };
};

const getJwtSecret = () => config.jwt.secret.trim();

const generateStatelessRefreshToken = (userId, deviceId) => {
    return jwt.sign({
        sub: String(userId),
        user_id: String(userId),
        deviceId,
        type: 'refresh',
    }, getJwtSecret(), {
        expiresIn: `${config.jwt.refreshExpirationDays}d`,
    });
};

const verifyStatelessRefreshToken = (token, deviceId) => {
    try {
        const payload = jwt.verify(token, getJwtSecret());
        if (payload.type !== 'refresh') return null;
        if (payload.deviceId !== deviceId) return null;

        return {
            userId: payload.user_id || payload.sub,
        };
    } catch (error) {
        return null;
    }
};

/**
 * Generate Access Token (Stateless)
 * Updated to include tenant_id and roles array for multi-tenant RBAC
 */
const generateAccessToken = async (userId, role, deviceId, tenantId = 1) => {
    const jti = uuidv4();
    const expires = Math.floor(Date.now() / 1000) + config.jwt.accessExpirationMinutes * 60;
    
    // Fetch all roles for this user in the tenant
    let roles = [];
    let permissions = [];
    try {
        roles = await UserRoleService.getRoleNamesForUser(userId, tenantId);
        permissions = await UserRoleService.getPermissionNamesForUser(userId, tenantId);
    } catch (error) {
        console.error('[TokenService] Error fetching user roles:', error.message);
        // Fallback to legacy role if RBAC not set up
        if (role) {
            roles = [role];
        }
    }

    if ((!Array.isArray(roles) || roles.length === 0) && role) {
        roles = [role];
    }

    const payload = {
        sub: userId,
        user_id: userId,
        tenant_id: tenantId,
        roles: roles,
        permissions: permissions,
        role: roles[0] || role, // Legacy support - primary role
        deviceId: deviceId,
        jti: jti,
        iat: Math.floor(Date.now() / 1000),
        exp: expires,
    };
    return jwt.sign(payload, getJwtSecret());
};

/**
 * Generate Refresh Token (Stateful) and store in Redis
 */
const generateRefreshToken = async (userId, deviceId) => {
    const token = crypto.randomBytes(40).toString('hex');
    const hashedToken = hashToken(token);
    const jti = uuidv4();
    const expiresDays = config.jwt.refreshExpirationDays;
    const expiresSeconds = expiresDays * 24 * 60 * 60;

    // rt:{userId}:{deviceId}:{jti}
    const tokenKey = `rt:${userId}:${deviceId}:${jti}`;
    // rt_family:{userId}:{deviceId} stores the active hashed token for rotation check
    const familyKey = `rt_family:${userId}:${deviceId}`;

    let storedInRedis = false;

    // Store the active token in the family (use safe Redis wrapper)
    if (redis && redis.set) {
        const familyStored = await redis.set(familyKey, hashedToken, { ex: expiresSeconds });
        // Store detailed token info
        const tokenStored = await redis.set(tokenKey, JSON.stringify({
            userId,
            deviceId,
            jti,
            iat: Date.now(),
        }), { ex: expiresSeconds });
        storedInRedis = Boolean(familyStored && tokenStored);
    } else {
        console.warn('[TokenService] Redis unavailable, refresh token not stored');
    }

    if (!storedInRedis) {
        console.warn('[TokenService] Using signed stateless refresh token fallback');
        return generateStatelessRefreshToken(userId, deviceId);
    }

    return token;
};

/**
 * Verify Refresh Token and handle rotation
 */
const refreshAuthTokens = async (oldRefreshToken, deviceId, fallbackUserId = null) => {
    // Find who this token might belong to by scanning keys for the hashed value? 
    // No, better to have the token carry its own ID or we just scan the family keys for the user.
    // Let's assume the client sends the userId alongside or we encode userId in a wrapper?
    // Opaque tokens are better. Let's make the RT a bit more structured or keep it simple.

    // Optimization: The client should send the userId or we decode it from the last AT (even if expired).
    // For now, let's use a composite RT: "base64(userId:token)"
    const { userId, token } = decodeRefreshToken(oldRefreshToken, fallbackUserId);
    if (!userId || !token) throw new Error('Invalid Refresh Token format');

    const hashedToken = hashToken(token);
    const familyKey = `rt_family:${userId}:${deviceId}`;
    
    // Use safe Redis wrapper
    let currentHashed = null;
    if (redis && redis.get) {
        currentHashed = await redis.get(familyKey);
    }

    if (!currentHashed) {
        const statelessPayload = verifyStatelessRefreshToken(token, deviceId);
        if (!statelessPayload || String(statelessPayload.userId) !== String(userId)) {
            throw new Error('Invalid or expired refresh token');
        }
    } else if (currentHashed !== hashedToken) {
        // REPLAY DETECTION
        // Replay detected or token revoked! Invalidate entire family.
        if (redis && redis.del) {
            await redis.del(familyKey);
            const keys = await redis.keys ? await redis.keys(`rt:${userId}:${deviceId}:*`) : [];
            if (keys.length > 0) await redis.del(...keys);
        }
        throw new Error('Refresh token session breach detected. Global logout enforced.');
    }

    // Generate new pair
    const User = require('../models/user.model');
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Get tenant_id from user or default to 1
    const tenantId = user.tenantId || user.tenant_id || 1;
    
    const newAccessToken = await generateAccessToken(user.id, user.role, deviceId, tenantId);
    const newRefreshToken = await generateRefreshToken(user.id, deviceId);

    // Return new tokens (client needs to encode the RT again)
    const encodedRT = Buffer.from(`${user.id}:${newRefreshToken}`).toString('base64');

    return {
        access_token: newAccessToken,
        refresh_token: encodedRT,
    };
};

/**
 * Blacklist Access Token (on logout)
 */
const blacklistAccessToken = async (jti, exp) => {
    const secondsToExpiry = exp - Math.floor(Date.now() / 1000);
    if (secondsToExpiry > 0 && redis && redis.set) {
        await redis.set(`at_blacklist:${jti}`, '1', { ex: secondsToExpiry });
    }
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    refreshAuthTokens,
    blacklistAccessToken,
    // Helper to wrap RT
    encodeRT: (userId, token) => Buffer.from(`${userId}:${token}`).toString('base64'),
};


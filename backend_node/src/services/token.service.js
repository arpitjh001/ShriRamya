const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/config');
const redis = require('../config/integrations/redis');
const { v4: uuidv4 } = require('uuid');

/**
 * Hash a token before storing in Redis
 */
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate Access Token (Stateless)
 */
const generateAccessToken = (userId, role, deviceId) => {
    const jti = uuidv4();
    const expires = Math.floor(Date.now() / 1000) + config.jwt.accessExpirationMinutes * 60;
    const payload = {
        sub: userId,
        role: role,
        deviceId: deviceId,
        jti: jti,
        iat: Math.floor(Date.now() / 1000),
        exp: expires,
    };
    return jwt.sign(payload, config.jwt.secret);
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

    // Store the active token in the family
    await redis.setex(familyKey, expiresSeconds, hashedToken);
    // Store detailed token info
    await redis.setex(tokenKey, expiresSeconds, JSON.stringify({
        userId,
        deviceId,
        jti,
        iat: Date.now(),
    }));

    return token;
};

/**
 * Verify Refresh Token and handle rotation
 */
const refreshAuthTokens = async (oldRefreshToken, deviceId) => {
    const hashedOld = hashToken(oldRefreshToken);

    // Find who this token might belong to by scanning keys for the hashed value? 
    // No, better to have the token carry its own ID or we just scan the family keys for the user.
    // Let's assume the client sends the userId alongside or we encode userId in a wrapper?
    // Opaque tokens are better. Let's make the RT a bit more structured or keep it simple.

    // Optimization: The client should send the userId or we decode it from the last AT (even if expired).
    // For now, let's use a composite RT: "base64(userId:token)"
    const [userId, token] = Buffer.from(oldRefreshToken, 'base64').toString().split(':');
    if (!userId || !token) throw new Error('Invalid Refresh Token format');

    const hashedToken = hashToken(token);
    const familyKey = `rt_family:${userId}:${deviceId}`;
    const currentHashed = await redis.get(familyKey);

    // REPLAY DETECTION
    if (!currentHashed || currentHashed !== hashedToken) {
        // Replay detected or token revoked! Invalidate entire family.
        await redis.del(familyKey);
        const keys = await redis.keys(`rt:${userId}:${deviceId}:*`);
        if (keys.length > 0) await redis.del(...keys);
        throw new Error('Refresh token session breach detected. Global logout enforced.');
    }

    // Generate new pair
    // (In a real app, you'd fetch the user's role from DB here)
    const User = require('../models/user.model');
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const newAccessToken = generateAccessToken(user.id, user.role, deviceId);
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
    if (secondsToExpiry > 0) {
        await redis.setex(`at_blacklist:${jti}`, secondsToExpiry, '1');
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


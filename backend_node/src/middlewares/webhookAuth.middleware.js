const crypto = require('crypto');
const httpStatus = require('http-status');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');

/**
 * WooCommerce Webhook HMAC-SHA256 Signature Verification Middleware.
 *
 * Validates the `x-wc-webhook-signature` header against the raw request body
 * using the configured WC_WEBHOOK_SECRET.
 *
 * IMPORTANT: The route using this middleware must receive the raw body.
 * Use `express.raw({ type: 'application/json' })` on the route BEFORE this middleware.
 */
const verifyWebhookSignature = (req, res, next) => {
    const signature = req.headers['x-wc-webhook-signature'];

    if (!signature) {
        return next(new ApiError(httpStatus.UNAUTHORIZED, 'Missing webhook signature'));
    }

    const secret = config.webhookSecret || process.env.WC_WEBHOOK_SECRET;
    if (!secret) {
        console.error('[WebhookAuth] WC_WEBHOOK_SECRET is not configured');
        return next(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Webhook secret not configured'));
    }

    // req.body is a Buffer when using express.raw()
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('base64');

    // Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'base64');
    const computedBuffer = Buffer.from(computedSignature, 'base64');

    if (sigBuffer.length !== computedBuffer.length || !crypto.timingSafeEqual(sigBuffer, computedBuffer)) {
        console.warn('[WebhookAuth] Invalid webhook signature received');
        return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid webhook signature'));
    }

    // If body was raw, parse it to JSON for downstream handlers
    if (Buffer.isBuffer(req.body)) {
        try {
            const bodyString = rawBody.toString('utf8');
            
            // Validate body size before parsing (max 1MB)
            if (bodyString.length > 1024 * 1024) {
                return next(new ApiError(httpStatus.BAD_REQUEST, 'Webhook payload too large'));
            }
            
            // Parse JSON
            const parsed = JSON.parse(bodyString);
            
            // Validate parsed object is a plain object (not null or array)
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return next(new ApiError(httpStatus.BAD_REQUEST, 'Invalid webhook payload structure'));
            }
            
            // Validate no dangerous prototype pollution properties
            const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
            for (const key of dangerousKeys) {
                if (key in parsed) {
                    console.warn('[WebhookAuth] Dangerous property detected in webhook payload');
                    return next(new ApiError(httpStatus.BAD_REQUEST, 'Invalid webhook payload properties'));
                }
            }
            
            req.body = parsed;
        } catch (e) {
            console.error('[WebhookAuth] JSON parse error:', e.message);
            return next(new ApiError(httpStatus.BAD_REQUEST, 'Invalid webhook JSON body'));
        }
    }

    next();
};

module.exports = verifyWebhookSignature;

const crypto = require('crypto');
const config = require('../config/config');

/**
 * WooCommerce Webhook HMAC Validation
 * timingSafeEqual prevents timing attacks during signature verification
 */
const validateWCSignature = (req, res, next) => {
    const signature = req.headers['x-wc-webhook-signature'];
    const secret = config.woocommerce.webhookSecret || process.env.WC_WEBHOOK_SECRET;

    if (!signature) {
        return res.status(401).json({ error: 'Missing webhook signature' });
    }

    // Use raw body if available (body-parser usually converts it, make sure it's consistent)
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64');

    try {
        const signatureBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expectedSignature);

        if (signatureBuffer.length !== expectedBuffer.length ||
            !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
            console.warn('[Security] Webhook signature mismatch detected.');
            return res.status(401).json({ error: 'Invalid signature' });
        }
    } catch (err) {
        return res.status(401).json({ error: 'Signature verification failed' });
    }

    next();
};

module.exports = {
    validateWCSignature,
};


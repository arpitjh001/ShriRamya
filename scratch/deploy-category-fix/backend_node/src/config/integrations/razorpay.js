const Razorpay = require('razorpay');
const config = require('../config');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
});

const verifySignature = (orderId, paymentId, signature) => {
    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(text)
        .digest('hex');

    return generatedSignature === signature;
};

module.exports = {
    razorpay,
    verifySignature,
};



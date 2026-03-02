const jwt = require('jsonwebtoken');
const config = require('../config/config');

const generateToken = (userId, expires, secret = config.jwt.secret) => {
    const payload = {
        sub: userId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(expires.getTime() / 1000),
    };
    return jwt.sign(payload, secret);
};

const generateAuthTokens = async (user) => {
    // Maintaining a long expiry like your FastAPI config (30 days)
    const accessTokenExpires = new Date();
    accessTokenExpires.setDate(accessTokenExpires.getDate() + 30);

    const accessToken = generateToken(user.id, accessTokenExpires);

    return {
        access_token: accessToken,
        token_type: "bearer"
    };
};

module.exports = {
    generateToken,
    generateAuthTokens,
};

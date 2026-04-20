const httpStatus = require('http-status');
const User = require('../models/user.model');
const ApiError = require('../utils/ApiError');

const loginWithEmailAndPassword = async (email, password) => {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.isPasswordMatch(password))) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
    }
    return user;
};

const createUser = async (userBody) => {
    if (await User.isEmailTaken(userBody.email)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
    }
    return User.create({ ...userBody, role: 'user' });
};

const getUserById = async (id) => {
    return User.findById(id);
};

module.exports = {
    loginWithEmailAndPassword,
    createUser,
    getUserById,
};


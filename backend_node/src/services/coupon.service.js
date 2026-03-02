const wcClient = require('../integrations/woocommerce');

const getAllCoupons = async (params = {}) => {
    const response = await wcClient.get('/coupons', { params });
    return response.data;
};

const getCouponById = async (id) => {
    const response = await wcClient.get(`/coupons/${id}`);
    return response.data;
};

const createCoupon = async (data) => {
    const response = await wcClient.post('/coupons', data);
    return response.data;
};

const updateCoupon = async (id, data) => {
    const response = await wcClient.put(`/coupons/${id}`, data);
    return response.data;
};

const deleteCoupon = async (id) => {
    const response = await wcClient.delete(`/coupons/${id}`, {
        params: { force: true }
    });
    return response.data;
};

module.exports = {
    getAllCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon,
};

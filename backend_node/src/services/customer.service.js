const wcClient = require('../integrations/woocommerce');

const getAllCustomers = async (params = {}) => {
    const response = await wcClient.get('/customers', { params });
    return response.data;
};

const getCustomerById = async (id) => {
    const response = await wcClient.get(`/customers/${id}`);
    return response.data;
};

const createCustomer = async (data) => {
    const response = await wcClient.post('/customers', data);
    return response.data;
};

const updateCustomer = async (id, data) => {
    const response = await wcClient.put(`/customers/${id}`, data);
    return response.data;
};

const deleteCustomer = async (id) => {
    const response = await wcClient.delete(`/customers/${id}`, {
        params: { force: true }
    });
    return response.data;
};

module.exports = {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
};

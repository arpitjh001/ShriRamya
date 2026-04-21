/**
 * Cash on Delivery (COD) Payment Gateway
 * Handles COD payment processing
 */

class CashOnDeliveryGateway {
    constructor() {
        this.gatewayName = 'cod';
        this.displayName = 'Cash on Delivery';
    }

    /**
     * Create COD order
     * COD doesn't require actual payment processing at order time
     * @param {Object} order - Order details
     * @returns {Object}
     */
    async createPayment(order) {
        // COD doesn't need payment gateway interaction
        // Just return a pseudo transaction
        const transactionId = `COD_${order.orderId}_${Date.now()}`;

        return {
            success: true,
            transactionId,
            amount: order.amount,
            currency: order.currency || 'INR',
            method: 'cod',
            status: 'pending',
            message: 'Cash on Delivery order created. Payment will be collected upon delivery.'
        };
    }

    /**
     * Verify COD payment
     * COD payment is verified upon delivery
     * @param {string} transactionId - Transaction ID
     * @returns {Object}
     */
    async verifyPayment(transactionId) {
        // For COD, payment is marked as pending until delivery
        return {
            success: true,
            transactionId,
            status: 'pending',
            message: 'COD payment pending. Will be collected upon delivery.'
        };
    }

    /**
     * Mark COD payment as collected
     * Called when delivery is completed and payment is collected
     * @param {string} transactionId - Transaction ID
     * @returns {Object}
     */
    async markAsCollected(transactionId) {
        return {
            success: true,
            transactionId,
            status: 'paid',
            message: 'COD payment collected successfully'
        };
    }

    /**
     * Process COD refund
     * @param {string} transactionId - Transaction ID
     * @param {number} amount - Refund amount
     * @param {string} reason - Refund reason
     * @returns {Object}
     */
    async refund(transactionId, amount, reason = '') {
        // For COD refunds, we need to process via bank transfer or other means
        const refundId = `COD_REFUND_${transactionId}_${Date.now()}`;

        return {
            success: true,
            refundId,
            amount,
            status: 'pending',
            message: 'COD refund initiated. Amount will be transferred to customer account.',
            note: 'COD refunds require manual processing via bank transfer'
        };
    }

    /**
     * Get payment details
     * @param {string} transactionId - Transaction ID
     * @returns {Object}
     */
    async getPaymentDetails(transactionId) {
        return {
            success: true,
            id: transactionId,
            method: 'cod',
            status: 'pending',
            gateway: 'cod'
        };
    }

    /**
     * COD doesn't use webhooks
     */
    verifyWebhookSignature() {
        return {
            valid: true,
            message: 'COD does not use webhooks'
        };
    }

    /**
     * Check if COD is available for given address
     * @param {Object} address - Shipping address
     * @returns {Object}
     */
    async checkAvailability(address) {
        // Simple implementation - can be extended with pincode checks
        const availablePincodes = process.env.COD_AVAILABLE_PINCODES?.split(',') || [];
        
        if (availablePincodes.length > 0 && address.postcode) {
            const isAvailable = availablePincodes.includes(address.postcode);
            return {
                available: isAvailable,
                message: isAvailable 
                    ? 'COD available for your location' 
                    : 'COD not available for your location'
            };
        }

        // Default: COD available
        return {
            available: true,
            message: 'COD available for your location'
        };
    }

    /**
     * Get COD charges (if any)
     * @param {number} orderAmount - Order amount
     * @returns {Object}
     */
    getCharges(orderAmount) {
        const codCharges = parseFloat(process.env.COD_CHARGES || '0');
        const codChargesType = process.env.COD_CHARGES_TYPE || 'fixed'; // fixed or percentage

        let charges = 0;
        if (codChargesType === 'percentage') {
            charges = (orderAmount * codCharges) / 100;
        } else {
            charges = codCharges;
        }

        // Apply minimum order value for COD if configured
        const minOrderValue = parseFloat(process.env.COD_MIN_ORDER_VALUE || '0');
        const isEligible = orderAmount >= minOrderValue;

        return {
            charges,
            chargesType: codChargesType,
            totalAmount: orderAmount + charges,
            minOrderValue,
            isEligible,
            message: isEligible 
                ? 'Eligible for COD' 
                : `Minimum order value for COD is ₹${minOrderValue}`
        };
    }
}

module.exports = new CashOnDeliveryGateway();

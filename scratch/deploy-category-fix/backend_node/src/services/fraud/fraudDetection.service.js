/**
 * Fraud Detection Service
 * Analyzes orders for potential fraudulent activity
 */

const { FraudRule, FraudLog, Order } = require('../../models');

class FraudDetectionService {
    /**
     * Check order for potential fraud
     */
    async checkOrder(orderId, ipAddress) {
        const order = await Order.findById(orderId);
        if (!order) return { score: 0, status: 'safe' };

        let totalScore = 0;
        const matchedRules = [];

        // Fetch active rules for tenant
        const activeRules = await FraudRule.find({ 
            isActive: true, 
            tenantId: order.tenantId || 'default' 
        });

        for (const rule of activeRules) {
            let matched = false;
            
            if (rule.type === 'amount_threshold' && order.total_amount > rule.value) {
                matched = true;
                totalScore += 50;
            } else if (rule.type === 'email_domain_blacklist') {
                const userOrder = await Order.findById(orderId).populate('userId');
                if (userOrder && userOrder.userId && userOrder.userId.email && userOrder.userId.email.endsWith(rule.value)) {
                    matched = true;
                    totalScore += 100;
                }
            }

            if (matched) {
                matchedRules.push(rule.name);
            }
        }

        const status = totalScore >= 100 ? 'block' : (totalScore >= 50 ? 'review' : 'safe');

        // Log result
        try {
            await FraudLog.create({
                orderId,
                userId: order.userId,
                ipAddress,
                ruleMatched: matchedRules.join(', '),
                actionTaken: status,
                score: totalScore,
                tenantId: order.tenantId || 'default'
            });
        } catch (logError) {
            console.error('Failed to log fraud detection result:', logError);
        }

        return { score: totalScore, status, matchedRules };
    }

    /**
     * Blacklist an IP or email
     */
    async blacklist(type, value, reason, tenantId = 'default') {
        return await FraudRule.create({
            name: `${type}_blacklist_${Date.now()}`,
            type: `${type}_blacklist`,
            value,
            action: 'block',
            isActive: true,
            tenantId
        });
    }

    /**
     * Get fraud logs for admin
     */
    async getFraudLogs(tenantId, limit = 50) {
        return await FraudLog.find({ tenantId })
            .sort({ created_at: -1 })
            .limit(limit)
            .populate('orderId', 'order_number')
            .populate('userId', 'email name');
    }
}

module.exports = new FraudDetectionService();

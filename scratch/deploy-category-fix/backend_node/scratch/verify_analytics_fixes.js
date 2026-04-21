const mongoose = require('mongoose');
const path = require('path');
const config = require('../src/config/config');
const { Order } = require('../src/models');
const analyticsService = require('../src/services/analytics/analytics.service');

async function verifyAnalytics() {
    console.log('Connecting to database...');
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected.');

    try {
        const tenantId = 1;
        console.log(`\n--- Verifying Analytics for Tenant ${tenantId} ---`);

        // Check raw data first
        const confirmedOrders = await Order.find({ 
            tenant_id: tenantId, 
            status: 'confirmed' 
        });
        console.log(`Found ${confirmedOrders.length} confirmed orders.`);
        const confirmedRevenue = confirmedOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        console.log(`Expected revenue from confirmed orders: ₹${confirmedRevenue}`);

        // Test consolidated method (legacy/order controller)
        console.log('\nTesting getOrderAnalytics...');
        const legacyResults = await analyticsService.getOrderAnalytics({ tenant_id: tenantId });
        console.log('Legacy Results:', JSON.stringify(legacyResults, null, 2));

        // Test dashboard overview
        console.log('\nTesting getDashboardOverview...');
        const overview = await analyticsService.getDashboardOverview({ tenant_id: tenantId });
        console.log('Overview:', JSON.stringify(overview, null, 2));

        // Test revenue analytics
        console.log('\nTesting getRevenueAnalytics...');
        const revenue = await analyticsService.getRevenueAnalytics({ tenant_id: tenantId });
        console.log('Net Revenue (Metrics):', revenue.metrics.netRevenue);
        
        const success = legacyResults.totalRevenue > 0 && overview.month.revenue > 0;
        console.log(`\nVerification ${success ? 'PASSED ✅' : 'FAILED ❌'}`);

    } catch (error) {
        console.error('Verification error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verifyAnalytics();

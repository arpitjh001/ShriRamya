/**
 * Reservation Cron Service
 * Cleans up expired stock reservations
 */

const { Order, WarehouseInventory } = require('../models');

class ReservationCronService {
    /**
     * Clear expired reservations
     */
    async clearExpiredReservations() {
        try {
            const now = new Date();
            // Find orders that are in 'pending' or 'awaiting_payment' status and are older than 30 minutes
            const expirationTime = new Date(now.getTime() - 30 * 60 * 1000);
            
            const expiredOrders = await Order.find({
                status: { $in: ['pending', 'awaiting_payment'] },
                created_at: { $lt: expirationTime },
                is_reservation_cleared: { $ne: true }
            });

            if (expiredOrders.length > 0) {
                console.log(`[Cron] Found ${expiredOrders.length} expired reservations to clear`);
            }

            for (const order of expiredOrders) {
                await this._releaseStockForOrder(order);
                order.is_reservation_cleared = true;
                order.status = 'cancelled'; // Mark as cancelled due to timeout
                await order.save();
            }

            return expiredOrders.length;
        } catch (error) {
            console.error('[Cron] Failed to clear expired reservations:', error);
            return 0;
        }
    }

    /**
     * Release stock for a specific order
     */
    async _releaseStockForOrder(order) {
        // Iterate through items and restore stock in WarehouseInventory
        if (order.items && order.items.length > 0) {
            for (const item of order.items) {
                if (item.variantId && item.quantity > 0) {
                    try {
                        await WarehouseInventory.updateOne(
                            { variantId: item.variantId, warehouseId: item.warehouseId },
                            { $inc: { stockLevel: item.quantity } }
                        );
                    } catch (updateError) {
                        console.error(`[Cron] Failed to release stock for variant ${item.variantId}:`, updateError);
                    }
                }
            }
        }
    }
}

module.exports = new ReservationCronService();

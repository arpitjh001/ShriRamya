/**
 * Background Job Queue Service
 * Uses BullMQ with Redis for job processing
 * Handles: emails, thumbnails, analytics, stock notifications
 */

const Queue = require('bull');
const config = require('../../config/config');
const path = require('path');

// Create queues
const emailQueue = new Queue('email', config.redis.url, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: 100,
    removeOnFail: 1000
  }
});

const imageQueue = new Queue('image-processing', config.redis.url, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 50,
    removeOnFail: 500
  }
});

const analyticsQueue = new Queue('analytics', config.redis.url, {
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: 100,
    removeOnFail: 1000
  }
});

const notificationQueue = new Queue('notifications', config.redis.url, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: 100,
    removeOnFail: 1000
  }
});

const stockAlertQueue = new Queue('stock-alerts', config.redis.url, {
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: 50,
    removeOnFail: 500
  }
});

/**
 * Email Queue Processors
 */
emailQueue.process('send-order-confirmation', async (job) => {
  const { userId, orderId, email, orderData } = job.data;
  console.log(`[Email Queue] Sending order confirmation to ${email} for order #${orderId}`);
  
  // Import email service
  const emailService = require('../services/email/email.service');
  await emailService.sendOrderConfirmation(email, orderData);
  
  return { success: true, email, orderId };
});

emailQueue.process('send-shipping-notification', async (job) => {
  const { userId, orderId, email, trackingData } = job.data;
  console.log(`[Email Queue] Sending shipping notification to ${email} for order #${orderId}`);
  
  const emailService = require('../services/email/email.service');
  await emailService.sendShippingNotification(email, trackingData);
  
  return { success: true, email, orderId };
});

emailQueue.process('send-delivery-confirmation', async (job) => {
  const { userId, orderId, email, orderData } = job.data;
  console.log(`[Email Queue] Sending delivery confirmation to ${email} for order #${orderId}`);
  
  const emailService = require('../services/email/email.service');
  await emailService.sendDeliveryConfirmation(email, orderData);
  
  return { success: true, email, orderId };
});

emailQueue.process('send-refund-notification', async (job) => {
  const { userId, orderId, email, refundData } = job.data;
  console.log(`[Email Queue] Sending refund notification to ${email} for order #${orderId}`);
  
  const emailService = require('../services/email/email.service');
  await emailService.sendRefundNotification(email, refundData);
  
  return { success: true, email, orderId };
});

emailQueue.process('send-low-stock-alert', async (job) => {
  const { productId, productName, currentStock, adminEmail } = job.data;
  console.log(`[Email Queue] Sending low stock alert for ${productName}`);
  
  const emailService = require('../services/email/email.service');
  await emailService.sendLowStockAlert(adminEmail, productName, currentStock);
  
  return { success: true, productId };
});

emailQueue.process('generic', async (job) => {
  const { to, subject, html, text } = job.data;
  console.log(`[Email Queue] Sending generic email to ${to}`);
  
  const emailService = require('../services/email/email.service');
  await emailService.sendEmail(to, subject, html, text);
  
  return { success: true, to };
});

/**
 * Image Processing Queue
 */
imageQueue.process('generate-thumbnails', async (job) => {
  const { imageUrl, productId } = job.data;
  console.log(`[Image Queue] Generating thumbnails for product ${productId}`);
  
  const imageService = require('../services/images/imageOptimization.service');
  // Image processing already happens during upload, this can be used for re-processing
  const result = await imageService.processImage({ buffer: Buffer.from(imageUrl) }, 'products');
  
  return { success: true, productId, urls: result };
});

imageQueue.process('optimize-image', async (job) => {
  const { inputPath, outputPath, options } = job.data;
  console.log(`[Image Queue] Optimizing image from ${inputPath}`);
  
  const imageService = require('../services/images/imageOptimization.service');
  const result = await imageService.optimizeImage(inputPath, outputPath, options);
  
  return { success: true, result };
});

/**
 * Analytics Queue
 */
analyticsQueue.process('aggregate-daily-stats', async (job) => {
  const { date } = job.data;
  console.log(`[Analytics Queue] Aggregating daily stats for ${date}`);
  
  const analyticsService = require('../services/analytics/analytics.service');
  const stats = await analyticsService.aggregateDailyStats(date);
  
  return { success: true, date, stats };
});

analyticsQueue.process('update-product-performance', async (job) => {
  const { productId, date } = job.data;
  console.log(`[Analytics Queue] Updating product performance for product ${productId}`);
  
  const analyticsService = require('../services/analytics/analytics.service');
  await analyticsService.updateProductPerformance(productId, date);
  
  return { success: true, productId };
});

analyticsQueue.process('rebuild-recommendations', async (job) => {
  const { productId } = job.data;
  console.log(`[Analytics Queue] Rebuilding recommendations for product ${productId}`);
  
  const recommendationEngine = require('../services/recommendations/recommendationEngine.service');
  await recommendationEngine.clearCache(productId);
  
  return { success: true, productId };
});

/**
 * Notification Queue (Multi-channel)
 */
notificationQueue.process('send-multi-channel', async (job) => {
  const { userId, eventType, channels, data } = job.data;
  console.log(`[Notification Queue] Sending ${eventType} notification via ${channels.join(', ')}`);
  
  const notificationService = require('../services/notifications/notification.service');
  
  const results = {};
  for (const channel of channels) {
    try {
      if (channel === 'email') {
        results.email = await notificationService.sendEmailNotification(userId, eventType, data);
      } else if (channel === 'sms') {
        results.sms = await notificationService.sendSmsNotification(userId, eventType, data);
      } else if (channel === 'push') {
        results.push = await notificationService.sendPushNotification(userId, eventType, data);
      }
    } catch (error) {
      console.error(`Failed to send ${channel} notification:`, error.message);
      results[channel] = { success: false, error: error.message };
    }
  }
  
  return { success: true, results };
});

/**
 * Stock Alert Queue
 */
stockAlertQueue.process('check-low-stock', async (job) => {
  const { threshold = 10 } = job.data;
  console.log(`[Stock Queue] Checking low stock items (threshold: ${threshold})`);
  
  const warehouseService = require('../services/inventory/warehouseAllocator.service');
  const lowStockItems = await warehouseService.getLowStockAlerts(threshold);
  
  if (lowStockItems.length > 0) {
    // Send alerts to admin
    const notificationService = require('../services/notifications/notification.service');
    for (const item of lowStockItems) {
      await notificationService.sendLowStockAlert(item);
    }
  }
  
  return { success: true, lowStockCount: lowStockItems.length };
});

stockAlertQueue.process('notify-restock', async (job) => {
  const { variantId, productId, productName, subscribedUsers } = job.data;
  console.log(`[Stock Queue] Notifying ${subscribedUsers.length} users about restock of ${productName}`);
  
  const notificationService = require('../services/notifications/notification.service');
  for (const userId of subscribedUsers) {
    await notificationService.sendRestockNotification(userId, productId, productName);
  }
  
  return { success: true, notifiedCount: subscribedUsers.length };
});

/**
 * Job Helpers
 */
const addEmailJob = (type, data, options = {}) => {
  return emailQueue.add(type, data, {
    priority: options.priority || 5,
    delay: options.delay || 0,
    ...options
  });
};

const addImageJob = (type, data, options = {}) => {
  return imageQueue.add(type, data, {
    priority: options.priority || 5,
    ...options
  });
};

const addAnalyticsJob = (type, data, options = {}) => {
  return analyticsQueue.add(type, data, {
    priority: options.priority || 5,
    ...options
  });
};

const addNotificationJob = (type, data, options = {}) => {
  return notificationQueue.add(type, data, {
    priority: options.priority || 5,
    ...options
  });
};

const addStockAlertJob = (type, data, options = {}) => {
  return stockAlertQueue.add(type, data, {
    priority: options.priority || 5,
    ...options
  });
};

/**
 * Queue Management
 */
const getQueueStats = async () => {
  const queues = {
    email: emailQueue,
    image: imageQueue,
    analytics: analyticsQueue,
    notifications: notificationQueue,
    stock: stockAlertQueue
  };

  const stats = {};
  for (const [name, queue] of Object.entries(queues)) {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount()
    ]);
    stats[name] = { waiting, active, completed, failed };
  }

  return stats;
};

const cleanQueue = async (queueName, gracePeriodMs = 3600000) => {
  const queues = {
    email: emailQueue,
    image: imageQueue,
    analytics: analyticsQueue,
    notifications: notificationQueue,
    stock: stockAlertQueue
  };

  const queue = queues[queueName];
  if (!queue) {
    throw new Error(`Unknown queue: ${queueName}`);
  }

  await queue.clean(gracePeriodMs, 'completed');
  await queue.clean(gracePeriodMs, 'failed');
  
  return { success: true, queue: queueName };
};

/**
 * Event Listeners
 */
const setupQueueListeners = () => {
  const queues = [emailQueue, imageQueue, analyticsQueue, notificationQueue, stockAlertQueue];

  queues.forEach(queue => {
    queue.on('completed', (job, result) => {
      console.log(`[Queue] Job ${job.id} completed in ${queue.name}`);
    });

    queue.on('failed', (job, error) => {
      console.error(`[Queue] Job ${job.id} failed in ${queue.name}:`, error.message);
    });

    queue.on('error', (error) => {
      console.error(`[Queue] Error in ${queue.name}:`, error.message);
    });
  });
};

/**
 * Close all queues (for graceful shutdown)
 */
const closeAllQueues = async () => {
  await Promise.all([
    emailQueue.close(),
    imageQueue.close(),
    analyticsQueue.close(),
    notificationQueue.close(),
    stockAlertQueue.close()
  ]);
  console.log('[Queue] All queues closed');
};

module.exports = {
  queues: {
    email: emailQueue,
    image: imageQueue,
    analytics: analyticsQueue,
    notifications: notificationQueue,
    stock: stockAlertQueue
  },
  addEmailJob,
  addImageJob,
  addAnalyticsJob,
  addNotificationJob,
  addStockAlertJob,
  getQueueStats,
  cleanQueue,
  setupQueueListeners,
  closeAllQueues
};

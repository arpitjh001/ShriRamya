const app = require('./src/app');
const config = require('./src/config/config');
const { connectDB } = require('./src/db/mongodb');
const { seedDatabase } = require('./src/db/seed');

(async () => {
    try {
        await connectDB();
        await seedDatabase();

        // Try to setup queue listeners, but don't fail if Redis is unavailable
        try {
            const { setupQueueListeners } = require('./src/services/queue/jobQueue.service');
            setupQueueListeners();
            console.log('Background job queues initialized');
        } catch (err) {
            console.log('Queue setup skipped (Redis unavailable):', err.message);
        }

        const server = app.listen(config.port, () => {
            console.log(`Server running on port ${config.port}`);
            console.log(`Environment: ${config.env}`);
        });

        const gracefulShutdown = async (signal) => {
            console.log(`\n${signal} received. Shutting down gracefully...`);
            server.close(() => { process.exit(0); });
            setTimeout(() => { process.exit(1); }, 10000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
})();
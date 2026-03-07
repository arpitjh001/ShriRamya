const app = require('./src/app');
const config = require('./src/config/config');
const { connectMongo, connectMySQL } = require('./src/config/db');

// Initialize queue listeners for background jobs
const { setupQueueListeners, closeAllQueues } = require('./src/services/queue/jobQueue.service');

(async () => {
    try {
        await connectMongo();
        await connectMySQL();

        // Setup background job queue listeners
        setupQueueListeners();
        console.log('✓ Background job queues initialized');

        const server = app.listen(config.port, () => {
            console.log(`Server running on port ${config.port}`);
            console.log(`Environment: ${config.env}`);
            console.log(`API Documentation: http://localhost:${config.port}/api/docs (development only)`);
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            console.log(`\n${signal} received. Shutting down gracefully...`);
            
            server.close(async () => {
                console.log('HTTP server closed');
                
                try {
                    await closeAllQueues();
                    console.log('Queue connections closed');
                    
                    process.exit(0);
                } catch (error) {
                    console.error('Error during shutdown:', error.message);
                    process.exit(1);
                }
            });

            // Force close after 30 seconds
            setTimeout(() => {
                console.error('Forced shutdown due to timeout');
                process.exit(1);
            }, 30000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        console.error('Failed to connect to DB:', error);
        process.exit(1);
    }
})();
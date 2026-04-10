try {
    console.log('Starting debug require of ./server.js');
    require('./server.js');
} catch (error) {
    console.error('CRITICAL ERROR DURING STARTUP:');
    console.error(error.stack);
    process.exit(1);
}

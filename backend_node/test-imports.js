const modules = [
    './src/config/config',
    './src/config/db',
    './src/config/swagger',
    './src/middlewares/error',
    './src/middlewares/requestId',
    './src/utils/logger',
    './src/utils/ApiError',
    './src/routes/dbRoutes',
    './src/routes/v1'
];

modules.forEach(mod => {
    try {
        console.log(`Requiring ${mod}...`);
        require(mod);
        console.log(`✓ ${mod} loaded`);
    } catch (error) {
        console.error(`✗ Error loading ${mod}:`);
        console.error(error.stack);
        process.exit(1);
    }
});
console.log('All modules required successfully!');

const app = require('./app');
const config = require('./config/config');
const { connectMongo, connectMySQL } = require('./config/db');

(async () => {
    try {
        await connectMongo();
        await connectMySQL();

        app.listen(config.port, () => {
            console.log(`Server running on port ${config.port}`);
        });
    } catch (error) {
        console.error('Failed to connect to DB:', error);
        process.exit(1);
    }
})();
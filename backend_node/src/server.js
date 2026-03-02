const app = require('./app');
const config = require('./config/config');
const { connectMongo, connectMySQL } = require('./config/db');

const initServer = async () => {
    await connectMongo();
    await connectMySQL();
    app.listen(config.port, () => {
        console.log(`Node Server running on port ${config.port}`);
    });
};

initServer();

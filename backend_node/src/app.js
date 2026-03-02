const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const httpStatus = require('http-status');
const config = require('./config/config');
const morgan = require('morgan');
const { connectMongo, connectMySQL } = require('./config/db');
const routes = require('./routes/v1');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');

const app = express();

if (config.env !== 'test') {
  app.use(morgan('dev'));
}

// Security HTTP headers
app.use(helmet());

// body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// gzip compression
app.use(compression());

// cors
app.use(cors());
app.options('*', cors());

// serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// health check
app.get('/api/v1/health', (req, res) => {
  res.status(httpStatus.OK).send({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// v1 api routes
app.use('/api/v1', routes);

// 404 handler
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to ApiError
app.use(errorConverter);

// error handler
app.use(errorHandler);

module.exports = app;

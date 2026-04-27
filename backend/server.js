const mongoose = require('mongoose');
const http = require('http');
require('dotenv').config();

const socketService = require('./src/services/socketService');
const ReallocationService = require('./src/services/reallocationService');
const jobSchedulerService = require('./src/services/jobSchedulerService');
const logger = require('./src/config/logger');
const createApp = require('./src/app');

const app = createApp();
const server = http.createServer(app);
socketService.init(server);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartpark';

mongoose.connect(MONGODB_URI)
    .then(() => {
      logger.info('mongodb_connected');
      ReallocationService.startScheduler();
      jobSchedulerService.startScheduler();
    })
    .catch((err) => logger.error('mongodb_connection_error', { message: err.message }));

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    logger.info('server_started', {
      port: PORT,
      parking: `/api/v1/parking/spots`,
      auth: `/api/v1/auth/login`,
      payments: `/api/v1/payments`,
      health: '/health',
    });
});

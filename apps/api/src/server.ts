import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/index.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { logger } from './utils/logger.js';
import './workers/shipping.worker.js'; // Start background workers
import { startPaymentReminderJob } from './workers/payment-reminder.worker.js';

let server: import('http').Server;

async function bootstrap() {
  try {
    // 1. Connect to backing services
    await connectRedis();
    await connectDatabase();

    // 2. Start server
    server = app.listen(env.PORT, () => {
      logger.info(`🚀 API Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    // 3. Background jobs (safe to run after the DB connection is ready)
    startPaymentReminderJob();

    // 4. Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      if (server) {
        server.close(() => {
          logger.info('HTTP server closed');
        });
      }

      await disconnectDatabase();
      await disconnectRedis();
      
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();

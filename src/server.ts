import app from './app.js';
import { connectDatabase } from './config/database.config.js';
import { env } from './config/env.config.js';

const startServer = async () => {
  await connectDatabase();

  app.listen(env.PORT, () => {
    console.log(`🚀 StockMind AI Auth Service running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });
};

startServer();

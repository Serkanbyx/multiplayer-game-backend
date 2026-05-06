import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';

import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { redis } from './config/redis.js';
import { sanitizeMiddleware } from './middleware/sanitizeMiddleware.js';
import { globalLimiter } from './middleware/rateLimiters.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/authRoutes.js';

const app = express();

// 3. Disable x-powered-by
app.disable('x-powered-by');

// 4. Helmet security headers
app.use(helmet());

// 5. CORS
app.use(cors({
  origin: env.CLIENT_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

// 6. JSON body parser
app.use(express.json({ limit: '10kb' }));

// 7. URL-encoded body parser
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 8. Mongo sanitize (Express 5–safe)
app.use(sanitizeMiddleware);

// 9. Global rate limiter
app.use('/api', globalLimiter);

// 10. Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1,
    redis: redis.status === 'ready',
  });
});

// 11. Routes
app.use('/api/auth', authRouter);
// app.use('/api/users', usersRouter);        // Step 5+
// app.use('/api/matches', matchesRouter);    // Step 5+
// app.use('/api/leaderboard', leaderboardRouter); // Step 5+
// app.use('/api/admin', adminRouter);        // Step 5+

// 12. Error handler (must be last)
app.use(errorHandler);

// 13. Create HTTP server, connect DB, listen
const httpServer = http.createServer(app);

const bootstrap = async (): Promise<void> => {
  await connectDB();
  httpServer.listen(env.PORT, () => {
    console.log(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });
};

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { app, httpServer };

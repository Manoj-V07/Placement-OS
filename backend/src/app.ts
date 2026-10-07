import express, { Application } from 'express';
import cors from 'cors';
import { logger } from './middlewares/logger.middleware';
import { errorHandler } from './middlewares/error.middleware';
import v1Routes from './routes/v1';

const app: Application = express();

// Middlewares
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// API Routes
app.use('/api/v1', v1Routes);

// Centralized error handler
app.use(errorHandler);

export default app;
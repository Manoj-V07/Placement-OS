import { config } from 'dotenv';
import path from 'path';

// Load .env file based on environment
const envPath = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
config({ path: path.resolve(process.cwd(), envPath) });

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
};

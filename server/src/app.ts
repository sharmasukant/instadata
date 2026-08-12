import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import axios from 'axios';
import accountsRoutes from './routes/accounts.routes.js';
import authRouter from './routes/auth.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

dotenv.config();

const app = express();

app.use(helmet());
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://instadataapp.netlify.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean) as string[];
const localDevOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || localDevOriginPattern.test(origin)) {
      return callback(null, true);
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use((req, res, next) => {
  const startedAt = Date.now();
  console.log(`[api] -> ${req.method} ${req.originalUrl}`, {
    origin: req.get('origin') || 'none',
    queryKeys: Object.keys(req.query),
  });

  res.on('finish', () => {
    console.log(`[api] <- ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });

  next();
});
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/image-proxy', async (req, res, next) => {
  const imageUrl = typeof req.query.url === 'string' ? req.query.url : '';

  try {
    const parsedUrl = new URL(imageUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Invalid image URL' });
    }

    console.log('[image-proxy] fetching image', { host: parsedUrl.host });
    const response = await axios.get<ArrayBuffer>(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });

    const contentType = response.headers['content-type'];
    res.setHeader('Content-Type', typeof contentType === 'string' ? contentType : 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error('[image-proxy] failed', {
      url: imageUrl || 'missing',
      message: error instanceof Error ? error.message : 'Unknown image proxy error',
    });
    next(error);
  }
});

// API routes
app.use('/api', accountsRoutes);
app.use('/api/auth', authRouter);

// Error handler
app.use(errorHandler);

export default app;

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize database
import './lib/db.js';

import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { sessionsRouter } from './routes/sessions.js';
import { clientsRouter } from './routes/clients.js';
import { financeRouter } from './routes/finance.js';
import { espaceClientRouter } from './routes/espace-client.js';
import { clientPortalRouter } from './routes/client-portal.js';
import { teamRouter } from './routes/team.js';
import { calendarRouter } from './routes/calendar.js';
import { tasksRouter } from './routes/tasks.js';
import { notificationsRouter } from './routes/notifications.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || 'https://lumina-photo.vercel.app', 'https://lumina-api.onrender.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/finance', financeRouter);
app.use('/api/espace-client', espaceClientRouter);
app.use('/api/client-portal', clientPortalRouter);
app.use('/api/team', teamRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/notifications', notificationsRouter);

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const publicPath = path.join(__dirname, '..', 'public');

  app.use(express.static(publicPath));

  // Handle SPA routing - serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log('Serving frontend from /app/public');
  }
});

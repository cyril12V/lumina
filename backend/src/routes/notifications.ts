import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'lumina-secret-key-change-in-production';

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

router.use(authenticateToken);

// Get all notifications for user
router.get('/', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { unread_only, limit } = req.query;

    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params: any[] = [userId];

    if (unread_only === 'true') {
      query += ' AND is_read = 0';
    }

    query += ' ORDER BY created_at DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const notifications = db.prepare(query).all(...params);
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Get unread count
router.get('/unread-count', (req: any, res) => {
  try {
    const userId = req.user.userId;

    const result = db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
    `).get(userId) as any;

    res.json({ count: result.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Mark notification as read
router.put('/:id/read', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = db.prepare(`
      UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?
    `).run(id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Mark all as read
router.put('/read-all', (req: any, res) => {
  try {
    const userId = req.user.userId;

    db.prepare(`
      UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0
    `).run(userId);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Delete notification
router.delete('/:id', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = db.prepare(`
      DELETE FROM notifications WHERE id = ? AND user_id = ?
    `).run(id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Delete all read notifications
router.delete('/clear-read', (req: any, res) => {
  try {
    const userId = req.user.userId;

    db.prepare(`
      DELETE FROM notifications WHERE user_id = ? AND is_read = 1
    `).run(userId);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

export { router as notificationsRouter };

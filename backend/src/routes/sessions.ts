import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../lib/db.js';

export const sessionsRouter = Router();

// Get all sessions for a user
sessionsRouter.get('/', (req, res) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const sessions = db.prepare(`
      SELECT s.*, c.name as client_name, c.email as client_email
      FROM sessions s
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `).all(userId);

    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Get single session
sessionsRouter.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const session = db.prepare(`
      SELECT s.*, c.name as client_name, c.email as client_email
      FROM sessions s
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.id = ?
    `).get(id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Create new session
sessionsRouter.post('/', (req, res) => {
  try {
    const { user_id, client_id, title, date, type, status, location, notes, price } = req.body;

    if (!user_id || !title || !date) {
      return res.status(400).json({ error: 'user_id, title and date required' });
    }

    const id = uuidv4();

    db.prepare(`
      INSERT INTO sessions (id, user_id, client_id, title, date, type, status, location, notes, price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, user_id, client_id || null, title, date, type || 'portrait', status || 'pending', location || null, notes || null, price || null);

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);

    res.status(201).json(session);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Update session
sessionsRouter.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, type, status, location, notes, price, client_id } = req.body;

    const result = db.prepare(`
      UPDATE sessions
      SET title = COALESCE(?, title),
          date = COALESCE(?, date),
          type = COALESCE(?, type),
          status = COALESCE(?, status),
          location = COALESCE(?, location),
          notes = COALESCE(?, notes),
          price = COALESCE(?, price),
          client_id = COALESCE(?, client_id),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(title, date, type, status, location, notes, price, client_id, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    res.json(session);
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Delete session
sessionsRouter.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM sessions WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

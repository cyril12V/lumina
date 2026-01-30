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

// Helper to get user's team
const getUserTeam = (userId: string) => {
  return db.prepare(`
    SELECT t.id as team_id, tm.role
    FROM teams t
    JOIN team_members tm ON t.id = tm.team_id
    WHERE tm.user_id = ?
  `).get(userId) as any;
};

router.use(authenticateToken);

// ============== CALENDAR EVENTS ==============

// Get events for date range
router.get('/events', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { start, end, user_id: filterUserId } = req.query;

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    let query = `
      SELECT ce.*, u.full_name as user_name
      FROM calendar_events ce
      LEFT JOIN users u ON ce.user_id = u.id
      WHERE ce.team_id = ?
    `;
    const params: any[] = [team.team_id];

    if (start && end) {
      query += ` AND (
        (ce.start_datetime >= ? AND ce.start_datetime <= ?)
        OR (ce.end_datetime >= ? AND ce.end_datetime <= ?)
        OR (ce.start_datetime <= ? AND ce.end_datetime >= ?)
      )`;
      params.push(start, end, start, end, start, end);
    }

    if (filterUserId) {
      query += ' AND ce.user_id = ?';
      params.push(filterUserId);
    }

    query += ' ORDER BY ce.start_datetime ASC';

    const events = db.prepare(query).all(...params);
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Get single event
router.get('/events/:id', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const event = db.prepare(`
      SELECT ce.*, u.full_name as user_name
      FROM calendar_events ce
      LEFT JOIN users u ON ce.user_id = u.id
      WHERE ce.id = ? AND ce.team_id = ?
    `).get(id, team.team_id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get event' });
  }
});

// Create event
router.post('/events', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const {
      title, description, event_type, start_datetime, end_datetime,
      all_day, location, color, is_visible_to_clients, session_id, assigned_user_id
    } = req.body;

    if (!title || !start_datetime || !end_datetime) {
      return res.status(400).json({ error: 'Title, start and end datetime required' });
    }

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO calendar_events (
        id, team_id, user_id, session_id, title, description, event_type,
        start_datetime, end_datetime, all_day, location, color, is_visible_to_clients
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, team.team_id, assigned_user_id || userId, session_id || null,
      title, description || null, event_type || 'busy',
      start_datetime, end_datetime, all_day ? 1 : 0,
      location || null, color || null, is_visible_to_clients ? 1 : 0
    );

    const event = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id);
    res.status(201).json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/events/:id', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const {
      title, description, event_type, start_datetime, end_datetime,
      all_day, location, color, is_visible_to_clients, assigned_user_id
    } = req.body;

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Verify event belongs to team
    const existing = db.prepare(`
      SELECT * FROM calendar_events WHERE id = ? AND team_id = ?
    `).get(id, team.team_id);

    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    db.prepare(`
      UPDATE calendar_events SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        event_type = COALESCE(?, event_type),
        start_datetime = COALESCE(?, start_datetime),
        end_datetime = COALESCE(?, end_datetime),
        all_day = COALESCE(?, all_day),
        location = COALESCE(?, location),
        color = COALESCE(?, color),
        is_visible_to_clients = COALESCE(?, is_visible_to_clients),
        user_id = COALESCE(?, user_id),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title, description, event_type, start_datetime, end_datetime,
      all_day !== undefined ? (all_day ? 1 : 0) : null,
      location, color,
      is_visible_to_clients !== undefined ? (is_visible_to_clients ? 1 : 0) : null,
      assigned_user_id, id
    );

    const event = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id);
    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/events/:id', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const result = db.prepare(`
      DELETE FROM calendar_events WHERE id = ? AND team_id = ?
    `).run(id, team.team_id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// ============== AVAILABILITY ==============

// Get availability slots
router.get('/availability', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { user_id: filterUserId } = req.query;

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    let query = 'SELECT * FROM availability_slots WHERE team_id = ?';
    const params: any[] = [team.team_id];

    if (filterUserId) {
      query += ' AND (user_id = ? OR user_id IS NULL)';
      params.push(filterUserId);
    }

    query += ' ORDER BY day_of_week, start_time';

    const slots = db.prepare(query).all(...params);
    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get availability' });
  }
});

// Set availability slot
router.post('/availability', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { day_of_week, start_time, end_time, user_id: targetUserId } = req.body;

    if (day_of_week === undefined || !start_time || !end_time) {
      return res.status(400).json({ error: 'Day, start and end time required' });
    }

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO availability_slots (id, team_id, user_id, day_of_week, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, team.team_id, targetUserId || userId, day_of_week, start_time, end_time);

    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create availability slot' });
  }
});

// Delete availability slot
router.delete('/availability/:id', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const team = getUserTeam(userId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const result = db.prepare(`
      DELETE FROM availability_slots WHERE id = ? AND team_id = ?
    `).run(id, team.team_id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete slot' });
  }
});

// ============== PUBLIC CALENDAR (for clients) ==============

// Get public calendar for a team (no auth required)
router.get('/public/:teamId', (req, res) => {
  try {
    const { teamId } = req.params;
    const { start, end } = req.query;

    // Get events visible to clients
    let query = `
      SELECT id, title, event_type, start_datetime, end_datetime, all_day, location
      FROM calendar_events
      WHERE team_id = ? AND is_visible_to_clients = 1
    `;
    const params: any[] = [teamId];

    if (start && end) {
      query += ` AND (
        (start_datetime >= ? AND start_datetime <= ?)
        OR (end_datetime >= ? AND end_datetime <= ?)
      )`;
      params.push(start, end, start, end);
    }

    query += ' ORDER BY start_datetime ASC';

    const events = db.prepare(query).all(...params);

    // Get availability
    const availability = db.prepare(`
      SELECT day_of_week, start_time, end_time
      FROM availability_slots
      WHERE team_id = ? AND is_active = 1
      ORDER BY day_of_week, start_time
    `).all(teamId);

    res.json({ events, availability });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get public calendar' });
  }
});

export { router as calendarRouter };

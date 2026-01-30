import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../lib/db.js';

export const clientsRouter = Router();

// Get all clients for a user
clientsRouter.get('/', (req, res) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const clients = db.prepare(`
      SELECT * FROM clients
      WHERE user_id = ?
      ORDER BY name ASC
    `).all(userId);

    res.json(clients);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Failed to get clients' });
  }
});

// Get single client
clientsRouter.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Failed to get client' });
  }
});

// Create client
clientsRouter.post('/', (req, res) => {
  try {
    const { user_id, name, email, phone, address, city, postal_code, country, siret, tva_number, notes } = req.body;

    if (!user_id || !name) {
      return res.status(400).json({ error: 'user_id and name required' });
    }

    const id = uuidv4();

    db.prepare(`
      INSERT INTO clients (id, user_id, name, email, phone, address, city, postal_code, country, siret, tva_number, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, user_id, name, email || null, phone || null, address || null, city || null, postal_code || null, country || 'France', siret || null, tva_number || null, notes || null);

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);

    res.status(201).json(client);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Update client
clientsRouter.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, city, postal_code, country, siret, tva_number, notes } = req.body;

    const result = db.prepare(`
      UPDATE clients
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          postal_code = COALESCE(?, postal_code),
          country = COALESCE(?, country),
          siret = COALESCE(?, siret),
          tva_number = COALESCE(?, tva_number),
          notes = COALESCE(?, notes),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(name, email, phone, address, city, postal_code, country, siret, tva_number, notes, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    res.json(client);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// Delete client
clientsRouter.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM clients WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

import { Router } from 'express';
import db from '../lib/db.js';

export const usersRouter = Router();

// Get user profile
usersRouter.get('/profile/:id', (req, res) => {
  try {
    const { id } = req.params;

    const user = db.prepare(`
      SELECT id, email, full_name, business_name, phone, address, city, postal_code, country,
             siret, tva_number, logo_url, iban, bic, bank_name, payment_terms, default_tva_rate,
             created_at, updated_at
      FROM users WHERE id = ?
    `).get(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
usersRouter.put('/profile/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name, business_name, phone, address, city, postal_code, country,
      siret, tva_number, logo_url, iban, bic, bank_name, payment_terms, default_tva_rate
    } = req.body;

    const result = db.prepare(`
      UPDATE users
      SET full_name = COALESCE(?, full_name),
          business_name = COALESCE(?, business_name),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          postal_code = COALESCE(?, postal_code),
          country = COALESCE(?, country),
          siret = COALESCE(?, siret),
          tva_number = COALESCE(?, tva_number),
          logo_url = COALESCE(?, logo_url),
          iban = COALESCE(?, iban),
          bic = COALESCE(?, bic),
          bank_name = COALESCE(?, bank_name),
          payment_terms = COALESCE(?, payment_terms),
          default_tva_rate = COALESCE(?, default_tva_rate),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      full_name, business_name, phone, address, city, postal_code, country,
      siret, tva_number, logo_url, iban, bic, bank_name, payment_terms, default_tva_rate, id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = db.prepare(`
      SELECT id, email, full_name, business_name, phone, address, city, postal_code, country,
             siret, tva_number, logo_url, iban, bic, bank_name, payment_terms, default_tva_rate,
             created_at, updated_at
      FROM users WHERE id = ?
    `).get(id);

    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

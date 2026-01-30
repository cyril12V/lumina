import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from '../lib/db.js';

export interface ClientLink {
  id: string;
  client_id: string;
  user_id: string;
  event_type_id: string | null;
  template_id: string | null;
  token: string;
  expires_at: string | null;
  is_revoked: number;
  created_at: string;
  last_accessed_at: string | null;
}

export const tokenService = {
  /**
   * Generate a secure token for client access
   */
  generate(): string {
    const uuid = uuidv4();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `${uuid}-${randomBytes}`;
  },

  /**
   * Create a new client link
   */
  createLink(clientId: string, userId: string, expiresInDays?: number, eventTypeId?: string, templateId?: string): ClientLink {
    const id = uuidv4();
    const token = this.generate();
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const stmt = db.prepare(`
      INSERT INTO client_links (id, client_id, user_id, event_type_id, template_id, token, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, clientId, userId, eventTypeId || null, templateId || null, token, expiresAt);

    return {
      id,
      client_id: clientId,
      user_id: userId,
      event_type_id: eventTypeId || null,
      template_id: templateId || null,
      token,
      expires_at: expiresAt,
      is_revoked: 0,
      created_at: new Date().toISOString(),
      last_accessed_at: null
    };
  },

  /**
   * Validate a token and return the client link if valid
   */
  validate(token: string): ClientLink | null {
    const stmt = db.prepare(`
      SELECT * FROM client_links WHERE token = ?
    `);
    const link = stmt.get(token) as ClientLink | undefined;

    if (!link) return null;
    if (link.is_revoked) return null;
    if (link.expires_at && new Date(link.expires_at) < new Date()) return null;

    // Update last accessed
    const updateStmt = db.prepare(`
      UPDATE client_links SET last_accessed_at = datetime('now') WHERE id = ?
    `);
    updateStmt.run(link.id);

    return link;
  },

  /**
   * Get link by client ID
   */
  getByClientId(clientId: string): ClientLink | null {
    const stmt = db.prepare(`
      SELECT * FROM client_links
      WHERE client_id = ? AND is_revoked = 0
      ORDER BY created_at DESC
      LIMIT 1
    `);
    return stmt.get(clientId) as ClientLink | null;
  },

  /**
   * Get link by ID
   */
  getById(id: string): ClientLink | null {
    const stmt = db.prepare(`SELECT * FROM client_links WHERE id = ?`);
    return stmt.get(id) as ClientLink | null;
  },

  /**
   * Revoke a client link
   */
  revoke(linkId: string): boolean {
    const stmt = db.prepare(`
      UPDATE client_links SET is_revoked = 1 WHERE id = ?
    `);
    const result = stmt.run(linkId);
    return result.changes > 0;
  },

  /**
   * Revoke all links for a client
   */
  revokeAllForClient(clientId: string): number {
    const stmt = db.prepare(`
      UPDATE client_links SET is_revoked = 1 WHERE client_id = ?
    `);
    const result = stmt.run(clientId);
    return result.changes;
  },

  /**
   * Update link expiration
   */
  updateExpiration(linkId: string, expiresInDays: number | null): boolean {
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const stmt = db.prepare(`
      UPDATE client_links SET expires_at = ? WHERE id = ?
    `);
    const result = stmt.run(expiresAt, linkId);
    return result.changes > 0;
  },

  /**
   * Get all links for a user (photographer)
   */
  getAllForUser(userId: string): ClientLink[] {
    const stmt = db.prepare(`
      SELECT cl.*, c.name as client_name, c.email as client_email
      FROM client_links cl
      JOIN clients c ON cl.client_id = c.id
      WHERE cl.user_id = ?
      ORDER BY cl.created_at DESC
    `);
    return stmt.all(userId) as ClientLink[];
  }
};

export default tokenService;

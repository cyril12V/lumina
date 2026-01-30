import { v4 as uuidv4 } from 'uuid';
import db from '../lib/db.js';

export interface AuditLog {
  id: string;
  client_link_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: string | null;
  created_at: string;
}

export type AuditAction =
  | 'link_created'
  | 'link_accessed'
  | 'link_revoked'
  | 'questionnaire_viewed'
  | 'questionnaire_saved'
  | 'questionnaire_validated'
  | 'contract_generated'
  | 'contract_edited'
  | 'contract_validated'
  | 'contract_viewed'
  | 'contract_signed'
  | 'pdf_generated'
  | 'pdf_downloaded'
  | 'gallery_viewed'
  | 'gallery_visibility_changed'
  | 'data_exported';

interface AuditLogParams {
  clientLinkId?: string;
  userId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

async function logAudit(params: AuditLogParams): Promise<AuditLog> {
  const id = uuidv4();
  const metadataJson = params.metadata ? JSON.stringify(params.metadata) : null;

  const stmt = db.prepare(`
    INSERT INTO audit_logs (id, client_link_id, user_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await stmt.run(
    id,
    params.clientLinkId || null,
    params.userId || null,
    params.action,
    params.entityType || null,
    params.entityId || null,
    params.ipAddress || null,
    params.userAgent || null,
    metadataJson
  );

  return {
    id,
    client_link_id: params.clientLinkId || null,
    user_id: params.userId || null,
    action: params.action,
    entity_type: params.entityType || null,
    entity_id: params.entityId || null,
    ip_address: params.ipAddress || null,
    user_agent: params.userAgent || null,
    metadata: metadataJson,
    created_at: new Date().toISOString()
  };
}

export const auditService = {
  /**
   * Log an action
   */
  log: logAudit,

  /**
   * Log from Express request
   */
  async logFromRequest(
    req: { ip?: string; headers: Record<string, string | string[] | undefined> },
    params: Omit<AuditLogParams, 'ipAddress' | 'userAgent'>
  ): Promise<AuditLog> {
    return logAudit({
      ...params,
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
      userAgent: req.headers['user-agent']?.toString() || 'unknown'
    });
  },

  /**
   * Get audit trail for a client link
   */
  async getByClientLink(clientLinkId: string): Promise<AuditLog[]> {
    const stmt = db.prepare(`
      SELECT * FROM audit_logs
      WHERE client_link_id = ?
      ORDER BY created_at DESC
    `);
    return await stmt.all(clientLinkId) as AuditLog[];
  },

  /**
   * Get audit trail for a user (photographer)
   */
  async getByUser(userId: string, limit = 100): Promise<AuditLog[]> {
    const stmt = db.prepare(`
      SELECT * FROM audit_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return await stmt.all(userId, limit) as AuditLog[];
  },

  /**
   * Get audit trail for a specific entity
   */
  async getByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const stmt = db.prepare(`
      SELECT * FROM audit_logs
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at DESC
    `);
    return await stmt.all(entityType, entityId) as AuditLog[];
  },

  /**
   * Export audit trail for GDPR compliance
   */
  async exportForClient(clientLinkId: string): Promise<{
    logs: AuditLog[];
    exportedAt: string;
    clientLinkId: string;
  }> {
    const logs = await this.getByClientLink(clientLinkId);

    // Log the export action
    await logAudit({
      clientLinkId,
      action: 'data_exported',
      metadata: { logsCount: logs.length }
    });

    return {
      logs,
      exportedAt: new Date().toISOString(),
      clientLinkId
    };
  },

  /**
   * Get signature audit trail (for legal proof)
   */
  async getSignatureAuditTrail(contractId: string): Promise<{
    contract: AuditLog[];
    signature: AuditLog[];
  }> {
    const contractLogs = await this.getByEntity('contract', contractId);
    const signatureLogs = await this.getByEntity('signature', contractId);

    return {
      contract: contractLogs,
      signature: signatureLogs
    };
  },

  /**
   * Clean old logs (for GDPR - data minimization)
   */
  async cleanOldLogs(olderThanYears = 5): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - olderThanYears);

    const stmt = db.prepare(`
      DELETE FROM audit_logs
      WHERE created_at < ?
    `);
    const result = await stmt.run(cutoffDate.toISOString());
    return result.changes;
  }
};

export default auditService;

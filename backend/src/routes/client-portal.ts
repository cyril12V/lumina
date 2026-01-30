import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from '../lib/db.js';
import { tokenService, auditService, pdfService, emailService } from '../services/index.js';
import type { ClientLink } from '../services/token.service.js';

// Extend Request type
interface ClientPortalRequest extends Request {
  clientLink?: ClientLink;
}

export const clientPortalRouter = Router();

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE: Token Validation
// ═══════════════════════════════════════════════════════════════════

const validateToken = (req: ClientPortalRequest, res: Response, next: NextFunction) => {
  const { token } = req.params;

  const link = tokenService.validate(token);

  if (!link) {
    return res.status(404).json({
      error: 'Lien invalide ou expiré',
      code: 'INVALID_LINK'
    });
  }

  req.clientLink = link;

  // Log access
  auditService.logFromRequest(req, {
    clientLinkId: link.id,
    action: 'link_accessed'
  });

  next();
};

// ═══════════════════════════════════════════════════════════════════
// PORTAL ACCESS
// ═══════════════════════════════════════════════════════════════════

// Get portal info (client info, workflow state, photographer info)
clientPortalRouter.get('/:token', validateToken, (req: ClientPortalRequest, res: Response) => {
  try {
    const link = req.clientLink!;

    // Get client info
    const client = db.prepare(`
      SELECT id, name, email, phone FROM clients WHERE id = ?
    `).get(link.client_id) as any;

    // Get photographer info (public only)
    const photographer = db.prepare(`
      SELECT id, full_name, business_name, phone, email, logo_url
      FROM users WHERE id = ?
    `).get(link.user_id) as any;

    // Get questionnaire response
    const response = db.prepare(`
      SELECT qr.id, qr.event_type_id, qr.status, qr.validated_at, et.name as event_type_name
      FROM questionnaire_responses qr
      JOIN event_types et ON qr.event_type_id = et.id
      WHERE qr.client_link_id = ?
    `).get(link.id) as any;

    // Get contract
    const contract = db.prepare(`
      SELECT id, status, photographer_validated_at, pdf_path
      FROM generated_contracts
      WHERE client_link_id = ?
    `).get(link.id) as any;

    // Get signature if exists
    const signature = contract
      ? db.prepare(`
          SELECT id, signed_at FROM signatures
          WHERE contract_id = ? AND signer_type = 'client'
        `).get(contract.id)
      : null;

    // Get gallery if visible
    const gallery = db.prepare(`
      SELECT id, title, slug FROM galleries
      WHERE client_link_id = ? AND is_visible_to_client = 1
    `).get(link.id);

    // Determine workflow state
    let workflowState = 'questionnaire';
    let canSign = false;

    if (response?.status === 'validated') {
      workflowState = 'waiting_contract';
    }
    if (contract) {
      if (contract.status === 'pending_signature') {
        workflowState = 'sign_contract';
        canSign = true;
      } else if (contract.status === 'signed') {
        workflowState = 'completed';
      } else {
        workflowState = 'waiting_contract';
      }
    }
    if (gallery) {
      workflowState = 'gallery_available';
    }

    // Get pre-selected event type (from template or direct event_type_id)
    let preselectedEventType = null;
    let preselectedTemplate = null;

    // First check if there's a template_id
    if (link.template_id) {
      const template = db.prepare(`
        SELECT ct.id, ct.name, ct.event_type_id, et.name as event_type_name, et.icon
        FROM contract_templates ct
        LEFT JOIN event_types et ON ct.event_type_id = et.id
        WHERE ct.id = ?
      `).get(link.template_id) as any;

      if (template) {
        preselectedTemplate = {
          id: template.id,
          name: template.name
        };
        if (template.event_type_id) {
          preselectedEventType = {
            id: template.event_type_id,
            name: template.event_type_name,
            icon: template.icon
          };
        }
      }
    }

    // Fallback to direct event_type_id if no template
    if (!preselectedEventType && link.event_type_id) {
      const eventType = db.prepare('SELECT id, name, icon FROM event_types WHERE id = ?').get(link.event_type_id) as any;
      if (eventType) {
        preselectedEventType = {
          id: eventType.id,
          name: eventType.name,
          icon: eventType.icon
        };
      }
    }

    res.json({
      client: {
        name: client.name,
        email: client.email
      },
      photographer: {
        name: photographer.business_name || photographer.full_name,
        phone: photographer.phone,
        email: photographer.email,
        logo: photographer.logo_url
      },
      questionnaire: response ? {
        eventType: response.event_type_name,
        status: response.status,
        validatedAt: response.validated_at
      } : null,
      contract: contract ? {
        status: contract.status,
        hasPdf: !!contract.pdf_path,
        signedAt: signature ? (signature as any).signed_at : null
      } : null,
      gallery: gallery ? {
        title: (gallery as any).title
      } : null,
      preselectedEventType,
      preselectedTemplate,
      workflowState,
      canSign,
      linkExpiresAt: link.expires_at
    });
  } catch (error) {
    console.error('Get portal info error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// QUESTIONNAIRE
// ═══════════════════════════════════════════════════════════════════

// Get available event types
clientPortalRouter.get('/:token/event-types', validateToken, (req: ClientPortalRequest, res: Response) => {
  try {
    const link = req.clientLink!;

    // If link has a template_id, get the event_type from the template
    if (link.template_id) {
      const template = db.prepare('SELECT event_type_id FROM contract_templates WHERE id = ?').get(link.template_id) as any;
      if (template?.event_type_id) {
        const types = db.prepare(`
          SELECT id, name, icon FROM event_types
          WHERE id = ?
        `).all(template.event_type_id);
        return res.json(types);
      }
    }

    // If link has a specific event_type_id, only return that one
    if (link.event_type_id) {
      const types = db.prepare(`
        SELECT id, name, icon FROM event_types
        WHERE id = ?
      `).all(link.event_type_id);

      return res.json(types);
    }

    // Otherwise return all available event types
    const types = db.prepare(`
      SELECT id, name, icon FROM event_types
      WHERE user_id IS NULL OR user_id = ?
      ORDER BY is_system DESC, sort_order ASC, name ASC
    `).all(link.user_id);

    res.json(types);
  } catch (error) {
    console.error('Get event types error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Get questionnaire for an event type
clientPortalRouter.get('/:token/questionnaire/:eventTypeId', validateToken, (req: ClientPortalRequest, res: Response) => {
  try {
    const link = req.clientLink!;
    const { eventTypeId } = req.params;

    // Get questions
    const questions = db.prepare(`
      SELECT * FROM questionnaire_questions
      WHERE event_type_id = ?
      ORDER BY sort_order ASC
    `).all(eventTypeId);

    // Get existing response if any
    const existingResponse = db.prepare(`
      SELECT * FROM questionnaire_responses
      WHERE client_link_id = ? AND event_type_id = ?
    `).get(link.id, eventTypeId) as any;

    // Log view
    auditService.logFromRequest(req, {
      clientLinkId: link.id,
      action: 'questionnaire_viewed',
      entityType: 'questionnaire',
      entityId: eventTypeId
    });

    res.json({
      questions: questions.map((q: any) => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : null
      })),
      savedResponses: existingResponse ? JSON.parse(existingResponse.responses || '{}') : {},
      status: existingResponse?.status || 'new',
      isLocked: existingResponse?.status === 'validated'
    });
  } catch (error) {
    console.error('Get questionnaire error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Save questionnaire draft
clientPortalRouter.post('/:token/questionnaire/:eventTypeId/save', validateToken, (req: ClientPortalRequest, res: Response) => {
  try {
    const link = req.clientLink!;
    const { eventTypeId } = req.params;
    const { responses } = req.body;

    // Check if already validated
    const existing = db.prepare(`
      SELECT * FROM questionnaire_responses
      WHERE client_link_id = ? AND event_type_id = ?
    `).get(link.id, eventTypeId) as any;

    if (existing?.status === 'validated') {
      return res.status(403).json({ error: 'Le questionnaire a déjà été validé' });
    }

    const responsesJson = JSON.stringify(responses);

    if (existing) {
      db.prepare(`
        UPDATE questionnaire_responses
        SET responses = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(responsesJson, existing.id);
    } else {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO questionnaire_responses (id, client_link_id, event_type_id, responses, status)
        VALUES (?, ?, ?, ?, 'draft')
      `).run(id, link.id, eventTypeId, responsesJson);
    }

    auditService.logFromRequest(req, {
      clientLinkId: link.id,
      action: 'questionnaire_saved',
      entityType: 'questionnaire',
      entityId: eventTypeId
    });

    res.json({ success: true, message: 'Brouillon sauvegardé' });
  } catch (error) {
    console.error('Save questionnaire error:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
  }
});

// Validate questionnaire
clientPortalRouter.post('/:token/questionnaire/:eventTypeId/validate', validateToken, async (req: ClientPortalRequest, res: Response) => {
  try {
    const link = req.clientLink!;
    const { eventTypeId } = req.params;
    const { responses } = req.body;

    // Check if already validated
    const existing = db.prepare(`
      SELECT * FROM questionnaire_responses
      WHERE client_link_id = ? AND event_type_id = ?
    `).get(link.id, eventTypeId) as any;

    if (existing?.status === 'validated') {
      return res.status(403).json({ error: 'Le questionnaire a déjà été validé' });
    }

    // Validate required fields
    const questions = db.prepare(`
      SELECT * FROM questionnaire_questions
      WHERE event_type_id = ? AND is_required = 1
    `).all(eventTypeId) as any[];

    const missingFields = questions.filter(q => {
      const value = responses[q.id];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Veuillez remplir tous les champs obligatoires',
        missingFields: missingFields.map(q => q.question)
      });
    }

    const responsesJson = JSON.stringify(responses);
    const id = existing?.id || uuidv4();

    if (existing) {
      db.prepare(`
        UPDATE questionnaire_responses
        SET responses = ?, status = 'validated', validated_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(responsesJson, id);
    } else {
      db.prepare(`
        INSERT INTO questionnaire_responses (id, client_link_id, event_type_id, responses, status, validated_at)
        VALUES (?, ?, ?, ?, 'validated', datetime('now'))
      `).run(id, link.id, eventTypeId, responsesJson);
    }

    auditService.logFromRequest(req, {
      clientLinkId: link.id,
      action: 'questionnaire_validated',
      entityType: 'questionnaire',
      entityId: eventTypeId
    });

    // Notify photographer
    const photographer = db.prepare('SELECT * FROM users WHERE id = ?').get(link.user_id) as any;
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(link.client_id) as any;
    const eventType = db.prepare('SELECT * FROM event_types WHERE id = ?').get(eventTypeId) as any;

    if (photographer?.email) {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      await emailService.sendQuestionnaireValidated({
        photographerEmail: photographer.email,
        photographerName: photographer.full_name || 'Photographe',
        clientName: client.name,
        eventType: eventType.name,
        dashboardUrl: `${baseUrl}/dashboard/espace-client/${link.id}`
      });
    }

    res.json({
      success: true,
      message: 'Questionnaire validé avec succès'
    });
  } catch (error) {
    console.error('Validate questionnaire error:', error);
    res.status(500).json({ error: 'Erreur lors de la validation' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// CONTRACT
// ═══════════════════════════════════════════════════════════════════

// Get contract for viewing
clientPortalRouter.get('/:token/contract', validateToken, (req: ClientPortalRequest, res: Response) => {
  try {
    const link = req.clientLink!;

    const contract = db.prepare(`
      SELECT gc.*
      FROM generated_contracts gc
      WHERE gc.client_link_id = ?
    `).get(link.id) as any;

    if (!contract) {
      return res.status(404).json({ error: 'Contrat non disponible' });
    }

    if (contract.status === 'draft') {
      return res.status(403).json({ error: 'Contrat en cours de préparation' });
    }

    // Get signature if exists
    const signature = db.prepare(`
      SELECT id, signed_at FROM signatures
      WHERE contract_id = ? AND signer_type = 'client'
    `).get(contract.id);

    auditService.logFromRequest(req, {
      clientLinkId: link.id,
      action: 'contract_viewed',
      entityType: 'contract',
      entityId: contract.id
    });

    res.json({
      id: contract.id,
      content: contract.content,
      status: contract.status,
      hasPdf: !!contract.pdf_path,
      canSign: contract.status === 'pending_signature',
      signedAt: signature ? (signature as any).signed_at : null
    });
  } catch (error) {
    console.error('Get contract error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Download contract PDF
clientPortalRouter.get('/:token/contract/pdf', validateToken, (req: ClientPortalRequest, res: Response) => {
  try {
    const link = req.clientLink!;

    const contract = db.prepare(`
      SELECT gc.*, cl.user_id
      FROM generated_contracts gc
      JOIN client_links cl ON gc.client_link_id = cl.id
      WHERE gc.client_link_id = ?
    `).get(link.id) as any;

    if (!contract || !contract.pdf_path) {
      return res.status(404).json({ error: 'PDF non disponible' });
    }

    if (contract.status === 'draft') {
      return res.status(403).json({ error: 'Contrat en cours de préparation' });
    }

    const fileName = contract.status === 'signed' ? 'contract_signed.pdf' : `contract_v${contract.pdf_version}.pdf`;
    const pdfPath = pdfService.getPDFPath(contract.user_id, contract.id, fileName);

    if (!pdfPath) {
      return res.status(404).json({ error: 'Fichier PDF introuvable' });
    }

    auditService.logFromRequest(req, {
      clientLinkId: link.id,
      action: 'pdf_downloaded',
      entityType: 'contract',
      entityId: contract.id
    });

    res.download(pdfPath, 'contrat.pdf');
  } catch (error) {
    console.error('Download PDF error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Sign contract
clientPortalRouter.post('/:token/contract/sign', validateToken, async (req: ClientPortalRequest, res: Response) => {
  try {
    const link = req.clientLink!;
    const { signature_data } = req.body;

    if (!signature_data) {
      return res.status(400).json({ error: 'Signature requise' });
    }

    const contract = db.prepare(`
      SELECT gc.*, cl.user_id
      FROM generated_contracts gc
      JOIN client_links cl ON gc.client_link_id = cl.id
      WHERE gc.client_link_id = ?
    `).get(link.id) as any;

    if (!contract) {
      return res.status(404).json({ error: 'Contrat non trouvé' });
    }

    if (contract.status !== 'pending_signature') {
      return res.status(403).json({ error: 'Le contrat ne peut pas être signé' });
    }

    // Check if already signed
    const existingSignature = db.prepare(`
      SELECT * FROM signatures WHERE contract_id = ? AND signer_type = 'client'
    `).get(contract.id);

    if (existingSignature) {
      return res.status(403).json({ error: 'Contrat déjà signé' });
    }

    // Calculate document hash for integrity
    const pdfPath = contract.pdf_path;
    const documentHash = pdfPath ? pdfService.calculateHash(pdfPath) : crypto.createHash('sha256').update(contract.content).digest('hex');

    // Create signature
    const signatureId = uuidv4();
    const auditToken = uuidv4();
    const signedAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO signatures (id, contract_id, signer_type, signature_data, signed_at, ip_address, user_agent, document_hash, audit_token)
      VALUES (?, ?, 'client', ?, ?, ?, ?, ?, ?)
    `).run(
      signatureId,
      contract.id,
      signature_data,
      signedAt,
      req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
      req.headers['user-agent'] || 'unknown',
      documentHash,
      auditToken
    );

    // Update contract status
    db.prepare(`
      UPDATE generated_contracts
      SET status = 'signed', updated_at = datetime('now')
      WHERE id = ?
    `).run(contract.id);

    // Generate signed PDF
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(link.client_id) as any;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(link.user_id) as any;

    await pdfService.generateSignedPDF({
      userId: contract.user_id,
      contractId: contract.id,
      content: contract.content,
      photographerName: user.business_name || user.full_name || 'Photographe',
      photographerAddress: [user.address, user.postal_code, user.city].filter(Boolean).join(', '),
      photographerSiret: user.siret,
      clientName: client.name,
      clientAddress: [client.address, client.postal_code, client.city].filter(Boolean).join(', '),
      signatureData: signature_data,
      signedAt
    });

    auditService.logFromRequest(req, {
      clientLinkId: link.id,
      action: 'contract_signed',
      entityType: 'signature',
      entityId: contract.id,
      metadata: { signatureId, auditToken, documentHash }
    });

    // Notify photographer
    if (user?.email) {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      await emailService.sendContractSigned({
        photographerEmail: user.email,
        photographerName: user.full_name || 'Photographe',
        clientName: client.name,
        signedAt,
        dashboardUrl: `${baseUrl}/dashboard/espace-client/${link.id}`
      });
    }

    res.json({
      success: true,
      message: 'Contrat signé avec succès',
      signedAt,
      auditToken
    });
  } catch (error) {
    console.error('Sign contract error:', error);
    res.status(500).json({ error: 'Erreur lors de la signature' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GALLERY
// ═══════════════════════════════════════════════════════════════════

// Get gallery
clientPortalRouter.get('/:token/gallery', validateToken, (req: ClientPortalRequest, res: Response) => {
  try {
    const link = req.clientLink!;

    const gallery = db.prepare(`
      SELECT * FROM galleries
      WHERE client_link_id = ? AND is_visible_to_client = 1
    `).get(link.id) as any;

    if (!gallery) {
      return res.status(404).json({ error: 'Galerie non disponible' });
    }

    auditService.logFromRequest(req, {
      clientLinkId: link.id,
      action: 'gallery_viewed',
      entityType: 'gallery',
      entityId: gallery.id
    });

    // Get photos
    const photos = db.prepare(`
      SELECT id, filename, original_name, mime_type, sort_order
      FROM gallery_photos WHERE gallery_id = ?
      ORDER BY sort_order ASC, created_at ASC
    `).all(gallery.id);

    res.json({
      id: gallery.id,
      title: gallery.title,
      slug: gallery.slug,
      photos: photos.map((p: any) => ({
        id: p.id,
        original_name: p.original_name,
        url: `/api/client-portal/${req.params.token}/gallery/photos/${p.id}`
      }))
    });
  } catch (error) {
    console.error('Get gallery error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Serve a gallery photo for client portal
clientPortalRouter.get('/:token/gallery/photos/:photoId', validateToken, (req: ClientPortalRequest, res: Response) => {
  try {
    const link = req.clientLink!;
    const { photoId } = req.params;

    const gallery = db.prepare(`
      SELECT * FROM galleries WHERE client_link_id = ? AND is_visible_to_client = 1
    `).get(link.id) as any;

    if (!gallery) {
      return res.status(404).json({ error: 'Galerie non disponible' });
    }

    const photo = db.prepare('SELECT * FROM gallery_photos WHERE id = ? AND gallery_id = ?').get(photoId, gallery.id) as any;
    if (!photo) {
      return res.status(404).json({ error: 'Photo non trouvée' });
    }

    const path = require('path');
    const filePath = path.join(process.cwd(), 'data', 'uploads', 'galleries', gallery.id, photo.filename);

    res.setHeader('Content-Type', photo.mime_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(filePath);
  } catch (error) {
    console.error('Serve gallery photo error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GDPR DATA EXPORT
// ═══════════════════════════════════════════════════════════════════

// Export all client data (GDPR right to access)
clientPortalRouter.get('/:token/export', validateToken, (req: ClientPortalRequest, res: Response) => {
  try {
    const link = req.clientLink!;

    // Get all data
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(link.client_id);
    const questionnaire = db.prepare('SELECT * FROM questionnaire_responses WHERE client_link_id = ?').get(link.id);
    const contract = db.prepare('SELECT * FROM generated_contracts WHERE client_link_id = ?').get(link.id);
    const signatures = contract
      ? db.prepare('SELECT * FROM signatures WHERE contract_id = ?').all((contract as any).id)
      : [];
    const auditLogs = auditService.exportForClient(link.id);

    res.json({
      exportedAt: new Date().toISOString(),
      client,
      questionnaire: questionnaire ? {
        ...questionnaire,
        responses: JSON.parse((questionnaire as any).responses || '{}')
      } : null,
      contract,
      signatures,
      auditLogs: auditLogs.logs
    });
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default clientPortalRouter;

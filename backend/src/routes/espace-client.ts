import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../lib/db.js';
import { tokenService, auditService, pdfService, emailService } from '../services/index.js';

export const espaceClientRouter = Router();

// ═══════════════════════════════════════════════════════════════════
// CLIENT LINKS
// ═══════════════════════════════════════════════════════════════════

// Get all client links for a user
espaceClientRouter.get('/links', (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const links = db.prepare(`
      SELECT cl.*, c.name as client_name, c.email as client_email,
             qr.status as questionnaire_status,
             gc.status as contract_status
      FROM client_links cl
      JOIN clients c ON cl.client_id = c.id
      LEFT JOIN questionnaire_responses qr ON qr.client_link_id = cl.id
      LEFT JOIN generated_contracts gc ON gc.client_link_id = cl.id
      WHERE cl.user_id = ?
      ORDER BY cl.created_at DESC
    `).all(userId);

    res.json(links);
  } catch (error) {
    console.error('Get links error:', error);
    res.status(500).json({ error: 'Failed to get links' });
  }
});

// Create a client link
espaceClientRouter.post('/links', async (req, res) => {
  try {
    const { client_id, user_id, expires_in_days, send_email, event_type_id, template_id } = req.body;
    if (!client_id || !user_id) {
      return res.status(400).json({ error: 'client_id and user_id required' });
    }

    // If template_id is provided, get its event_type_id
    let effectiveEventTypeId = event_type_id;
    if (template_id && !event_type_id) {
      const template = db.prepare('SELECT event_type_id FROM contract_templates WHERE id = ?').get(template_id) as any;
      if (template?.event_type_id) {
        effectiveEventTypeId = template.event_type_id;
      }
    }

    // Create the link with template_id and event_type_id
    const link = tokenService.createLink(client_id, user_id, expires_in_days, effectiveEventTypeId, template_id);

    // Log the action
    auditService.logFromRequest(req, {
      userId: user_id,
      clientLinkId: link.id,
      action: 'link_created',
      entityType: 'client_link',
      entityId: link.id
    });

    // Send email if requested
    if (send_email) {
      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id) as any;
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id) as any;

      if (client?.email && user) {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        await emailService.sendQuestionnaireLink({
          clientEmail: client.email,
          clientName: client.name,
          photographerName: user.business_name || user.full_name || 'Votre photographe',
          linkUrl: `${baseUrl}/client/${link.token}`,
          expiresAt: link.expires_at || undefined
        });
      }
    }

    res.status(201).json(link);
  } catch (error) {
    console.error('Create link error:', error);
    res.status(500).json({ error: 'Failed to create link' });
  }
});

// Revoke a client link
espaceClientRouter.delete('/links/:id', (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId as string;

    const link = tokenService.getById(id);
    if (!link || link.user_id !== userId) {
      return res.status(404).json({ error: 'Link not found' });
    }

    tokenService.revoke(id);

    auditService.logFromRequest(req, {
      userId,
      clientLinkId: id,
      action: 'link_revoked',
      entityType: 'client_link',
      entityId: id
    });

    res.status(204).send();
  } catch (error) {
    console.error('Revoke link error:', error);
    res.status(500).json({ error: 'Failed to revoke link' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// EVENT TYPES
// ═══════════════════════════════════════════════════════════════════

// Get all event types (system + user's custom)
espaceClientRouter.get('/event-types', (req, res) => {
  try {
    const userId = req.query.userId as string;

    const types = db.prepare(`
      SELECT * FROM event_types
      WHERE user_id IS NULL OR user_id = ?
      ORDER BY is_system DESC, sort_order ASC, name ASC
    `).all(userId || '');

    res.json(types);
  } catch (error) {
    console.error('Get event types error:', error);
    res.status(500).json({ error: 'Failed to get event types' });
  }
});

// Create custom event type
espaceClientRouter.post('/event-types', (req, res) => {
  try {
    const { user_id, name, icon } = req.body;
    if (!user_id || !name) {
      return res.status(400).json({ error: 'user_id and name required' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO event_types (id, user_id, name, icon, is_system)
      VALUES (?, ?, ?, ?, 0)
    `).run(id, user_id, name, icon || 'calendar');

    const eventType = db.prepare('SELECT * FROM event_types WHERE id = ?').get(id);
    res.status(201).json(eventType);
  } catch (error) {
    console.error('Create event type error:', error);
    res.status(500).json({ error: 'Failed to create event type' });
  }
});

// Update event type
espaceClientRouter.put('/event-types/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, sort_order } = req.body;

    const existing = db.prepare('SELECT * FROM event_types WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Event type not found' });
    }

    db.prepare(`
      UPDATE event_types
      SET name = COALESCE(?, name),
          icon = COALESCE(?, icon),
          sort_order = COALESCE(?, sort_order)
      WHERE id = ?
    `).run(name, icon, sort_order, id);

    const updated = db.prepare('SELECT * FROM event_types WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Update event type error:', error);
    res.status(500).json({ error: 'Failed to update event type' });
  }
});

// Delete event type (custom only)
espaceClientRouter.delete('/event-types/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM event_types WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Event type not found' });
    }
    if (existing.is_system) {
      return res.status(403).json({ error: 'Cannot delete system event type' });
    }

    db.prepare('DELETE FROM event_types WHERE id = ?').run(id);
    res.status(204).send();
  } catch (error) {
    console.error('Delete event type error:', error);
    res.status(500).json({ error: 'Failed to delete event type' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// QUESTIONNAIRE QUESTIONS
// ═══════════════════════════════════════════════════════════════════

// Get questions for an event type
espaceClientRouter.get('/questions/:eventTypeId', (req, res) => {
  try {
    const { eventTypeId } = req.params;

    const questions = db.prepare(`
      SELECT * FROM questionnaire_questions
      WHERE event_type_id = ?
      ORDER BY sort_order ASC
    `).all(eventTypeId);

    res.json(questions);
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// QUESTIONNAIRE RESPONSES
// ═══════════════════════════════════════════════════════════════════

// Get questionnaire response for a client link
espaceClientRouter.get('/responses/:linkId', (req, res) => {
  try {
    const { linkId } = req.params;

    const response = db.prepare(`
      SELECT qr.*, et.name as event_type_name
      FROM questionnaire_responses qr
      JOIN event_types et ON qr.event_type_id = et.id
      WHERE qr.client_link_id = ?
    `).get(linkId);

    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    res.json({
      ...response,
      responses: JSON.parse((response as any).responses || '{}')
    });
  } catch (error) {
    console.error('Get response error:', error);
    res.status(500).json({ error: 'Failed to get response' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// CONTRACT TEMPLATES
// ═══════════════════════════════════════════════════════════════════

// Get all templates (system + user's custom)
espaceClientRouter.get('/templates', (req, res) => {
  try {
    const userId = req.query.userId as string;

    const templates = db.prepare(`
      SELECT ct.*, et.name as event_type_name
      FROM contract_templates ct
      LEFT JOIN event_types et ON ct.event_type_id = et.id
      WHERE ct.user_id IS NULL OR ct.user_id = ?
      ORDER BY ct.is_system DESC, ct.name ASC
    `).all(userId || '');

    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Get single template
espaceClientRouter.get('/templates/:id', (req, res) => {
  try {
    const { id } = req.params;

    const template = db.prepare(`
      SELECT ct.*, et.name as event_type_name
      FROM contract_templates ct
      LEFT JOIN event_types et ON ct.event_type_id = et.id
      WHERE ct.id = ?
    `).get(id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Create custom template
espaceClientRouter.post('/templates', (req, res) => {
  try {
    const { user_id, event_type_id, name, content, is_default } = req.body;
    if (!user_id || !name || !content) {
      return res.status(400).json({ error: 'user_id, name, and content required' });
    }

    const id = uuidv4();

    // If setting as default, unset other defaults for this user and event type
    if (is_default) {
      db.prepare(`
        UPDATE contract_templates
        SET is_default = 0
        WHERE user_id = ? AND event_type_id = ?
      `).run(user_id, event_type_id);
    }

    db.prepare(`
      INSERT INTO contract_templates (id, user_id, event_type_id, name, content, is_system, is_default)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(id, user_id, event_type_id || null, name, content, is_default ? 1 : 0);

    const template = db.prepare('SELECT * FROM contract_templates WHERE id = ?').get(id);
    res.status(201).json(template);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
espaceClientRouter.put('/templates/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, event_type_id, is_default } = req.body;

    const existing = db.prepare('SELECT * FROM contract_templates WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }
    if (existing.is_system) {
      return res.status(403).json({ error: 'Cannot modify system template' });
    }

    db.prepare(`
      UPDATE contract_templates
      SET name = COALESCE(?, name),
          content = COALESCE(?, content),
          event_type_id = COALESCE(?, event_type_id),
          is_default = COALESCE(?, is_default),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(name, content, event_type_id, is_default, id);

    const template = db.prepare('SELECT * FROM contract_templates WHERE id = ?').get(id);
    res.json(template);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template
espaceClientRouter.delete('/templates/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM contract_templates WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }
    if (existing.is_system) {
      return res.status(403).json({ error: 'Cannot delete system template' });
    }

    db.prepare('DELETE FROM contract_templates WHERE id = ?').run(id);
    res.status(204).send();
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// CUSTOM VARIABLES
// ═══════════════════════════════════════════════════════════════════

// List custom variables for a user
espaceClientRouter.get('/custom-variables', (req, res) => {
  try {
    const { userId } = req.query;
    const vars = db.prepare(
      'SELECT * FROM contract_custom_variables WHERE user_id = ? ORDER BY category ASC, sort_order ASC'
    ).all(userId);
    res.json(vars);
  } catch (error) {
    console.error('List custom variables error:', error);
    res.status(500).json({ error: 'Failed to list custom variables' });
  }
});

// Create custom variable
espaceClientRouter.post('/custom-variables', (req, res) => {
  try {
    const { user_id, var_key, label, default_value, category } = req.body;
    if (!user_id || !var_key || !label) {
      return res.status(400).json({ error: 'user_id, var_key and label are required' });
    }
    // Sanitize key: lowercase, no spaces, no special chars except underscores
    const sanitizedKey = var_key.toLowerCase().replace(/[^a-z0-9_àâäéèêëïîôùûüÿçœæ]/g, '_').replace(/_+/g, '_');

    // Check for duplicate key
    const existing = db.prepare(
      'SELECT id FROM contract_custom_variables WHERE user_id = ? AND var_key = ?'
    ).get(user_id, sanitizedKey);
    if (existing) {
      return res.status(409).json({ error: 'Une variable avec cette clé existe déjà' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO contract_custom_variables (id, user_id, var_key, label, default_value, category, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM contract_custom_variables WHERE user_id = ?))
    `).run(id, user_id, sanitizedKey, label, default_value || '', category || 'general', user_id);

    const variable = db.prepare('SELECT * FROM contract_custom_variables WHERE id = ?').get(id);
    res.status(201).json(variable);
  } catch (error) {
    console.error('Create custom variable error:', error);
    res.status(500).json({ error: 'Failed to create custom variable' });
  }
});

// Update custom variable
espaceClientRouter.put('/custom-variables/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { label, default_value, category } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (label !== undefined) { updates.push('label = ?'); params.push(label); }
    if (default_value !== undefined) { updates.push('default_value = ?'); params.push(default_value); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    db.prepare(`UPDATE contract_custom_variables SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const variable = db.prepare('SELECT * FROM contract_custom_variables WHERE id = ?').get(id);
    res.json(variable);
  } catch (error) {
    console.error('Update custom variable error:', error);
    res.status(500).json({ error: 'Failed to update custom variable' });
  }
});

// Delete custom variable
espaceClientRouter.delete('/custom-variables/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM contract_custom_variables WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete custom variable error:', error);
    res.status(500).json({ error: 'Failed to delete custom variable' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GENERATED CONTRACTS
// ═══════════════════════════════════════════════════════════════════

// Get contract for a client link
espaceClientRouter.get('/contracts/:linkId', (req, res) => {
  try {
    const { linkId } = req.params;

    const contract = db.prepare(`
      SELECT gc.*, ct.name as template_name
      FROM generated_contracts gc
      LEFT JOIN contract_templates ct ON gc.template_id = ct.id
      WHERE gc.client_link_id = ?
    `).get(linkId);

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Get signatures
    const signatures = db.prepare(`
      SELECT * FROM signatures WHERE contract_id = ?
    `).all((contract as any).id);

    res.json({ ...contract, signatures });
  } catch (error) {
    console.error('Get contract error:', error);
    res.status(500).json({ error: 'Failed to get contract' });
  }
});

// Generate contract from questionnaire
espaceClientRouter.post('/contracts/generate', (req, res) => {
  try {
    const { client_link_id, template_id, user_id } = req.body;
    if (!client_link_id || !user_id) {
      return res.status(400).json({ error: 'client_link_id and user_id required' });
    }

    // Get the link to check for pre-selected template
    const clientLink = db.prepare('SELECT template_id FROM client_links WHERE id = ?').get(client_link_id) as any;

    // Get questionnaire response
    const response = db.prepare(`
      SELECT qr.*, et.name as event_type_name
      FROM questionnaire_responses qr
      JOIN event_types et ON qr.event_type_id = et.id
      WHERE qr.client_link_id = ?
    `).get(client_link_id) as any;

    if (!response || response.status !== 'validated') {
      return res.status(400).json({ error: 'Questionnaire not validated' });
    }

    // Get template - priority: 1) explicit template_id, 2) link's template_id, 3) default for event type
    let template;
    const effectiveTemplateId = template_id || clientLink?.template_id;

    if (effectiveTemplateId) {
      template = db.prepare('SELECT * FROM contract_templates WHERE id = ?').get(effectiveTemplateId);
    } else {
      // Find default template for event type
      template = db.prepare(`
        SELECT * FROM contract_templates
        WHERE (event_type_id = ? OR event_type_id IS NULL)
          AND (user_id = ? OR user_id IS NULL)
        ORDER BY user_id DESC, event_type_id DESC, is_default DESC
        LIMIT 1
      `).get(response.event_type_id, user_id);
    }

    if (!template) {
      return res.status(400).json({ error: 'No template found' });
    }

    // Get client and user info for variable replacement
    const link = db.prepare(`
      SELECT cl.*, c.name as client_name, c.email as client_email, c.address as client_address,
             c.city as client_city, c.postal_code as client_postal_code
      FROM client_links cl
      JOIN clients c ON cl.client_id = c.id
      WHERE cl.id = ?
    `).get(client_link_id) as any;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id) as any;

    // Replace variables in template
    const responses = JSON.parse(response.responses || '{}');
    let content = (template as any).content;

    // Replace standard variables
    const photographerFullName = user.business_name || user.full_name || '';
    const photographerFullAddress = [user.address, user.postal_code, user.city].filter(Boolean).join(', ');
    const clientFullAddress = [link.client_address, link.client_postal_code, link.client_city].filter(Boolean).join(', ');

    content = content
      .replace(/\{\{client_name\}\}/g, link.client_name || '')
      .replace(/\{\{client_email\}\}/g, link.client_email || '')
      .replace(/\{\{client_address\}\}/g, clientFullAddress)
      .replace(/\{\{photographer_name\}\}/g, photographerFullName)
      .replace(/\{\{photographer_address\}\}/g, photographerFullAddress)
      .replace(/\{\{photographer_siret\}\}/g, user.siret || '')
      .replace(/\{\{photographer_phone\}\}/g, user.phone || '')
      .replace(/\{\{photographer_email\}\}/g, user.email || '')
      .replace(/\{\{event_type\}\}/g, response.event_type_name || '')
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('fr-FR'));

    // Replace questionnaire response variables by key
    for (const [key, value] of Object.entries(responses)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const displayValue = Array.isArray(value) ? (value as string[]).join(', ') : String(value);
      content = content.replace(regex, displayValue);
    }

    // Replace custom variables (with default values if no override)
    const customVars = db.prepare(
      'SELECT * FROM contract_custom_variables WHERE user_id = ?'
    ).all(user_id) as any[];
    for (const cv of customVars) {
      const regex = new RegExp(`\\{\\{${cv.var_key}\\}\\}`, 'g');
      content = content.replace(regex, cv.default_value || '');
    }

    // Build a summary of all questionnaire responses and append to the contract
    const questions = db.prepare(`
      SELECT * FROM questionnaire_questions WHERE event_type_id = ? ORDER BY sort_order ASC
    `).all(response.event_type_id) as any[];

    let summaryHtml = `<h3>ANNEXE - INFORMATIONS DU QUESTIONNAIRE</h3>`;
    summaryHtml += `<p><em>Type de projet : ${response.event_type_name}</em></p>`;
    summaryHtml += `<table style="width:100%;border-collapse:collapse;margin-top:10px;">`;

    for (const question of questions) {
      const answer = responses[question.question];
      if (answer !== undefined && answer !== null && answer !== '') {
        const displayAnswer = Array.isArray(answer) ? answer.join(', ') : String(answer);
        summaryHtml += `<tr style="border-bottom:1px solid #eee;">`;
        summaryHtml += `<td style="padding:8px 4px;font-weight:bold;vertical-align:top;width:40%;">${question.question}</td>`;
        summaryHtml += `<td style="padding:8px 4px;">${displayAnswer}</td>`;
        summaryHtml += `</tr>`;
      }
    }
    summaryHtml += `</table>`;

    content += summaryHtml;

    // Create contract
    const id = uuidv4();
    db.prepare(`
      INSERT INTO generated_contracts (id, client_link_id, template_id, content, status)
      VALUES (?, ?, ?, ?, 'draft')
    `).run(id, client_link_id, (template as any).id, content);

    auditService.logFromRequest(req, {
      userId: user_id,
      clientLinkId: client_link_id,
      action: 'contract_generated',
      entityType: 'contract',
      entityId: id,
      metadata: { templateId: (template as any).id }
    });

    const contract = db.prepare('SELECT * FROM generated_contracts WHERE id = ?').get(id);
    res.status(201).json(contract);
  } catch (error) {
    console.error('Generate contract error:', error);
    res.status(500).json({ error: 'Failed to generate contract' });
  }
});

// Update contract content
espaceClientRouter.put('/contracts/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { content, user_id } = req.body;

    const existing = db.prepare('SELECT * FROM generated_contracts WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    if (existing.status === 'signed') {
      return res.status(403).json({ error: 'Cannot modify signed contract' });
    }

    db.prepare(`
      UPDATE generated_contracts
      SET content = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(content, id);

    auditService.logFromRequest(req, {
      userId: user_id,
      clientLinkId: existing.client_link_id,
      action: 'contract_edited',
      entityType: 'contract',
      entityId: id
    });

    const contract = db.prepare('SELECT * FROM generated_contracts WHERE id = ?').get(id);
    res.json(contract);
  } catch (error) {
    console.error('Update contract error:', error);
    res.status(500).json({ error: 'Failed to update contract' });
  }
});

// Validate contract and generate PDF
espaceClientRouter.post('/contracts/:id/validate', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, send_email } = req.body;

    const contract = db.prepare(`
      SELECT gc.*, cl.client_id, cl.user_id as link_user_id
      FROM generated_contracts gc
      JOIN client_links cl ON gc.client_link_id = cl.id
      WHERE gc.id = ?
    `).get(id) as any;

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    if (contract.status === 'signed') {
      return res.status(403).json({ error: 'Contract already signed' });
    }

    // Get info for PDF
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(contract.client_id) as any;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id) as any;

    // Generate PDF
    const pdfResult = await pdfService.generatePDF({
      userId: user_id,
      contractId: id,
      content: contract.content,
      photographerName: user.business_name || user.full_name || 'Photographe',
      photographerAddress: [user.address, user.postal_code, user.city].filter(Boolean).join(', '),
      photographerSiret: user.siret,
      clientName: client.name,
      clientAddress: [client.address, client.postal_code, client.city].filter(Boolean).join(', '),
      version: contract.pdf_version || 1
    });

    // Update contract
    db.prepare(`
      UPDATE generated_contracts
      SET status = 'pending_signature',
          photographer_validated_at = datetime('now'),
          pdf_path = ?,
          pdf_version = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(pdfResult.filePath, pdfResult.version, id);

    auditService.logFromRequest(req, {
      userId: user_id,
      clientLinkId: contract.client_link_id,
      action: 'contract_validated',
      entityType: 'contract',
      entityId: id,
      metadata: { pdfHash: pdfResult.hash, pdfVersion: pdfResult.version }
    });

    // Send email if requested
    if (send_email && client.email) {
      const link = tokenService.getById(contract.client_link_id);
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      await emailService.sendContractReady({
        clientEmail: client.email,
        clientName: client.name,
        photographerName: user.business_name || user.full_name || 'Votre photographe',
        linkUrl: `${baseUrl}/client/${link?.token}`
      });
    }

    const updatedContract = db.prepare('SELECT * FROM generated_contracts WHERE id = ?').get(id);
    res.json({ ...updatedContract, pdfHash: pdfResult.hash });
  } catch (error) {
    console.error('Validate contract error:', error);
    res.status(500).json({ error: 'Failed to validate contract' });
  }
});

// Download PDF
espaceClientRouter.get('/contracts/:id/pdf', (req, res) => {
  try {
    const { id } = req.params;
    const version = req.query.version as string;

    const contract = db.prepare(`
      SELECT gc.*, cl.user_id
      FROM generated_contracts gc
      JOIN client_links cl ON gc.client_link_id = cl.id
      WHERE gc.id = ?
    `).get(id) as any;

    if (!contract || !contract.pdf_path) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    const fileName = version === 'signed' ? 'contract_signed.pdf' : `contract_v${contract.pdf_version}.pdf`;
    const pdfPath = pdfService.getPDFPath(contract.user_id, id, fileName);

    if (!pdfPath) {
      return res.status(404).json({ error: 'PDF file not found' });
    }

    res.download(pdfPath, `contrat_${id}.pdf`);
  } catch (error) {
    console.error('Download PDF error:', error);
    res.status(500).json({ error: 'Failed to download PDF' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════════════════════════

// Get audit trail for a client link
espaceClientRouter.get('/audit/:linkId', (req, res) => {
  try {
    const { linkId } = req.params;
    const logs = auditService.getByClientLink(linkId);
    res.json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// WORKFLOW STATUS
// ═══════════════════════════════════════════════════════════════════

// Get complete workflow status for a client
espaceClientRouter.get('/workflow/:linkId', (req, res) => {
  try {
    const { linkId } = req.params;

    const link = db.prepare(`
      SELECT cl.*, c.name as client_name, c.email as client_email
      FROM client_links cl
      JOIN clients c ON cl.client_id = c.id
      WHERE cl.id = ?
    `).get(linkId) as any;

    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const response = db.prepare(`
      SELECT qr.*, et.name as event_type_name
      FROM questionnaire_responses qr
      JOIN event_types et ON qr.event_type_id = et.id
      WHERE qr.client_link_id = ?
    `).get(linkId) as any;

    const contract = db.prepare(`
      SELECT gc.*, ct.name as template_name
      FROM generated_contracts gc
      LEFT JOIN contract_templates ct ON gc.template_id = ct.id
      WHERE gc.client_link_id = ?
    `).get(linkId) as any;

    const signatures = contract
      ? db.prepare('SELECT * FROM signatures WHERE contract_id = ?').all(contract.id)
      : [];

    const gallery = db.prepare(`
      SELECT * FROM galleries WHERE client_link_id = ?
    `).get(linkId);

    // Determine workflow state
    let workflowState = 'link_created';
    if (response) {
      workflowState = response.status === 'validated' ? 'questionnaire_validated' : 'questionnaire_draft';
    }
    if (contract) {
      if (contract.status === 'signed') {
        workflowState = 'contract_signed';
      } else if (contract.status === 'pending_signature') {
        workflowState = 'contract_ready';
      } else {
        workflowState = 'contract_draft';
      }
    }
    if (gallery && (gallery as any).is_visible_to_client) {
      workflowState = 'gallery_visible';
    }

    res.json({
      link,
      questionnaire: response ? {
        ...response,
        responses: JSON.parse(response.responses || '{}')
      } : null,
      contract: contract ? { ...contract, signatures } : null,
      gallery,
      workflowState
    });
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({ error: 'Failed to get workflow' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// GALLERY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

// List all galleries for a user
espaceClientRouter.get('/galleries', (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const galleries = db.prepare(`
      SELECT g.*,
        (SELECT COUNT(*) FROM gallery_photos gp WHERE gp.gallery_id = g.id) as photo_count,
        c.name as client_name
      FROM galleries g
      LEFT JOIN client_links cl ON g.client_link_id = cl.id
      LEFT JOIN clients c ON cl.client_id = c.id
      WHERE g.user_id = ?
      ORDER BY g.created_at DESC
    `).all(userId);

    res.json(galleries);
  } catch (error) {
    console.error('List galleries error:', error);
    res.status(500).json({ error: 'Failed to list galleries' });
  }
});

// Create a gallery
espaceClientRouter.post('/galleries', (req, res) => {
  try {
    const { user_id, client_link_id, session_id, title } = req.body;
    if (!user_id || !title) {
      return res.status(400).json({ error: 'user_id and title required' });
    }

    const id = uuidv4();
    const slug = title.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + id.slice(0, 6);

    db.prepare(`
      INSERT INTO galleries (id, user_id, session_id, client_link_id, title, slug)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, user_id, session_id || null, client_link_id || null, title, slug);

    const gallery = db.prepare('SELECT * FROM galleries WHERE id = ?').get(id);
    res.status(201).json(gallery);
  } catch (error) {
    console.error('Create gallery error:', error);
    res.status(500).json({ error: 'Failed to create gallery' });
  }
});

// Get a gallery with photos
espaceClientRouter.get('/galleries/:id', (req, res) => {
  try {
    const { id } = req.params;

    const gallery = db.prepare('SELECT * FROM galleries WHERE id = ?').get(id);
    if (!gallery) {
      return res.status(404).json({ error: 'Gallery not found' });
    }

    const photos = db.prepare(`
      SELECT * FROM gallery_photos WHERE gallery_id = ? ORDER BY sort_order ASC, created_at ASC
    `).all(id);

    res.json({ ...gallery, photos });
  } catch (error) {
    console.error('Get gallery error:', error);
    res.status(500).json({ error: 'Failed to get gallery' });
  }
});

// Update gallery
espaceClientRouter.put('/galleries/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, password, is_public, is_visible_to_client, expires_at } = req.body;

    const existing = db.prepare('SELECT * FROM galleries WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Gallery not found' });
    }

    db.prepare(`
      UPDATE galleries
      SET title = COALESCE(?, title),
          password = COALESCE(?, password),
          is_public = COALESCE(?, is_public),
          is_visible_to_client = COALESCE(?, is_visible_to_client),
          expires_at = COALESCE(?, expires_at)
      WHERE id = ?
    `).run(title, password, is_public, is_visible_to_client, expires_at, id);

    const updated = db.prepare('SELECT * FROM galleries WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Update gallery error:', error);
    res.status(500).json({ error: 'Failed to update gallery' });
  }
});

// Delete gallery
espaceClientRouter.delete('/galleries/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM galleries WHERE id = ?').run(id);
    res.status(204).send();
  } catch (error) {
    console.error('Delete gallery error:', error);
    res.status(500).json({ error: 'Failed to delete gallery' });
  }
});

// Add photos to gallery (base64 upload)
espaceClientRouter.post('/galleries/:id/photos', (req, res) => {
  try {
    const { id } = req.params;
    const { photos } = req.body; // Array of { data: base64, name: string, mime_type: string }

    const gallery = db.prepare('SELECT * FROM galleries WHERE id = ?').get(id) as any;
    if (!gallery) {
      return res.status(404).json({ error: 'Gallery not found' });
    }

    const fs = require('fs');
    const path = require('path');

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'data', 'uploads', 'galleries', id);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM gallery_photos WHERE gallery_id = ?').get(id) as any;
    let sortOrder = (maxOrder?.max || 0) + 1;

    const inserted: any[] = [];

    for (const photo of photos) {
      const photoId = uuidv4();
      const ext = photo.name?.split('.').pop() || 'jpg';
      const filename = `${photoId}.${ext}`;
      const filePath = path.join(uploadDir, filename);

      // Save file from base64
      const base64Data = photo.data.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

      const stats = fs.statSync(filePath);

      db.prepare(`
        INSERT INTO gallery_photos (id, gallery_id, filename, original_name, mime_type, size, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(photoId, id, filename, photo.name || filename, photo.mime_type || 'image/jpeg', stats.size, sortOrder);

      inserted.push({
        id: photoId,
        gallery_id: id,
        filename,
        original_name: photo.name || filename,
        mime_type: photo.mime_type || 'image/jpeg',
        size: stats.size,
        sort_order: sortOrder
      });

      sortOrder++;
    }

    res.status(201).json(inserted);
  } catch (error) {
    console.error('Upload photos error:', error);
    res.status(500).json({ error: 'Failed to upload photos' });
  }
});

// Get gallery photos
espaceClientRouter.get('/galleries/:id/photos', (req, res) => {
  try {
    const { id } = req.params;
    const photos = db.prepare(`
      SELECT * FROM gallery_photos WHERE gallery_id = ? ORDER BY sort_order ASC, created_at ASC
    `).all(id);
    res.json(photos);
  } catch (error) {
    console.error('Get photos error:', error);
    res.status(500).json({ error: 'Failed to get photos' });
  }
});

// Delete a photo
espaceClientRouter.delete('/galleries/:galleryId/photos/:photoId', (req, res) => {
  try {
    const { galleryId, photoId } = req.params;

    const photo = db.prepare('SELECT * FROM gallery_photos WHERE id = ? AND gallery_id = ?').get(photoId, galleryId) as any;
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Delete file
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), 'data', 'uploads', 'galleries', galleryId, photo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    db.prepare('DELETE FROM gallery_photos WHERE id = ?').run(photoId);
    res.status(204).send();
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// Serve gallery photo file
espaceClientRouter.get('/galleries/:galleryId/photos/:photoId/file', (req, res) => {
  try {
    const { galleryId, photoId } = req.params;

    const photo = db.prepare('SELECT * FROM gallery_photos WHERE id = ? AND gallery_id = ?').get(photoId, galleryId) as any;
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const path = require('path');
    const filePath = path.join(process.cwd(), 'data', 'uploads', 'galleries', galleryId, photo.filename);

    res.setHeader('Content-Type', photo.mime_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(filePath);
  } catch (error) {
    console.error('Serve photo error:', error);
    res.status(500).json({ error: 'Failed to serve photo' });
  }
});

// Toggle gallery visibility for client
espaceClientRouter.put('/gallery/:linkId/visibility', async (req, res) => {
  try {
    const { linkId } = req.params;
    const { is_visible, user_id, send_email } = req.body;

    const gallery = db.prepare(`
      SELECT g.*, cl.client_id, cl.token
      FROM galleries g
      JOIN client_links cl ON g.client_link_id = cl.id
      WHERE g.client_link_id = ?
    `).get(linkId) as any;

    if (!gallery) {
      return res.status(404).json({ error: 'Gallery not found' });
    }

    db.prepare(`
      UPDATE galleries SET is_visible_to_client = ? WHERE id = ?
    `).run(is_visible ? 1 : 0, gallery.id);

    auditService.logFromRequest(req, {
      userId: user_id,
      clientLinkId: linkId,
      action: 'gallery_visibility_changed',
      entityType: 'gallery',
      entityId: gallery.id,
      metadata: { isVisible: is_visible }
    });

    // Send email if making visible
    if (is_visible && send_email) {
      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(gallery.client_id) as any;
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id) as any;
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

      if (client?.email) {
        await emailService.sendGalleryReady({
          clientEmail: client.email,
          clientName: client.name,
          photographerName: user?.business_name || user?.full_name || 'Votre photographe',
          galleryName: gallery.title,
          linkUrl: `${baseUrl}/client/${gallery.token}`
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Toggle gallery visibility error:', error);
    res.status(500).json({ error: 'Failed to update gallery visibility' });
  }
});

export default espaceClientRouter;

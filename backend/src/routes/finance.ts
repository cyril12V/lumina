import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'lumina-secret-key-change-in-production';

// Middleware to verify JWT
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

// ============== DASHBOARD STATS ==============

// Get finance dashboard stats
router.get('/stats', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Revenue this month (paid invoices)
    const monthlyRevenue = db.prepare(`
      SELECT COALESCE(SUM(amount_paid), 0) as total
      FROM documents
      WHERE user_id = ? AND type = 'invoice'
      AND strftime('%Y', issue_date) = ?
      AND strftime('%m', issue_date) = ?
    `).get(userId, currentYear.toString(), currentMonth.toString().padStart(2, '0')) as any;

    // Revenue this year
    const yearlyRevenue = db.prepare(`
      SELECT COALESCE(SUM(amount_paid), 0) as total
      FROM documents
      WHERE user_id = ? AND type = 'invoice'
      AND strftime('%Y', issue_date) = ?
    `).get(userId, currentYear.toString()) as any;

    // Expenses this month
    const monthlyExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE user_id = ?
      AND strftime('%Y', expense_date) = ?
      AND strftime('%m', expense_date) = ?
    `).get(userId, currentYear.toString(), currentMonth.toString().padStart(2, '0')) as any;

    // Expenses this year
    const yearlyExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE user_id = ?
      AND strftime('%Y', expense_date) = ?
    `).get(userId, currentYear.toString()) as any;

    // Pending invoices (sent but not fully paid)
    const pendingInvoices = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_ttc - amount_paid), 0) as total
      FROM documents
      WHERE user_id = ? AND type = 'invoice'
      AND status IN ('sent', 'partial', 'overdue')
    `).get(userId) as any;

    // Pending quotes
    const pendingQuotes = db.prepare(`
      SELECT COUNT(*) as count
      FROM documents
      WHERE user_id = ? AND type = 'quote'
      AND status = 'sent'
    `).get(userId) as any;

    // Monthly data for chart (last 12 months)
    const monthlyData = db.prepare(`
      SELECT
        strftime('%Y-%m', issue_date) as month,
        COALESCE(SUM(amount_paid), 0) as revenue
      FROM documents
      WHERE user_id = ? AND type = 'invoice'
      AND issue_date >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', issue_date)
      ORDER BY month
    `).all(userId);

    res.json({
      monthlyRevenue: monthlyRevenue.total,
      yearlyRevenue: yearlyRevenue.total,
      monthlyExpenses: monthlyExpenses.total,
      yearlyExpenses: yearlyExpenses.total,
      monthlyProfit: monthlyRevenue.total - monthlyExpenses.total,
      yearlyProfit: yearlyRevenue.total - yearlyExpenses.total,
      pendingInvoicesCount: pendingInvoices.count,
      pendingInvoicesAmount: pendingInvoices.total,
      pendingQuotesCount: pendingQuotes.count,
      monthlyData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ============== DOCUMENTS (INVOICES & QUOTES) ==============

// Get all documents
router.get('/documents', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { type, status } = req.query;

    let query = `
      SELECT d.*, c.name as client_name, c.email as client_email
      FROM documents d
      LEFT JOIN clients c ON d.client_id = c.id
      WHERE d.user_id = ?
    `;
    const params: any[] = [userId];

    if (type) {
      query += ' AND d.type = ?';
      params.push(type);
    }
    if (status) {
      query += ' AND d.status = ?';
      params.push(status);
    }

    query += ' ORDER BY d.created_at DESC';

    const documents = db.prepare(query).all(...params);
    res.json(documents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

// Get single document with items and payments
router.get('/documents/:id', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const document = db.prepare(`
      SELECT d.*, c.name as client_name, c.email as client_email,
             c.address as client_address, c.city as client_city,
             c.postal_code as client_postal_code, c.siret as client_siret,
             c.tva_number as client_tva_number
      FROM documents d
      LEFT JOIN clients c ON d.client_id = c.id
      WHERE d.id = ? AND d.user_id = ?
    `).get(id, userId);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const items = db.prepare(`
      SELECT * FROM document_items WHERE document_id = ? ORDER BY sort_order
    `).all(id);

    const payments = db.prepare(`
      SELECT * FROM payments WHERE document_id = ? ORDER BY payment_date DESC
    `).all(id);

    res.json({ ...document, items, payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

// Generate next document number
const getNextDocumentNumber = (userId: string, type: string): string => {
  const prefix = type === 'invoice' ? 'FAC' : 'DEV';
  const year = new Date().getFullYear();

  const lastDoc = db.prepare(`
    SELECT number FROM documents
    WHERE user_id = ? AND type = ? AND number LIKE ?
    ORDER BY number DESC LIMIT 1
  `).get(userId, type, `${prefix}-${year}-%`) as any;

  let nextNum = 1;
  if (lastDoc) {
    const parts = lastDoc.number.split('-');
    nextNum = parseInt(parts[2] || '0') + 1;
  }

  return `${prefix}-${year}-${nextNum.toString().padStart(4, '0')}`;
};

// Create document
router.post('/documents', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { type, client_id, session_id, items, notes, payment_terms, due_date, valid_until } = req.body;

    if (!type || !['invoice', 'quote'].includes(type)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    const id = uuidv4();
    const number = getNextDocumentNumber(userId, type);

    // Calculate totals
    let subtotal_ht = 0;
    let total_tva = 0;

    const processedItems = (items || []).map((item: any, index: number) => {
      const quantity = item.quantity || 1;
      const unit_price = item.unit_price || 0;
      const discount_percent = item.discount_percent || 0;
      const tva_rate = item.tva_rate || 20;

      const line_ht = quantity * unit_price * (1 - discount_percent / 100);
      const line_tva = line_ht * (tva_rate / 100);
      const line_ttc = line_ht + line_tva;

      subtotal_ht += line_ht;
      total_tva += line_tva;

      return {
        id: uuidv4(),
        document_id: id,
        category: item.category || 'prestation',
        description: item.description,
        quantity,
        unit_price,
        discount_percent,
        tva_rate,
        total_ht: line_ht,
        total_ttc: line_ttc,
        sort_order: index
      };
    });

    const total_ttc = subtotal_ht + total_tva;

    // Get user's payment terms if not specified
    const user = db.prepare('SELECT payment_terms FROM users WHERE id = ?').get(userId) as any;

    // Insert document
    db.prepare(`
      INSERT INTO documents (id, user_id, client_id, session_id, type, number, status, notes, payment_terms, due_date, valid_until, subtotal_ht, total_tva, total_ttc)
      VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, client_id || null, session_id || null, type, number, notes || null, payment_terms || user?.payment_terms || null, due_date || null, valid_until || null, subtotal_ht, total_tva, total_ttc);

    // Insert items
    const insertItem = db.prepare(`
      INSERT INTO document_items (id, document_id, category, description, quantity, unit_price, discount_percent, tva_rate, total_ht, total_ttc, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of processedItems) {
      insertItem.run(item.id, item.document_id, item.category, item.description, item.quantity, item.unit_price, item.discount_percent, item.tva_rate, item.total_ht, item.total_ttc, item.sort_order);
    }

    res.status(201).json({ id, number });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update document
router.put('/documents/:id', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { client_id, session_id, items, notes, payment_terms, due_date, valid_until, status } = req.body;

    // Verify ownership
    const existing = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Recalculate totals if items provided
    let subtotal_ht = 0;
    let total_tva = 0;

    if (items) {
      // Delete existing items
      db.prepare('DELETE FROM document_items WHERE document_id = ?').run(id);

      // Insert new items
      const insertItem = db.prepare(`
        INSERT INTO document_items (id, document_id, category, description, quantity, unit_price, discount_percent, tva_rate, total_ht, total_ttc, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      items.forEach((item: any, index: number) => {
        const quantity = item.quantity || 1;
        const unit_price = item.unit_price || 0;
        const discount_percent = item.discount_percent || 0;
        const tva_rate = item.tva_rate || 20;

        const line_ht = quantity * unit_price * (1 - discount_percent / 100);
        const line_tva = line_ht * (tva_rate / 100);
        const line_ttc = line_ht + line_tva;

        subtotal_ht += line_ht;
        total_tva += line_tva;

        insertItem.run(uuidv4(), id, item.category || 'prestation', item.description, quantity, unit_price, discount_percent, tva_rate, line_ht, line_ttc, index);
      });
    }

    const total_ttc = subtotal_ht + total_tva;

    // Update document
    db.prepare(`
      UPDATE documents SET
        client_id = COALESCE(?, client_id),
        session_id = COALESCE(?, session_id),
        notes = COALESCE(?, notes),
        payment_terms = COALESCE(?, payment_terms),
        due_date = COALESCE(?, due_date),
        valid_until = COALESCE(?, valid_until),
        status = COALESCE(?, status),
        subtotal_ht = ?,
        total_tva = ?,
        total_ttc = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(client_id, session_id, notes, payment_terms, due_date, valid_until, status, items ? subtotal_ht : (existing as any).subtotal_ht, items ? total_tva : (existing as any).total_tva, items ? total_ttc : (existing as any).total_ttc, id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
router.delete('/documents/:id', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').run(id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Convert quote to invoice
router.post('/documents/:id/convert', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const quote = db.prepare(`
      SELECT * FROM documents WHERE id = ? AND user_id = ? AND type = 'quote'
    `).get(id, userId) as any;

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const invoiceId = uuidv4();
    const invoiceNumber = getNextDocumentNumber(userId, 'invoice');

    // Create invoice from quote
    db.prepare(`
      INSERT INTO documents (id, user_id, client_id, session_id, type, number, status, notes, payment_terms, subtotal_ht, total_tva, total_ttc)
      VALUES (?, ?, ?, ?, 'invoice', ?, 'draft', ?, ?, ?, ?, ?)
    `).run(invoiceId, userId, quote.client_id, quote.session_id, invoiceNumber, quote.notes, quote.payment_terms, quote.subtotal_ht, quote.total_tva, quote.total_ttc);

    // Copy items
    const items = db.prepare('SELECT * FROM document_items WHERE document_id = ?').all(id);
    const insertItem = db.prepare(`
      INSERT INTO document_items (id, document_id, category, description, quantity, unit_price, discount_percent, tva_rate, total_ht, total_ttc, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items as any[]) {
      insertItem.run(uuidv4(), invoiceId, item.category, item.description, item.quantity, item.unit_price, item.discount_percent, item.tva_rate, item.total_ht, item.total_ttc, item.sort_order);
    }

    // Update quote status
    db.prepare("UPDATE documents SET status = 'accepted' WHERE id = ?").run(id);

    res.json({ id: invoiceId, number: invoiceNumber });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to convert quote' });
  }
});

// ============== PAYMENTS ==============

// Add payment to document
router.post('/documents/:id/payments', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { amount, payment_date, payment_method, reference, notes } = req.body;

    // Verify document ownership
    const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const paymentId = uuidv4();
    db.prepare(`
      INSERT INTO payments (id, document_id, amount, payment_date, payment_method, reference, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(paymentId, id, amount, payment_date || new Date().toISOString().split('T')[0], payment_method || 'virement', reference || null, notes || null);

    // Update document amount_paid and status
    const newAmountPaid = doc.amount_paid + amount;
    let newStatus = doc.status;

    if (newAmountPaid >= doc.total_ttc) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }

    db.prepare(`
      UPDATE documents SET amount_paid = ?, status = ?, updated_at = datetime('now') WHERE id = ?
    `).run(newAmountPaid, newStatus, id);

    res.status(201).json({ id: paymentId, newAmountPaid, newStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add payment' });
  }
});

// Delete payment
router.delete('/payments/:id', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // Get payment and verify document ownership
    const payment = db.prepare(`
      SELECT p.*, d.user_id, d.amount_paid, d.total_ttc
      FROM payments p
      JOIN documents d ON p.document_id = d.id
      WHERE p.id = ?
    `).get(id) as any;

    if (!payment || payment.user_id !== userId) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Delete payment
    db.prepare('DELETE FROM payments WHERE id = ?').run(id);

    // Update document
    const newAmountPaid = payment.amount_paid - payment.amount;
    let newStatus = 'sent';
    if (newAmountPaid >= payment.total_ttc) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }

    db.prepare(`
      UPDATE documents SET amount_paid = ?, status = ?, updated_at = datetime('now') WHERE id = ?
    `).run(newAmountPaid, newStatus, payment.document_id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

// ============== EXPENSES ==============

// Get all expenses
router.get('/expenses', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { year, month, category } = req.query;

    let query = 'SELECT * FROM expenses WHERE user_id = ?';
    const params: any[] = [userId];

    if (year) {
      query += " AND strftime('%Y', expense_date) = ?";
      params.push(year);
    }
    if (month) {
      query += " AND strftime('%m', expense_date) = ?";
      params.push(month.toString().padStart(2, '0'));
    }
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY expense_date DESC';

    const expenses = db.prepare(query).all(...params);
    res.json(expenses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
});

// Create expense
router.post('/expenses', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { category, description, amount, tva_rate, expense_date, receipt_url, notes } = req.body;

    const id = uuidv4();
    db.prepare(`
      INSERT INTO expenses (id, user_id, category, description, amount, tva_rate, expense_date, receipt_url, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, category || 'autre', description, amount, tva_rate || 20, expense_date || new Date().toISOString().split('T')[0], receipt_url || null, notes || null);

    res.status(201).json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Update expense
router.put('/expenses/:id', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { category, description, amount, tva_rate, expense_date, receipt_url, notes } = req.body;

    const result = db.prepare(`
      UPDATE expenses SET
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        amount = COALESCE(?, amount),
        tva_rate = COALESCE(?, tva_rate),
        expense_date = COALESCE(?, expense_date),
        receipt_url = COALESCE(?, receipt_url),
        notes = COALESCE(?, notes)
      WHERE id = ? AND user_id = ?
    `).run(category, description, amount, tva_rate, expense_date, receipt_url, notes, id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Delete expense
router.delete('/expenses/:id', (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const result = db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

export { router as financeRouter };

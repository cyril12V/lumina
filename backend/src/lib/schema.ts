/**
 * Schéma SQLite de Lumina.
 *
 * Toutes les instructions sont idempotentes (IF NOT EXISTS) : elles sont
 * appliquées au démarrage pour qu'une base vide soit initialisée
 * automatiquement, sans étape manuelle.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    client_link_id TEXT,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_link_id) REFERENCES client_links(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

CREATE TABLE IF NOT EXISTS availability_slots (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    user_id TEXT,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    user_id TEXT,
    session_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT DEFAULT 'busy',
    start_datetime TEXT NOT NULL,
    end_datetime TEXT NOT NULL,
    all_day INTEGER DEFAULT 0,
    location TEXT,
    color TEXT,
    is_visible_to_clients INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
  );

CREATE TABLE IF NOT EXISTS client_links (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT,
    is_revoked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    last_accessed_at TEXT, event_type_id TEXT REFERENCES event_types(id) ON DELETE SET NULL, template_id TEXT REFERENCES contract_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'France',
    siret TEXT,
    tva_number TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS contract_custom_variables (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    var_key TEXT NOT NULL,
    label TEXT NOT NULL,
    default_value TEXT DEFAULT '',
    category TEXT DEFAULT 'general',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS contract_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    event_type_id TEXT,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_system INTEGER DEFAULT 0,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE SET NULL
  );

CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    client_id TEXT,
    session_id TEXT,
    title TEXT NOT NULL,
    content TEXT,
    status TEXT DEFAULT 'draft',
    signed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
  );

CREATE TABLE IF NOT EXISTS document_items (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    category TEXT DEFAULT 'prestation' CHECK (category IN ('prestation', 'produit')),
    description TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    unit_price REAL NOT NULL,
    discount_percent REAL DEFAULT 0,
    tva_rate REAL DEFAULT 20,
    total_ht REAL NOT NULL,
    total_ttc REAL NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    client_id TEXT,
    session_id TEXT,
    type TEXT NOT NULL CHECK (type IN ('invoice', 'quote')),
    number TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'paid', 'partial', 'overdue', 'cancelled')),
    issue_date TEXT DEFAULT (date('now')),
    due_date TEXT,
    valid_until TEXT,
    notes TEXT,
    payment_terms TEXT,
    subtotal_ht REAL DEFAULT 0,
    total_tva REAL DEFAULT 0,
    total_ttc REAL DEFAULT 0,
    amount_paid REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
  );

CREATE TABLE IF NOT EXISTS event_types (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'calendar',
    is_system INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category TEXT DEFAULT 'autre',
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    tva_rate REAL DEFAULT 20,
    expense_date TEXT DEFAULT (date('now')),
    receipt_url TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS galleries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_id TEXT,
    client_link_id TEXT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    password TEXT,
    is_public INTEGER DEFAULT 0,
    is_visible_to_client INTEGER DEFAULT 0,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
  );

CREATE TABLE IF NOT EXISTS gallery_photos (
    id TEXT PRIMARY KEY,
    gallery_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT DEFAULT 'image/jpeg',
    size INTEGER DEFAULT 0,
    width INTEGER,
    height INTEGER,
    sort_order INTEGER DEFAULT 0,
    is_cover INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (gallery_id) REFERENCES galleries(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS generated_contracts (
    id TEXT PRIMARY KEY,
    client_link_id TEXT NOT NULL,
    template_id TEXT,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'signed')),
    photographer_validated_at TEXT,
    pdf_path TEXT,
    pdf_version INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_link_id) REFERENCES client_links(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES contract_templates(id) ON DELETE SET NULL
  );

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT,
    link TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_date TEXT DEFAULT (date('now')),
    payment_method TEXT DEFAULT 'virement' CHECK (payment_method IN ('virement', 'cheque', 'especes', 'carte', 'autre')),
    reference TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS questionnaire_questions (
    id TEXT PRIMARY KEY,
    event_type_id TEXT NOT NULL,
    question TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'date', 'time', 'datetime', 'select', 'checkbox', 'radio', 'number', 'email', 'phone')),
    options TEXT,
    is_required INTEGER DEFAULT 0,
    placeholder TEXT,
    help_text TEXT,
    sort_order INTEGER DEFAULT 0,
    condition_field TEXT,
    condition_value TEXT,
    FOREIGN KEY (event_type_id) REFERENCES event_types(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS questionnaire_responses (
    id TEXT PRIMARY KEY,
    client_link_id TEXT NOT NULL,
    event_type_id TEXT NOT NULL,
    responses TEXT NOT NULL DEFAULT '{}',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'validated')),
    validated_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_link_id) REFERENCES client_links(id) ON DELETE CASCADE,
    FOREIGN KEY (event_type_id) REFERENCES event_types(id)
  );

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    client_id TEXT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT DEFAULT 'portrait',
    status TEXT DEFAULT 'pending',
    location TEXT,
    notes TEXT,
    price REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
  );

CREATE TABLE IF NOT EXISTS signatures (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL,
    signer_type TEXT NOT NULL CHECK (signer_type IN ('client', 'photographer')),
    signature_data TEXT NOT NULL,
    signed_at TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    document_hash TEXT NOT NULL,
    audit_token TEXT UNIQUE NOT NULL,
    FOREIGN KEY (contract_id) REFERENCES generated_contracts(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS task_comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS task_templates (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    default_duration_minutes INTEGER DEFAULT 60,
    default_assignee_role TEXT,
    category TEXT DEFAULT 'general',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    session_id TEXT,
    workflow_step_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    assigned_to TEXT,
    created_by TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    deadline TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS team_invitations (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    invited_by TEXT NOT NULL,
    accepted_at TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'photographer' CHECK (role IN ('owner', 'admin', 'photographer', 'retoucher', 'assistant')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    max_members INTEGER DEFAULT 4,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    business_name TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'France',
    siret TEXT,
    tva_number TEXT,
    logo_url TEXT,
    iban TEXT,
    bic TEXT,
    bank_name TEXT,
    payment_terms TEXT DEFAULT 'Paiement à 30 jours',
    default_tva_rate REAL DEFAULT 20,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

CREATE TABLE IF NOT EXISTS workflow_steps (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    task_template_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 60,
    assignee_role TEXT,
    delay_days INTEGER DEFAULT 0,
    depends_on_step_id TEXT,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (workflow_id) REFERENCES workflow_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (task_template_id) REFERENCES task_templates(id) ON DELETE SET NULL
  );

CREATE TABLE IF NOT EXISTS workflow_templates (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    trigger_event TEXT DEFAULT 'manual',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
  );

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_link ON audit_logs(client_link_id);

CREATE INDEX IF NOT EXISTS idx_client_links_client ON client_links(client_id);

CREATE INDEX IF NOT EXISTS idx_client_links_token ON client_links(token);

CREATE INDEX IF NOT EXISTS idx_client_links_user ON client_links(user_id);

CREATE INDEX IF NOT EXISTS idx_contract_templates_event ON contract_templates(event_type_id);

CREATE INDEX IF NOT EXISTS idx_contract_templates_user ON contract_templates(user_id);

CREATE INDEX IF NOT EXISTS idx_custom_vars_user ON contract_custom_variables(user_id);

CREATE INDEX IF NOT EXISTS idx_document_items_document_id ON document_items(document_id);

CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);

CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);

CREATE INDEX IF NOT EXISTS idx_event_types_user ON event_types(user_id);

CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);

CREATE INDEX IF NOT EXISTS idx_gallery_photos_gallery ON gallery_photos(gallery_id);

CREATE INDEX IF NOT EXISTS idx_generated_contracts_link ON generated_contracts(client_link_id);

CREATE INDEX IF NOT EXISTS idx_payments_document_id ON payments(document_id);

CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_link ON questionnaire_responses(client_link_id);

CREATE INDEX IF NOT EXISTS idx_signatures_contract ON signatures(contract_id);
`;

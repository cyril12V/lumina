-- ═══════════════════════════════════════════════════════════════════
-- LUMINA - Schéma PostgreSQL pour Supabase
-- ═══════════════════════════════════════════════════════════════════

-- Users table (profil complet)
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions (shootings) table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT DEFAULT 'portrait',
  status TEXT DEFAULT 'pending',
  location TEXT,
  notes TEXT,
  price REAL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_members INTEGER DEFAULT 4,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Team members
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'photographer' CHECK (role IN ('owner', 'admin', 'photographer', 'retoucher', 'assistant')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Team invitations
CREATE TABLE IF NOT EXISTS team_invitations (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  invited_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Types d'événements
CREATE TABLE IF NOT EXISTS event_types (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'calendar',
  is_system BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contract templates
CREATE TABLE IF NOT EXISTS contract_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  event_type_id TEXT REFERENCES event_types(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Liens clients sécurisés
CREATE TABLE IF NOT EXISTS client_links (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type_id TEXT REFERENCES event_types(id) ON DELETE SET NULL,
  template_id TEXT REFERENCES contract_templates(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP
);

-- Galleries table
CREATE TABLE IF NOT EXISTS galleries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  client_link_id TEXT REFERENCES client_links(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  password TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  is_visible_to_client BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Gallery photos
CREATE TABLE IF NOT EXISTS gallery_photos (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT,
  mime_type TEXT DEFAULT 'image/jpeg',
  size INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contracts table (legacy)
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'draft',
  signed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Documents (factures et devis)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('invoice', 'quote')),
  number TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'paid', 'partial', 'overdue', 'cancelled')),
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  valid_until DATE,
  notes TEXT,
  payment_terms TEXT,
  subtotal_ht REAL DEFAULT 0,
  total_tva REAL DEFAULT 0,
  total_ttc REAL DEFAULT 0,
  amount_paid REAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Document line items
CREATE TABLE IF NOT EXISTS document_items (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  category TEXT DEFAULT 'prestation' CHECK (category IN ('prestation', 'produit')),
  description TEXT NOT NULL,
  quantity REAL DEFAULT 1,
  unit_price REAL NOT NULL,
  discount_percent REAL DEFAULT 0,
  tva_rate REAL DEFAULT 20,
  total_ht REAL NOT NULL,
  total_ttc REAL NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'virement' CHECK (payment_method IN ('virement', 'cheque', 'especes', 'carte', 'autre')),
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT DEFAULT 'autre',
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  tva_rate REAL DEFAULT 20,
  expense_date DATE DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Questions par type d'événement
CREATE TABLE IF NOT EXISTS questionnaire_questions (
  id TEXT PRIMARY KEY,
  event_type_id TEXT NOT NULL REFERENCES event_types(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'date', 'time', 'datetime', 'select', 'checkbox', 'radio', 'number', 'email', 'phone')),
  options TEXT,
  is_required BOOLEAN DEFAULT FALSE,
  placeholder TEXT,
  help_text TEXT,
  sort_order INTEGER DEFAULT 0,
  condition_field TEXT,
  condition_value TEXT
);

-- Réponses questionnaire client
CREATE TABLE IF NOT EXISTS questionnaire_responses (
  id TEXT PRIMARY KEY,
  client_link_id TEXT NOT NULL REFERENCES client_links(id) ON DELETE CASCADE,
  event_type_id TEXT NOT NULL REFERENCES event_types(id),
  responses TEXT NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'validated')),
  validated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Contrats générés
CREATE TABLE IF NOT EXISTS generated_contracts (
  id TEXT PRIMARY KEY,
  client_link_id TEXT NOT NULL REFERENCES client_links(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES contract_templates(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'signed')),
  photographer_validated_at TIMESTAMP,
  pdf_path TEXT,
  pdf_version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Signatures électroniques
CREATE TABLE IF NOT EXISTS signatures (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES generated_contracts(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL CHECK (signer_type IN ('client', 'photographer')),
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMP NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  document_hash TEXT NOT NULL,
  audit_token TEXT UNIQUE NOT NULL
);

-- Journal d'audit (RGPD)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  client_link_id TEXT REFERENCES client_links(id) ON DELETE SET NULL,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  workflow_step_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  estimated_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  deadline TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Task comments
CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Task templates
CREATE TABLE IF NOT EXISTS task_templates (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_duration_minutes INTEGER DEFAULT 60,
  default_assignee_role TEXT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workflow templates
CREATE TABLE IF NOT EXISTS workflow_templates (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workflow steps
CREATE TABLE IF NOT EXISTS workflow_steps (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  task_template_id TEXT REFERENCES task_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 60,
  assignee_role TEXT,
  delay_days INTEGER DEFAULT 0,
  depends_on_step_id TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT REFERENCES sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'busy',
  start_datetime TIMESTAMP NOT NULL,
  end_datetime TIMESTAMP NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  color TEXT,
  is_visible_to_clients BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Availability slots
CREATE TABLE IF NOT EXISTS availability_slots (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Variables personnalisées pour les contrats
CREATE TABLE IF NOT EXISTS contract_custom_variables (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  var_key TEXT NOT NULL,
  label TEXT NOT NULL,
  default_value TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_document_items_document_id ON document_items(document_id);
CREATE INDEX IF NOT EXISTS idx_payments_document_id ON payments(document_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_client_links_token ON client_links(token);
CREATE INDEX IF NOT EXISTS idx_client_links_client ON client_links(client_id);
CREATE INDEX IF NOT EXISTS idx_client_links_user ON client_links(user_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_link ON questionnaire_responses(client_link_id);
CREATE INDEX IF NOT EXISTS idx_generated_contracts_link ON generated_contracts(client_link_id);
CREATE INDEX IF NOT EXISTS idx_signatures_contract ON signatures(contract_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_link ON audit_logs(client_link_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_event_types_user ON event_types(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_gallery ON gallery_photos(gallery_id);
CREATE INDEX IF NOT EXISTS idx_contract_templates_user ON contract_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_templates_event ON contract_templates(event_type_id);
CREATE INDEX IF NOT EXISTS idx_custom_vars_user ON contract_custom_variables(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_team ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- ═══════════════════════════════════════════════════════════════════
-- SEED DATA (Types d'événements système)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO event_types (id, user_id, name, icon, is_system, sort_order) VALUES
  ('evt_mariage', NULL, 'Mariage', 'heart', TRUE, 1),
  ('evt_fiancailles', NULL, 'Fiançailles', 'heart', TRUE, 2),
  ('evt_portrait', NULL, 'Portrait', 'user', TRUE, 3),
  ('evt_entreprise', NULL, 'Entreprise', 'briefcase', TRUE, 4),
  ('evt_evenement', NULL, 'Événement', 'calendar', TRUE, 5),
  ('evt_famille', NULL, 'Famille', 'users', TRUE, 6),
  ('evt_grossesse', NULL, 'Grossesse & Naissance', 'baby', TRUE, 7),
  ('evt_immobilier', NULL, 'Immobilier', 'home', TRUE, 8),
  ('evt_produit', NULL, 'Produit', 'package', TRUE, 9)
ON CONFLICT (id) DO NOTHING;

-- Questions Mariage
INSERT INTO questionnaire_questions (id, event_type_id, question, field_type, options, is_required, placeholder, help_text, sort_order) VALUES
  ('q_mar_1', 'evt_mariage', 'Date du mariage', 'date', NULL, TRUE, NULL, NULL, 1),
  ('q_mar_2', 'evt_mariage', 'Lieu de la cérémonie', 'text', NULL, TRUE, 'Église, mairie, lieu de culte...', NULL, 2),
  ('q_mar_3', 'evt_mariage', 'Lieu de la réception', 'text', NULL, TRUE, 'Château, domaine, restaurant...', NULL, 3),
  ('q_mar_4', 'evt_mariage', 'Heure de début prévue', 'time', NULL, TRUE, NULL, NULL, 4),
  ('q_mar_5', 'evt_mariage', 'Nombre d''invités approximatif', 'number', NULL, FALSE, NULL, NULL, 5),
  ('q_mar_6', 'evt_mariage', 'Préparatifs à photographier ?', 'radio', '["Mariée uniquement", "Marié uniquement", "Les deux", "Non"]', TRUE, NULL, NULL, 6),
  ('q_mar_7', 'evt_mariage', 'Souhaitez-vous une séance couple ?', 'radio', '["Oui, avant le mariage", "Oui, le jour J", "Oui, après (day after)", "Non"]', FALSE, NULL, NULL, 7),
  ('q_mar_8', 'evt_mariage', 'Avez-vous un thème ou style particulier ?', 'textarea', NULL, FALSE, 'Décrivez l''ambiance souhaitée...', NULL, 8),
  ('q_mar_9', 'evt_mariage', 'Y a-t-il d''autres prestataires à coordonner ?', 'textarea', NULL, FALSE, 'Vidéaste, DJ, wedding planner...', NULL, 9),
  ('q_mar_10', 'evt_mariage', 'Des moments spéciaux à ne pas manquer ?', 'textarea', NULL, FALSE, NULL, 'Surprise, danse spéciale, tradition...', 10)
ON CONFLICT (id) DO NOTHING;

-- Questions Portrait
INSERT INTO questionnaire_questions (id, event_type_id, question, field_type, options, is_required, placeholder, help_text, sort_order) VALUES
  ('q_por_1', 'evt_portrait', 'Type de portrait souhaité', 'select', '["Portrait professionnel", "Portrait artistique", "Portrait corporate", "Book mannequin/acteur", "Portrait personnel"]', TRUE, NULL, NULL, 1),
  ('q_por_2', 'evt_portrait', 'Date souhaitée', 'date', NULL, TRUE, NULL, NULL, 2),
  ('q_por_3', 'evt_portrait', 'Lieu de la séance', 'radio', '["En studio", "En extérieur", "À domicile/bureau", "Je suis ouvert aux suggestions"]', TRUE, NULL, NULL, 3),
  ('q_por_4', 'evt_portrait', 'Nombre de personnes à photographier', 'number', NULL, TRUE, NULL, NULL, 4),
  ('q_por_5', 'evt_portrait', 'Usage prévu des photos', 'checkbox', '["LinkedIn / CV", "Site web personnel", "Réseaux sociaux", "Communication entreprise", "Usage personnel"]', FALSE, NULL, NULL, 5),
  ('q_por_6', 'evt_portrait', 'Avez-vous des références visuelles ?', 'textarea', NULL, FALSE, 'Liens Pinterest, exemples de photos...', NULL, 6),
  ('q_por_7', 'evt_portrait', 'Des contraintes particulières ?', 'textarea', NULL, FALSE, 'Côté préféré, lunettes, tatouages...', NULL, 7)
ON CONFLICT (id) DO NOTHING;

-- Questions Entreprise
INSERT INTO questionnaire_questions (id, event_type_id, question, field_type, options, is_required, placeholder, help_text, sort_order) VALUES
  ('q_ent_1', 'evt_entreprise', 'Type de prestation', 'select', '["Photos corporate / équipe", "Portraits dirigeants", "Couverture événement", "Photos locaux/architecture", "Photos produits", "Reportage activité"]', TRUE, NULL, NULL, 1),
  ('q_ent_2', 'evt_entreprise', 'Date souhaitée', 'date', NULL, TRUE, NULL, NULL, 2),
  ('q_ent_3', 'evt_entreprise', 'Adresse de l''intervention', 'text', NULL, TRUE, NULL, NULL, 3),
  ('q_ent_4', 'evt_entreprise', 'Durée estimée', 'select', '["1-2 heures", "Demi-journée", "Journée complète", "Plusieurs jours"]', TRUE, NULL, NULL, 4),
  ('q_ent_5', 'evt_entreprise', 'Nombre de personnes à photographier', 'text', NULL, FALSE, 'Ex: 15 portraits + 3 photos équipe', NULL, 5),
  ('q_ent_6', 'evt_entreprise', 'Charte graphique à respecter ?', 'radio', '["Oui", "Non", "À discuter"]', FALSE, NULL, NULL, 6),
  ('q_ent_7', 'evt_entreprise', 'Usage prévu des photos', 'checkbox', '["Site web", "Réseaux sociaux", "Print", "Intranet", "Presse"]', FALSE, NULL, NULL, 7),
  ('q_ent_8', 'evt_entreprise', 'Budget indicatif', 'text', NULL, FALSE, 'Votre enveloppe budgétaire', NULL, 8),
  ('q_ent_9', 'evt_entreprise', 'Contraintes logistiques', 'textarea', NULL, FALSE, 'Accès, parkings, badges, horaires...', NULL, 9)
ON CONFLICT (id) DO NOTHING;

-- Questions Événement
INSERT INTO questionnaire_questions (id, event_type_id, question, field_type, options, is_required, placeholder, help_text, sort_order) VALUES
  ('q_eve_1', 'evt_evenement', 'Type d''événement', 'select', '["Anniversaire", "Baptême", "Bar/Bat Mitzvah", "Soirée privée", "Gala", "Inauguration", "Autre"]', TRUE, NULL, NULL, 1),
  ('q_eve_2', 'evt_evenement', 'Date de l''événement', 'date', NULL, TRUE, NULL, NULL, 2),
  ('q_eve_3', 'evt_evenement', 'Lieu', 'text', NULL, TRUE, NULL, NULL, 3),
  ('q_eve_4', 'evt_evenement', 'Heure de début', 'time', NULL, TRUE, NULL, NULL, 4),
  ('q_eve_5', 'evt_evenement', 'Heure de fin prévue', 'time', NULL, FALSE, NULL, NULL, 5),
  ('q_eve_6', 'evt_evenement', 'Nombre d''invités approximatif', 'number', NULL, FALSE, NULL, NULL, 6),
  ('q_eve_7', 'evt_evenement', 'Moments clés à capturer', 'textarea', NULL, FALSE, 'Discours, gâteau, spectacle...', NULL, 7),
  ('q_eve_8', 'evt_evenement', 'Thème ou dress code ?', 'text', NULL, FALSE, NULL, NULL, 8)
ON CONFLICT (id) DO NOTHING;

-- Contract templates
INSERT INTO contract_templates (id, user_id, event_type_id, name, content, is_system, is_default) VALUES
  ('tpl_standard', NULL, NULL, 'Contrat standard', '<h2>CONTRAT DE PRESTATION PHOTOGRAPHIQUE</h2>
<h3>ARTICLE 1 - OBJET</h3><p>Le présent contrat définit les conditions dans lesquelles <strong>{{photographer_name}}</strong> réalisera une prestation photographique pour <strong>{{client_name}}</strong>.</p>
<h3>ARTICLE 2 - PRESTATION</h3><p>Type: <strong>{{event_type}}</strong></p><ul><li>Prise de vue</li><li>Traitement et retouche</li><li>Livraison fichiers HD</li></ul>
<h3>ARTICLE 3 - DATE ET LIEU</h3><p>Selon le questionnaire préalable.</p>
<h3>ARTICLE 4 - TARIFS</h3><p>Détaillés dans le devis. Acompte de 30% à la signature.</p>
<h3>ARTICLE 5 - DROITS</h3><p>Usage personnel et privé. Usage commercial soumis à accord écrit.</p>
<h3>ARTICLE 6 - ANNULATION</h3><ul><li>+30j: remboursement intégral</li><li>15-30j: 50%</li><li>-15j: acompte acquis</li></ul>
<h3>ARTICLE 7 - LIVRAISON</h3><p>4 à 6 semaines via galerie en ligne sécurisée.</p>
<h3>ARTICLE 8 - RGPD</h3><p>Données traitées conformément au RGPD.</p>
<p><em>Fait en deux exemplaires, le {{date}}.</em></p>', TRUE, TRUE),
  ('tpl_mariage', NULL, 'evt_mariage', 'Contrat Mariage', '<h2>CONTRAT PHOTOGRAPHIQUE - MARIAGE</h2>
<h3>ARTICLE 1 - OBJET</h3><p><strong>{{photographer_name}}</strong> couvrira le mariage de <strong>{{client_name}}</strong>.</p>
<h3>ARTICLE 2 - PRESTATION</h3><ul><li>Préparatifs</li><li>Cérémonie</li><li>Séance couple</li><li>Photos de groupe</li><li>Cocktail et réception</li></ul>
<h3>ARTICLE 3 - DATE ET LIEUX</h3><p>Selon questionnaire préalable.</p>
<h3>ARTICLE 4 - PAIEMENT</h3><ul><li>30% acompte à la signature</li><li>40% un mois avant</li><li>30% à la livraison</li></ul>
<h3>ARTICLE 5 - EXCLUSIVITÉ</h3><p>Pas d''autre photographe professionnel sauf accord.</p>
<h3>ARTICLE 6 - DROITS</h3><p>Usage personnel. Promotion par le photographe sauf opposition.</p>
<h3>ARTICLE 7 - ANNULATION</h3><ul><li>+90j: 80% remboursé</li><li>30-90j: 50%</li><li>-30j: acompte acquis</li></ul>
<h3>ARTICLE 8 - LIVRAISON</h3><p>8 à 12 semaines. Galerie privée + fichiers HD.</p>
<p><em>Fait en deux exemplaires, le {{date}}.</em></p>', TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

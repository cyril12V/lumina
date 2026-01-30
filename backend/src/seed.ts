import { v4 as uuidv4 } from 'uuid';
import db from './lib/db.js';

console.log('🌱 Seeding database with initial data...\n');

// ═══════════════════════════════════════════════════════════════════
// EVENT TYPES (Types d'événements système)
// ═══════════════════════════════════════════════════════════════════

const eventTypes = [
  { id: uuidv4(), name: 'Mariage', icon: 'heart', sort_order: 1 },
  { id: uuidv4(), name: 'Fiançailles', icon: 'heart', sort_order: 2 },
  { id: uuidv4(), name: 'Portrait', icon: 'user', sort_order: 3 },
  { id: uuidv4(), name: 'Entreprise', icon: 'briefcase', sort_order: 4 },
  { id: uuidv4(), name: 'Événement', icon: 'calendar', sort_order: 5 },
  { id: uuidv4(), name: 'Famille', icon: 'users', sort_order: 6 },
  { id: uuidv4(), name: 'Grossesse & Naissance', icon: 'baby', sort_order: 7 },
  { id: uuidv4(), name: 'Immobilier', icon: 'home', sort_order: 8 },
  { id: uuidv4(), name: 'Produit', icon: 'package', sort_order: 9 },
];

console.log('📅 Inserting event types...');
const insertEventType = db.prepare(`
  INSERT OR IGNORE INTO event_types (id, user_id, name, icon, is_system, sort_order)
  VALUES (?, NULL, ?, ?, 1, ?)
`);

for (const type of eventTypes) {
  insertEventType.run(type.id, type.name, type.icon, type.sort_order);
  console.log(`  ✓ ${type.name}`);
}

// ═══════════════════════════════════════════════════════════════════
// QUESTIONNAIRE QUESTIONS (Questions par type d'événement)
// ═══════════════════════════════════════════════════════════════════

console.log('\n📝 Inserting questionnaire questions...');

const insertQuestion = db.prepare(`
  INSERT OR IGNORE INTO questionnaire_questions
  (id, event_type_id, question, field_type, options, is_required, placeholder, help_text, sort_order, condition_field, condition_value)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Get event type IDs
const getEventTypeId = (name: string) => {
  const row = db.prepare('SELECT id FROM event_types WHERE name = ? AND is_system = 1').get(name) as { id: string } | undefined;
  return row?.id;
};

// Questions for MARIAGE
const mariageId = getEventTypeId('Mariage');
if (mariageId) {
  const mariageQuestions = [
    { question: 'Date du mariage', field_type: 'date', is_required: 1, sort_order: 1 },
    { question: 'Lieu de la cérémonie', field_type: 'text', is_required: 1, placeholder: 'Église, mairie, lieu de culte...', sort_order: 2 },
    { question: 'Lieu de la réception', field_type: 'text', is_required: 1, placeholder: 'Château, domaine, restaurant...', sort_order: 3 },
    { question: 'Heure de début prévue', field_type: 'time', is_required: 1, sort_order: 4 },
    { question: 'Nombre d\'invités approximatif', field_type: 'number', is_required: 0, sort_order: 5 },
    { question: 'Préparatifs à photographier ?', field_type: 'radio', options: JSON.stringify(['Mariée uniquement', 'Marié uniquement', 'Les deux', 'Non']), is_required: 1, sort_order: 6 },
    { question: 'Souhaitez-vous une séance couple ?', field_type: 'radio', options: JSON.stringify(['Oui, avant le mariage', 'Oui, le jour J', 'Oui, après (day after)', 'Non']), is_required: 0, sort_order: 7 },
    { question: 'Avez-vous un thème ou style particulier ?', field_type: 'textarea', is_required: 0, placeholder: 'Décrivez l\'ambiance souhaitée...', sort_order: 8 },
    { question: 'Y a-t-il d\'autres prestataires à coordonner ?', field_type: 'textarea', is_required: 0, placeholder: 'Vidéaste, DJ, wedding planner...', sort_order: 9 },
    { question: 'Des moments spéciaux à ne pas manquer ?', field_type: 'textarea', is_required: 0, help_text: 'Surprise, danse spéciale, tradition...', sort_order: 10 },
  ];

  for (const q of mariageQuestions) {
    insertQuestion.run(uuidv4(), mariageId, q.question, q.field_type, q.options || null, q.is_required, q.placeholder || null, q.help_text || null, q.sort_order, null, null);
  }
  console.log(`  ✓ ${mariageQuestions.length} questions pour Mariage`);
}

// Questions for PORTRAIT
const portraitId = getEventTypeId('Portrait');
if (portraitId) {
  const portraitQuestions = [
    { question: 'Type de portrait souhaité', field_type: 'select', options: JSON.stringify(['Portrait professionnel', 'Portrait artistique', 'Portrait corporate', 'Book mannequin/acteur', 'Portrait personnel']), is_required: 1, sort_order: 1 },
    { question: 'Date souhaitée', field_type: 'date', is_required: 1, sort_order: 2 },
    { question: 'Lieu de la séance', field_type: 'radio', options: JSON.stringify(['En studio', 'En extérieur', 'À domicile/bureau', 'Je suis ouvert aux suggestions']), is_required: 1, sort_order: 3 },
    { question: 'Nombre de personnes à photographier', field_type: 'number', is_required: 1, sort_order: 4 },
    { question: 'Usage prévu des photos', field_type: 'checkbox', options: JSON.stringify(['LinkedIn / CV', 'Site web personnel', 'Réseaux sociaux', 'Communication d\'entreprise', 'Usage personnel']), is_required: 0, sort_order: 5 },
    { question: 'Avez-vous des références visuelles ?', field_type: 'textarea', is_required: 0, placeholder: 'Liens Pinterest, exemples de photos que vous aimez...', sort_order: 6 },
    { question: 'Des contraintes particulières ?', field_type: 'textarea', is_required: 0, placeholder: 'Côté préféré, lunettes, tatouages à cacher...', sort_order: 7 },
  ];

  for (const q of portraitQuestions) {
    insertQuestion.run(uuidv4(), portraitId, q.question, q.field_type, (q as any).options || null, q.is_required, (q as any).placeholder || null, (q as any).help_text || null, q.sort_order, null, null);
  }
  console.log(`  ✓ ${portraitQuestions.length} questions pour Portrait`);
}

// Questions for ENTREPRISE
const entrepriseId = getEventTypeId('Entreprise');
if (entrepriseId) {
  const entrepriseQuestions = [
    { question: 'Type de prestation', field_type: 'select', options: JSON.stringify(['Photos corporate / équipe', 'Portraits dirigeants', 'Couverture événement', 'Photos locaux/architecture', 'Photos produits', 'Reportage activité']), is_required: 1, sort_order: 1 },
    { question: 'Date souhaitée', field_type: 'date', is_required: 1, sort_order: 2 },
    { question: 'Adresse de l\'intervention', field_type: 'text', is_required: 1, sort_order: 3 },
    { question: 'Durée estimée de la prestation', field_type: 'select', options: JSON.stringify(['1-2 heures', 'Demi-journée', 'Journée complète', 'Plusieurs jours']), is_required: 1, sort_order: 4 },
    { question: 'Nombre de personnes à photographier', field_type: 'text', is_required: 0, placeholder: 'Ex: 15 portraits individuels + 3 photos d\'équipe', sort_order: 5 },
    { question: 'Charte graphique à respecter ?', field_type: 'radio', options: JSON.stringify(['Oui', 'Non', 'À discuter']), is_required: 0, sort_order: 6 },
    { question: 'Usage prévu des photos', field_type: 'checkbox', options: JSON.stringify(['Site web', 'Réseaux sociaux', 'Print (brochures, affiches)', 'Intranet', 'Presse']), is_required: 0, sort_order: 7 },
    { question: 'Budget indicatif', field_type: 'text', is_required: 0, placeholder: 'Votre enveloppe budgétaire', sort_order: 8 },
    { question: 'Contraintes logistiques', field_type: 'textarea', is_required: 0, placeholder: 'Accès, parkings, badges, horaires...', sort_order: 9 },
  ];

  for (const q of entrepriseQuestions) {
    insertQuestion.run(uuidv4(), entrepriseId, q.question, q.field_type, (q as any).options || null, q.is_required, (q as any).placeholder || null, (q as any).help_text || null, q.sort_order, null, null);
  }
  console.log(`  ✓ ${entrepriseQuestions.length} questions pour Entreprise`);
}

// Questions for ÉVÉNEMENT
const evenementId = getEventTypeId('Événement');
if (evenementId) {
  const evenementQuestions = [
    { question: 'Type d\'événement', field_type: 'select', options: JSON.stringify(['Anniversaire', 'Baptême', 'Bar/Bat Mitzvah', 'Soirée privée', 'Gala', 'Inauguration', 'Autre']), is_required: 1, sort_order: 1 },
    { question: 'Date de l\'événement', field_type: 'date', is_required: 1, sort_order: 2 },
    { question: 'Lieu', field_type: 'text', is_required: 1, sort_order: 3 },
    { question: 'Heure de début', field_type: 'time', is_required: 1, sort_order: 4 },
    { question: 'Heure de fin prévue', field_type: 'time', is_required: 0, sort_order: 5 },
    { question: 'Nombre d\'invités approximatif', field_type: 'number', is_required: 0, sort_order: 6 },
    { question: 'Moments clés à capturer', field_type: 'textarea', is_required: 0, placeholder: 'Discours, gâteau, spectacle, surprise...', sort_order: 7 },
    { question: 'Thème ou dress code ?', field_type: 'text', is_required: 0, sort_order: 8 },
  ];

  for (const q of evenementQuestions) {
    insertQuestion.run(uuidv4(), evenementId, q.question, q.field_type, (q as any).options || null, q.is_required, (q as any).placeholder || null, (q as any).help_text || null, q.sort_order, null, null);
  }
  console.log(`  ✓ ${evenementQuestions.length} questions pour Événement`);
}

// Questions for FIANÇAILLES
const fiancaillesId = getEventTypeId('Fiançailles');
if (fiancaillesId) {
  const fiancaillesQuestions = [
    { question: 'Date de la séance', field_type: 'date', is_required: 1, sort_order: 1 },
    { question: 'Lieu souhaité', field_type: 'text', is_required: 1, placeholder: 'Lieu symbolique, parc, centre-ville...', sort_order: 2 },
    { question: 'Heure de début', field_type: 'time', is_required: 1, sort_order: 3 },
    { question: 'Style souhaité', field_type: 'select', options: JSON.stringify(['Romantique', 'Naturel / décontracté', 'Urbain / moderne', 'Classique / élégant']), is_required: 1, sort_order: 4 },
    { question: 'Lieu de la future cérémonie (si connu)', field_type: 'text', is_required: 0, placeholder: 'Optionnel', sort_order: 5 },
    { question: 'Souhaitez-vous utiliser les photos pour les faire-part ?', field_type: 'radio', options: JSON.stringify(['Oui', 'Non', 'Peut-être']), is_required: 0, sort_order: 6 },
    { question: 'Des accessoires ou objets importants ?', field_type: 'textarea', is_required: 0, placeholder: 'Bague, lettres, fleurs...', sort_order: 7 },
    { question: 'Vos inspirations ou souhaits', field_type: 'textarea', is_required: 0, placeholder: 'Ce que vous imaginez pour cette séance...', sort_order: 8 },
  ];

  for (const q of fiancaillesQuestions) {
    insertQuestion.run(uuidv4(), fiancaillesId, q.question, q.field_type, (q as any).options || null, q.is_required, (q as any).placeholder || null, null, q.sort_order, null, null);
  }
  console.log(`  ✓ ${fiancaillesQuestions.length} questions pour Fiançailles`);
}

// Questions for FAMILLE
const familleId = getEventTypeId('Famille');
if (familleId) {
  const familleQuestions = [
    { question: 'Date souhaitée', field_type: 'date', is_required: 1, sort_order: 1 },
    { question: 'Type de séance famille', field_type: 'select', options: JSON.stringify(['Séance classique', 'Séance lifestyle', 'Fête de famille', 'Réunion de famille', 'Séance intergénérationnelle']), is_required: 1, sort_order: 2 },
    { question: 'Lieu de la séance', field_type: 'radio', options: JSON.stringify(['En studio', 'En extérieur', 'À domicile', 'Lieu spécifique']), is_required: 1, sort_order: 3 },
    { question: 'Nombre de personnes', field_type: 'number', is_required: 1, sort_order: 4 },
    { question: 'Âges des enfants (si applicable)', field_type: 'text', is_required: 0, placeholder: 'Ex: 3 ans, 7 ans, 12 ans', sort_order: 5 },
    { question: 'Animaux de compagnie à inclure ?', field_type: 'radio', options: JSON.stringify(['Oui', 'Non']), is_required: 0, sort_order: 6 },
    { question: 'Souhaits particuliers', field_type: 'textarea', is_required: 0, placeholder: 'Ambiance, tenues coordonnées, activités...', sort_order: 7 },
  ];

  for (const q of familleQuestions) {
    insertQuestion.run(uuidv4(), familleId, q.question, q.field_type, (q as any).options || null, q.is_required, (q as any).placeholder || null, null, q.sort_order, null, null);
  }
  console.log(`  ✓ ${familleQuestions.length} questions pour Famille`);
}

// Questions for GROSSESSE & NAISSANCE
const grossesseId = getEventTypeId('Grossesse & Naissance');
if (grossesseId) {
  const grossesseQuestions = [
    { question: 'Type de séance', field_type: 'select', options: JSON.stringify(['Séance grossesse / maternité', 'Séance naissance / nouveau-né', 'Les deux (pack)']), is_required: 1, sort_order: 1 },
    { question: 'Date souhaitée', field_type: 'date', is_required: 1, sort_order: 2 },
    { question: 'Mois de grossesse (pour séance maternité)', field_type: 'text', is_required: 0, placeholder: 'Ex: 7 mois', sort_order: 3 },
    { question: 'Date de naissance prévue/réelle du bébé', field_type: 'date', is_required: 0, sort_order: 4 },
    { question: 'Lieu de la séance', field_type: 'radio', options: JSON.stringify(['En studio', 'À domicile', 'En extérieur']), is_required: 1, sort_order: 5 },
    { question: 'Souhaitez-vous inclure le papa/partenaire ?', field_type: 'radio', options: JSON.stringify(['Oui', 'Non', 'Quelques photos']), is_required: 0, sort_order: 6 },
    { question: 'Frères et sœurs à inclure ?', field_type: 'radio', options: JSON.stringify(['Oui', 'Non', 'Pas applicable']), is_required: 0, sort_order: 7 },
    { question: 'Souhaits ou thème', field_type: 'textarea', is_required: 0, placeholder: 'Couleurs, ambiance, accessoires...', sort_order: 8 },
  ];

  for (const q of grossesseQuestions) {
    insertQuestion.run(uuidv4(), grossesseId, q.question, q.field_type, (q as any).options || null, q.is_required, (q as any).placeholder || null, null, q.sort_order, null, null);
  }
  console.log(`  ✓ ${grossesseQuestions.length} questions pour Grossesse & Naissance`);
}

// Questions for IMMOBILIER
const immobilierId = getEventTypeId('Immobilier');
if (immobilierId) {
  const immobilierQuestions = [
    { question: 'Type de bien', field_type: 'select', options: JSON.stringify(['Appartement', 'Maison', 'Villa', 'Local commercial', 'Bureau', 'Hôtel / Gîte']), is_required: 1, sort_order: 1 },
    { question: 'Adresse du bien', field_type: 'text', is_required: 1, sort_order: 2 },
    { question: 'Date souhaitée', field_type: 'date', is_required: 1, sort_order: 3 },
    { question: 'Surface approximative (m²)', field_type: 'number', is_required: 0, sort_order: 4 },
    { question: 'Nombre de pièces', field_type: 'number', is_required: 0, sort_order: 5 },
    { question: 'Le bien est-il meublé ?', field_type: 'radio', options: JSON.stringify(['Oui', 'Non', 'Partiellement']), is_required: 0, sort_order: 6 },
    { question: 'Services souhaités', field_type: 'checkbox', options: JSON.stringify(['Photos intérieures', 'Photos extérieures', 'Photos aériennes (drone)', 'Visite virtuelle 360°', 'Vidéo']), is_required: 1, sort_order: 7 },
    { question: 'Usage des photos', field_type: 'select', options: JSON.stringify(['Vente', 'Location', 'Airbnb / Location courte durée', 'Promotion hôtelière']), is_required: 1, sort_order: 8 },
  ];

  for (const q of immobilierQuestions) {
    insertQuestion.run(uuidv4(), immobilierId, q.question, q.field_type, (q as any).options || null, q.is_required, (q as any).placeholder || null, null, q.sort_order, null, null);
  }
  console.log(`  ✓ ${immobilierQuestions.length} questions pour Immobilier`);
}

// Questions for PRODUIT
const produitId = getEventTypeId('Produit');
if (produitId) {
  const produitQuestions = [
    { question: 'Type de produits', field_type: 'text', is_required: 1, placeholder: 'Cosmétiques, vêtements, bijoux, alimentaire...', sort_order: 1 },
    { question: 'Nombre de produits à photographier', field_type: 'number', is_required: 1, sort_order: 2 },
    { question: 'Date souhaitée', field_type: 'date', is_required: 1, sort_order: 3 },
    { question: 'Type de prises de vue', field_type: 'checkbox', options: JSON.stringify(['Packshot fond blanc', 'Mise en scène / lifestyle', 'Photos flatlay', 'Photos portées (modèle)', 'Photos de détails']), is_required: 1, sort_order: 4 },
    { question: 'Usage prévu', field_type: 'checkbox', options: JSON.stringify(['E-commerce', 'Réseaux sociaux', 'Catalogue / print', 'Publicité']), is_required: 1, sort_order: 5 },
    { question: 'Charte graphique à respecter ?', field_type: 'radio', options: JSON.stringify(['Oui (à fournir)', 'Non', 'À créer']), is_required: 0, sort_order: 6 },
    { question: 'Dimensions ou formats requis', field_type: 'text', is_required: 0, placeholder: 'Ex: 1200x1200 pour Instagram, fond blanc pour Amazon', sort_order: 7 },
  ];

  for (const q of produitQuestions) {
    insertQuestion.run(uuidv4(), produitId, q.question, q.field_type, (q as any).options || null, q.is_required, (q as any).placeholder || null, null, q.sort_order, null, null);
  }
  console.log(`  ✓ ${produitQuestions.length} questions pour Produit`);
}

// ═══════════════════════════════════════════════════════════════════
// CONTRACT TEMPLATES (Modèles de contrats)
// ═══════════════════════════════════════════════════════════════════

console.log('\n📄 Inserting contract templates...');

const insertTemplate = db.prepare(`
  INSERT OR IGNORE INTO contract_templates (id, user_id, event_type_id, name, content, is_system, is_default)
  VALUES (?, NULL, ?, ?, ?, 1, 1)
`);

// Generic contract template — ULTRA COMPLET
const genericTemplate = `
<h2>CONTRAT DE PRESTATION PHOTOGRAPHIQUE</h2>

<p><em>Entre les soussignés :</em></p>

<h3>ARTICLE 1 - IDENTIFICATION DES PARTIES</h3>
<p><strong>Le Photographe :</strong></p>
<p>{{photographer_name}}</p>
<p>Adresse : {{photographer_address}}</p>
<p>SIRET : {{photographer_siret}}</p>
<p>Téléphone : {{photographer_phone}}</p>
<p>Email : {{photographer_email}}</p>

<p><strong>Le Client :</strong></p>
<p>{{client_name}}</p>
<p>Adresse : {{client_address}}</p>
<p>Email : {{client_email}}</p>

<h3>ARTICLE 2 - OBJET DU CONTRAT</h3>
<p>Le présent contrat a pour objet de définir les conditions et modalités dans lesquelles <strong>{{photographer_name}}</strong> (ci-après "le Photographe") réalisera une prestation de services photographiques au profit de <strong>{{client_name}}</strong> (ci-après "le Client").</p>
<p>Type de prestation : <strong>{{event_type}}</strong></p>

<h3>ARTICLE 3 - NATURE ET ÉTENDUE DE LA PRESTATION</h3>
<p>La prestation comprend :</p>
<li>La prise de vue photographique selon les modalités convenues entre les parties</li>
<li>Le traitement numérique et la retouche artistique des photos sélectionnées</li>
<li>La livraison des fichiers numériques haute définition (JPEG et/ou RAW selon formule)</li>
<li>L'accès à une galerie en ligne privée et sécurisée pour le téléchargement</li>
<p>Nombre de photos livrées : selon la formule choisie et détaillée dans le devis.</p>
<p>Les photos non retenues (bruts non sélectionnés) ne seront pas communiquées au Client, sauf accord écrit du Photographe.</p>

<h3>ARTICLE 4 - DATE, LIEU ET DURÉE</h3>
<p>La prestation sera réalisée conformément aux informations fournies dans le questionnaire préalable complété par le Client.</p>
<p>Tout changement de date, lieu ou horaire devra être signalé au minimum 72 heures à l'avance et accepté par le Photographe.</p>
<p>Le Photographe se réserve le droit de proposer une alternative en cas d'impossibilité logistique.</p>

<h3>ARTICLE 5 - TARIFS ET MODALITÉS DE PAIEMENT</h3>
<p>Le montant total de la prestation est défini selon le devis accepté par le Client.</p>
<p><strong>Échéancier de paiement :</strong></p>
<li>Acompte de 30% du montant total à la signature du présent contrat, soit la somme de {{montant_acompte}} — valant réservation ferme de la date</li>
<li>Solde de 70% au plus tard le jour de la prestation, soit la somme de {{montant_solde}}</li>
<p><strong>Montant total TTC : {{montant_total}}</strong></p>
<p>Modes de paiement acceptés : virement bancaire, chèque, espèces.</p>
<p>En cas de retard de paiement, des pénalités de retard au taux légal en vigueur seront appliquées de plein droit.</p>

<h3>ARTICLE 6 - DROITS D'AUTEUR ET D'UTILISATION</h3>
<p>Conformément au Code de la Propriété Intellectuelle (articles L.111-1 et suivants), le Photographe conserve l'intégralité des droits d'auteur sur les photographies réalisées.</p>
<p><strong>Le Client se voit céder un droit d'utilisation :</strong></p>
<li>Pour un usage strictement personnel et privé (tirages, albums, partage famille et amis)</li>
<li>Partage sur les réseaux sociaux personnels avec crédit photo obligatoire mentionnant le nom du Photographe</li>
<p><strong>Sont interdits sans accord écrit préalable :</strong></p>
<li>Toute utilisation commerciale, publicitaire ou promotionnelle</li>
<li>La revente, la cession ou la sous-licence des fichiers à des tiers</li>
<li>La modification, le recadrage ou l'application de filtres altérant l'œuvre originale</li>
<p>Le Photographe se réserve le droit d'utiliser les images réalisées pour la promotion de son activité professionnelle (site internet, réseaux sociaux, portfolio, salons, concours), sauf opposition expresse et écrite du Client formulée avant la prestation.</p>

<h3>ARTICLE 7 - DROIT À L'IMAGE</h3>
<p>Le Client autorise le Photographe à fixer, reproduire et diffuser son image dans le cadre défini à l'article 6.</p>
<p>Cette autorisation est donnée pour une durée illimitée et pour le monde entier.</p>
<p>Le Client peut à tout moment retirer cette autorisation par courrier recommandé, ce retrait prenant effet dans un délai de 30 jours.</p>

<h3>ARTICLE 8 - ANNULATION ET REPORT</h3>
<p><strong>En cas d'annulation par le Client :</strong></p>
<li>Plus de 30 jours avant la prestation : remboursement intégral de l'acompte</li>
<li>Entre 15 et 30 jours avant : remboursement de 50% de l'acompte</li>
<li>Moins de 15 jours avant : l'acompte reste intégralement acquis au Photographe à titre de dédommagement</li>
<p><strong>En cas de report :</strong></p>
<p>Si une nouvelle date peut être convenue entre les parties, l'acompte sera conservé sans pénalité. Un seul report est autorisé sans frais supplémentaires.</p>
<p><strong>En cas d'annulation par le Photographe :</strong></p>
<p>Le Photographe remboursera l'intégralité des sommes versées. Il s'efforcera de proposer un photographe remplaçant de niveau équivalent.</p>
<p><strong>Force majeure :</strong></p>
<p>En cas de force majeure (conditions météorologiques extrêmes, maladie grave, accident, événements exceptionnels), les parties conviendront d'une nouvelle date sans frais supplémentaires.</p>

<h3>ARTICLE 9 - LIVRAISON ET DÉLAIS</h3>
<p>Les photos seront livrées dans un délai de {{delai_livraison}} après la prestation.</p>
<p>La livraison s'effectuera via une galerie en ligne privée et sécurisée, avec lien de téléchargement valable 90 jours.</p>
<p>Les éventuels supports physiques (tirages, albums) seront livrés dans un délai complémentaire de 4 à 6 semaines après validation par le Client.</p>
<p>Les délais sont donnés à titre indicatif et un retard raisonnable ne pourra donner lieu à aucune indemnité ou annulation du contrat.</p>

<h3>ARTICLE 10 - RESPONSABILITÉ ET ASSURANCE</h3>
<p>Le Photographe s'engage à réaliser la prestation avec tout le soin et le professionnalisme requis, en mettant en œuvre les moyens techniques nécessaires.</p>
<p>Le Photographe est couvert par une assurance responsabilité civile professionnelle.</p>
<p>Sa responsabilité ne saurait être engagée pour des événements indépendants de sa volonté (panne de matériel imprévisible, conditions météo, restrictions d'accès imposées par des tiers).</p>
<p>En cas de perte totale des données due à un dysfonctionnement technique, la responsabilité du Photographe est limitée au remboursement des sommes versées.</p>

<h3>ARTICLE 11 - CONFIDENTIALITÉ ET RGPD</h3>
<p>Conformément au Règlement Général sur la Protection des Données (UE 2016/679) et à la loi Informatique et Libertés, le Photographe s'engage à :</p>
<li>Ne collecter que les données strictement nécessaires à l'exécution du contrat</li>
<li>Ne pas transmettre les données personnelles du Client à des tiers sans consentement</li>
<li>Conserver les données pour la durée nécessaire à l'exécution du contrat et aux obligations légales (5 ans)</li>
<li>Supprimer les données personnelles sur demande écrite du Client, dans le respect des obligations légales de conservation</li>
<p>Le Client dispose d'un droit d'accès, de rectification, de portabilité et de suppression de ses données en contactant le Photographe à l'adresse {{photographer_email}}.</p>

<h3>ARTICLE 12 - LITIGES ET DROIT APPLICABLE</h3>
<p>Le présent contrat est soumis au droit français.</p>
<p>En cas de différend, les parties s'engagent à rechercher une solution amiable dans un délai de 30 jours. À défaut d'accord amiable, le litige sera soumis aux tribunaux compétents du lieu de domicile du Photographe.</p>
<p>Le Client peut également recourir à un médiateur de la consommation conformément aux articles L.611-1 et suivants du Code de la consommation.</p>

<h3>ARTICLE 13 - DISPOSITIONS GÉNÉRALES</h3>
<p>Le présent contrat constitue l'intégralité de l'accord entre les parties et annule tout accord antérieur, écrit ou verbal, relatif à son objet.</p>
<p>Toute modification du présent contrat devra faire l'objet d'un avenant signé par les deux parties.</p>
<p>Si l'une des clauses du présent contrat s'avérait nulle, les autres clauses resteraient pleinement applicables.</p>

<p><br/><em>Fait en deux exemplaires originaux, le {{date}}.</em></p>
<p><em>Chaque partie reconnaît avoir lu l'intégralité du présent contrat et en accepter toutes les conditions.</em></p>
`;

// Mariage specific template — ULTRA COMPLET
const mariageTemplate = `
<h2>CONTRAT DE PRESTATION PHOTOGRAPHIQUE - MARIAGE</h2>

<p><em>Contrat de prestation de services photographiques pour la couverture d'un mariage</em></p>

<h3>ARTICLE 1 - IDENTIFICATION DES PARTIES</h3>
<p><strong>Le Photographe :</strong></p>
<p>{{photographer_name}}, {{photographer_address}}</p>
<p>SIRET : {{photographer_siret}} — Tél : {{photographer_phone}} — Email : {{photographer_email}}</p>
<p><strong>Les Mariés (ci-après "le Client") :</strong></p>
<p>{{client_name}}, {{client_address}}</p>
<p>Email : {{client_email}}</p>

<h3>ARTICLE 2 - OBJET DU CONTRAT</h3>
<p>Le présent contrat a pour objet de définir les conditions dans lesquelles <strong>{{photographer_name}}</strong> réalisera la couverture photographique du mariage de <strong>{{client_name}}</strong>.</p>

<h3>ARTICLE 3 - NATURE ET ÉTENDUE DE LA PRESTATION</h3>
<p>Le Photographe s'engage à couvrir les moments suivants du mariage :</p>
<li>Préparatifs des mariés (selon formule choisie)</li>
<li>Cérémonie civile et/ou religieuse</li>
<li>Séance photo de couple (jour J ou day-after selon préférence)</li>
<li>Photos de groupe avec les familles et témoins</li>
<li>Cocktail et/ou vin d'honneur</li>
<li>Entrée en salle, ouverture de bal, premières danses</li>
<li>Moments forts de la soirée (selon formule et horaires convenus)</li>
<p><strong>Formule choisie : {{formule_choisie}}</strong></p>
<p>Nombre estimé de photos retouchées livrées : {{nombre_photos}}</p>
<p>Le Photographe effectuera un repérage des lieux si nécessaire et proposera un planning de la journée en amont.</p>

<h3>ARTICLE 4 - DATE, LIEUX ET HORAIRES</h3>
<p>Le mariage se déroulera selon les informations fournies dans le questionnaire préalable.</p>
<p>Le Photographe se déplacera sur les différents lieux de l'événement (préparatifs, cérémonie, réception).</p>
<p>Les frais de déplacement au-delà de {{rayon_deplacement}} km sont facturés en supplément à {{tarif_km}} €/km.</p>
<p>Tout changement de lieu ou d'horaire doit être communiqué au moins 15 jours avant le mariage.</p>

<h3>ARTICLE 5 - TARIFS ET MODALITÉS DE PAIEMENT</h3>
<p><strong>Montant total de la prestation : {{montant_total}} TTC</strong></p>
<p>Échéancier de paiement :</p>
<li>30% d'acompte à la signature du contrat (réservation ferme de la date) : {{montant_acompte}}</li>
<li>40% un mois avant le mariage</li>
<li>30% de solde à la livraison des photos : {{montant_solde}}</li>
<p>Modes de paiement : virement bancaire, chèque, espèces.</p>
<p>La réservation de la date n'est effective qu'après réception de l'acompte et du contrat signé.</p>
<p>Options supplémentaires éventuelles : {{options_supplementaires}}</p>

<h3>ARTICLE 6 - EXCLUSIVITÉ ET SECOND PHOTOGRAPHE</h3>
<p>Les Mariés s'engagent à ne pas faire appel à un autre photographe professionnel le jour du mariage, sauf accord préalable écrit du Photographe.</p>
<p>Les invités sont autorisés à prendre des photos personnelles, à condition que cela ne gêne pas le travail du Photographe, notamment pendant les moments clés (cérémonie, séance couple, groupe).</p>
<p>Un second photographe pourra être proposé en option pour une couverture plus complète de la journée.</p>

<h3>ARTICLE 7 - DROITS D'AUTEUR ET D'UTILISATION</h3>
<p>Conformément au Code de la Propriété Intellectuelle, le Photographe conserve l'intégralité de ses droits d'auteur.</p>
<p><strong>Droits cédés aux Mariés :</strong></p>
<li>Usage personnel et privé (tirages, albums, faire-part de remerciement)</li>
<li>Partage sur les réseaux sociaux personnels avec mention du crédit photo</li>
<li>Partage avec les invités via la galerie en ligne</li>
<p><strong>Le Photographe se réserve le droit :</strong></p>
<li>D'utiliser les images pour la promotion de son activité (site web, réseaux sociaux, portfolio, salons du mariage, publications spécialisées)</li>
<li>De soumettre les images à des concours ou publications photographiques</li>
<p>Les Mariés peuvent formuler une opposition écrite à l'utilisation promotionnelle avant la prestation.</p>

<h3>ARTICLE 8 - ANNULATION ET REPORT</h3>
<p><strong>Annulation par les Mariés :</strong></p>
<li>Plus de 90 jours avant : remboursement de 80% de l'acompte</li>
<li>Entre 30 et 90 jours : remboursement de 50% de l'acompte</li>
<li>Moins de 30 jours : l'acompte reste intégralement acquis au Photographe</li>
<p><strong>Report :</strong> si une nouvelle date est trouvée d'un commun accord, l'acompte est conservé sans pénalité. Un seul report gratuit est autorisé.</p>
<p><strong>Annulation par le Photographe :</strong> remboursement intégral de toutes les sommes versées. Le Photographe proposera un remplaçant de compétence équivalente.</p>
<p><strong>Force majeure :</strong> en cas de force majeure (conditions météo extrêmes, maladie grave, accident, pandémie), report sans frais d'un commun accord.</p>

<h3>ARTICLE 9 - LIVRAISON</h3>
<p>Les photos seront livrées dans un délai de {{delai_livraison}} après le mariage.</p>
<p>La livraison comprend :</p>
<li>Une galerie en ligne privée et sécurisée (valable 12 mois)</li>
<li>Les fichiers haute définition en téléchargement (JPEG)</li>
<li>Une sélection de photos en noir et blanc artistique</li>
<li>Les éventuels supports physiques prévus (album, tirages, clé USB)</li>
<p>Un teaser de 15 à 20 photos sera livré sous 2 semaines après le mariage.</p>

<h3>ARTICLE 10 - RESPONSABILITÉ ET ASSURANCE</h3>
<p>Le Photographe est couvert par une assurance responsabilité civile professionnelle.</p>
<p>Il s'engage à apporter le plus grand soin à la réalisation de sa prestation et à utiliser un équipement professionnel avec matériel de secours.</p>
<p>En cas d'empêchement majeur (maladie, accident), le Photographe s'engage à proposer un remplaçant de niveau équivalent ou à rembourser intégralement les sommes versées.</p>
<p>Le Photographe ne peut être tenu responsable de la non-réalisation de certaines photos si des circonstances échappant à son contrôle l'empêchent (retards dans le planning, accès refusé, conditions météo).</p>

<h3>ARTICLE 11 - CONFIDENTIALITÉ ET RGPD</h3>
<p>Les données personnelles sont traitées conformément au RGPD (UE 2016/679).</p>
<p>Le Photographe s'engage à ne pas divulguer les informations personnelles des Mariés et de leurs invités.</p>
<p>Les images des invités mineurs ne seront pas publiées sans autorisation parentale.</p>
<p>Contact pour exercer vos droits RGPD : {{photographer_email}}</p>

<h3>ARTICLE 12 - LITIGES</h3>
<p>Le présent contrat est soumis au droit français. En cas de litige, les parties privilégieront une solution amiable. À défaut, les tribunaux compétents seront saisis.</p>

<h3>ARTICLE 13 - DISPOSITIONS PARTICULIÈRES</h3>
<p>{{clauses_particulieres}}</p>

<p><br/><em>Fait en deux exemplaires originaux, le {{date}}.</em></p>
<p><em>Chaque partie reconnaît avoir lu l'intégralité du présent contrat et en accepter toutes les conditions.</em></p>
`;

// Fiançailles template — COMPLET
const fiancaillesTemplate = `
<h2>CONTRAT DE PRESTATION PHOTOGRAPHIQUE - SÉANCE FIANÇAILLES</h2>

<h3>ARTICLE 1 - IDENTIFICATION DES PARTIES</h3>
<p><strong>Le Photographe :</strong> {{photographer_name}}, {{photographer_address}}</p>
<p>SIRET : {{photographer_siret}} — Tél : {{photographer_phone}} — Email : {{photographer_email}}</p>
<p><strong>Les Fiancés (ci-après "le Client") :</strong> {{client_name}}, {{client_address}}</p>
<p>Email : {{client_email}}</p>

<h3>ARTICLE 2 - OBJET</h3>
<p>Le présent contrat définit les conditions dans lesquelles <strong>{{photographer_name}}</strong> réalisera une séance photo de fiançailles pour <strong>{{client_name}}</strong>.</p>

<h3>ARTICLE 3 - NATURE DE LA PRESTATION</h3>
<p>La séance comprend :</p>
<li>Séance couple d'une durée de {{duree_seance}} (1 à 2 heures par défaut)</li>
<li>Repérage et choix du/des lieu(x) en amont avec les Fiancés</li>
<li>Direction artistique, conseils de poses et d'ambiance</li>
<li>Traitement et retouche artistique des meilleures photos</li>
<li>Livraison de {{nombre_photos}} fichiers numériques haute définition</li>
<li>Une sélection en noir et blanc artistique</li>
<p>Les photos pourront être utilisées pour les faire-part de mariage et save-the-date.</p>

<h3>ARTICLE 4 - TARIFS ET PAIEMENT</h3>
<p><strong>Montant total : {{montant_total}} TTC</strong></p>
<li>Acompte de 30% à la réservation : {{montant_acompte}}</li>
<li>Solde le jour de la séance : {{montant_solde}}</li>
<p>Options : {{options_supplementaires}}</p>

<h3>ARTICLE 5 - DROITS D'UTILISATION</h3>
<p>Les Fiancés peuvent utiliser les photos pour : usage personnel et privé, faire-part, save-the-date, réseaux sociaux personnels (avec crédit photo).</p>
<p>Toute utilisation commerciale nécessite l'accord écrit préalable du Photographe.</p>
<p>Le Photographe se réserve le droit d'utiliser les images pour sa promotion, sauf opposition écrite.</p>

<h3>ARTICLE 6 - ANNULATION ET REPORT</h3>
<li>Plus de 7 jours avant : remboursement intégral</li>
<li>Moins de 7 jours : l'acompte reste acquis</li>
<p>En cas de météo défavorable pour une séance extérieure, report gratuit proposé.</p>

<h3>ARTICLE 7 - LIVRAISON</h3>
<p>Délai : {{delai_livraison}} via galerie en ligne sécurisée.</p>

<h3>ARTICLE 8 - CONFIDENTIALITÉ ET RGPD</h3>
<p>Données traitées conformément au RGPD. Contact : {{photographer_email}}</p>

<h3>ARTICLE 9 - DISPOSITIONS PARTICULIÈRES</h3>
<p>{{clauses_particulieres}}</p>

<p><br/><em>Fait en deux exemplaires, le {{date}}.</em></p>
<p><em>Chaque partie reconnaît avoir lu et accepté l'intégralité du présent contrat.</em></p>
`;

// Portrait template — COMPLET
const portraitTemplate = `
<h2>CONTRAT DE PRESTATION PHOTOGRAPHIQUE - PORTRAIT</h2>

<h3>ARTICLE 1 - IDENTIFICATION DES PARTIES</h3>
<p><strong>Le Photographe :</strong> {{photographer_name}}, {{photographer_address}}</p>
<p>SIRET : {{photographer_siret}} — Tél : {{photographer_phone}} — Email : {{photographer_email}}</p>
<p><strong>Le Client :</strong> {{client_name}}, {{client_address}}</p>
<p>Email : {{client_email}}</p>

<h3>ARTICLE 2 - OBJET</h3>
<p>Le présent contrat définit les conditions dans lesquelles <strong>{{photographer_name}}</strong> réalisera une séance de portrait pour <strong>{{client_name}}</strong>.</p>

<h3>ARTICLE 3 - NATURE DE LA PRESTATION</h3>
<li>Séance de portrait en studio ou en extérieur (durée : {{duree_seance}})</li>
<li>Direction artistique complète et conseils de poses</li>
<li>Sélection et retouche professionnelle (retouche beauté incluse)</li>
<li>Livraison de {{nombre_photos}} fichiers numériques haute définition</li>
<li>Formats adaptés à l'usage prévu (web, impression, réseaux sociaux)</li>
<p>Les photos non retenues ne seront pas communiquées.</p>

<h3>ARTICLE 4 - TARIFS ET PAIEMENT</h3>
<p><strong>Montant total : {{montant_total}} TTC</strong></p>
<p>Règlement intégral le jour de la séance, sauf accord contraire.</p>
<p>Options disponibles : tirages supplémentaires, retouche avancée, fichiers RAW.</p>

<h3>ARTICLE 5 - DROITS D'UTILISATION</h3>
<p><strong>Usage autorisé :</strong> personnel et professionnel non commercial (CV, LinkedIn, site personnel, carte de visite).</p>
<p><strong>Usage nécessitant un accord :</strong> toute utilisation commerciale, publicitaire ou éditoriale (facturation complémentaire possible).</p>
<p>Le Photographe se réserve le droit d'utiliser les images pour sa promotion, sauf opposition écrite.</p>
<p>Les retouches ou modifications par le Client (filtres, recadrage altérant l'œuvre) sont interdites sans accord.</p>

<h3>ARTICLE 6 - DROIT À L'IMAGE</h3>
<p>Le Client autorise le Photographe à utiliser les images à des fins promotionnelles. Cette autorisation peut être retirée par courrier recommandé.</p>

<h3>ARTICLE 7 - ANNULATION</h3>
<li>Plus de 48h avant : remboursement intégral ou report gratuit</li>
<li>Moins de 48h : l'intégralité du montant reste due</li>

<h3>ARTICLE 8 - LIVRAISON</h3>
<p>Délai : {{delai_livraison}} via galerie en ligne sécurisée.</p>

<h3>ARTICLE 9 - RGPD</h3>
<p>Données traitées conformément au RGPD. Contact : {{photographer_email}}</p>

<h3>ARTICLE 10 - DISPOSITIONS PARTICULIÈRES</h3>
<p>{{clauses_particulieres}}</p>

<p><br/><em>Fait en deux exemplaires, le {{date}}.</em></p>
<p><em>Chaque partie reconnaît avoir lu et accepté l'intégralité du présent contrat.</em></p>
`;

// Entreprise template — COMPLET
const entrepriseTemplate = `
<h2>CONTRAT DE PRESTATION PHOTOGRAPHIQUE - ENTREPRISE / CORPORATE</h2>

<h3>ARTICLE 1 - IDENTIFICATION DES PARTIES</h3>
<p><strong>Le Photographe :</strong> {{photographer_name}}, {{photographer_address}}</p>
<p>SIRET : {{photographer_siret}} — Tél : {{photographer_phone}} — Email : {{photographer_email}}</p>
<p><strong>L'Entreprise (ci-après "le Client") :</strong> {{client_name}}, {{client_address}}</p>
<p>Email : {{client_email}}</p>

<h3>ARTICLE 2 - OBJET</h3>
<p>Le présent contrat définit les conditions dans lesquelles <strong>{{photographer_name}}</strong> réalisera une prestation de photographie corporate pour <strong>{{client_name}}</strong>.</p>

<h3>ARTICLE 3 - NATURE DE LA PRESTATION</h3>
<p>La prestation inclut (selon brief du questionnaire) :</p>
<li>Portraits professionnels individuels et/ou de groupe (dirigeants, équipes)</li>
<li>Photos des locaux, espaces de travail, architecture</li>
<li>Couverture d'événement d'entreprise (conférence, séminaire, inauguration)</li>
<li>Reportage sur l'activité (métiers, process, savoir-faire)</li>
<li>Retouche professionnelle et livraison aux formats adaptés (web, print, réseaux sociaux)</li>
<p>Durée prévue : {{duree_seance}}</p>
<p>Nombre estimé de photos livrées : {{nombre_photos}}</p>
<p>L'Entreprise s'engage à fournir les accès nécessaires, informer le personnel concerné et respecter le planning convenu.</p>

<h3>ARTICLE 4 - TARIFS ET PAIEMENT</h3>
<p><strong>Montant total HT : {{montant_total}}</strong></p>
<p>TVA (20%) : {{montant_tva}}</p>
<p><strong>Montant total TTC : {{montant_ttc}}</strong></p>
<li>50% à la commande : {{montant_acompte}}</li>
<li>50% à la livraison : {{montant_solde}}</li>
<p>Paiement par virement bancaire à 30 jours fin de mois, sauf accord contraire.</p>
<p>En cas de retard de paiement, pénalités au taux légal + indemnité forfaitaire de recouvrement de 40 €.</p>

<h3>ARTICLE 5 - DROITS D'UTILISATION</h3>
<p><strong>Droits cédés à l'Entreprise :</strong></p>
<li>Communication interne et externe (intranet, newsletter, écrans)</li>
<li>Site web corporate et réseaux sociaux professionnels</li>
<li>Supports print (brochures, rapport annuel, plaquettes)</li>
<li>Presse et relations publiques</li>
<p>L'utilisation publicitaire payante (campagnes média, affichage) nécessite un accord écrit spécifique et une facturation complémentaire.</p>
<p>Durée de la cession : {{duree_cession_droits}} (illimitée par défaut).</p>
<p>Le Photographe peut utiliser les images dans son portfolio, sauf clause de confidentialité ci-dessous.</p>

<h3>ARTICLE 6 - CONFIDENTIALITÉ</h3>
<p>Le Photographe s'engage à la plus stricte confidentialité concernant les informations stratégiques, commerciales ou personnelles auxquelles il pourrait avoir accès durant la prestation.</p>
<p>Les images ne seront pas diffusées par le Photographe sans accord préalable si l'Entreprise le demande expressément.</p>

<h3>ARTICLE 7 - DROIT À L'IMAGE DES COLLABORATEURS</h3>
<p>L'Entreprise s'engage à recueillir les autorisations de droit à l'image de ses collaborateurs photographiés.</p>
<p>Le Photographe peut fournir un modèle d'autorisation à cet effet.</p>

<h3>ARTICLE 8 - ANNULATION</h3>
<li>Plus de 15 jours avant : sans frais</li>
<li>Moins de 15 jours : 50% du montant total</li>
<li>Moins de 48h : 100% du montant total</li>

<h3>ARTICLE 9 - LIVRAISON</h3>
<p>Délai : {{delai_livraison}}. Livraison via galerie sécurisée ou lien de téléchargement.</p>
<p>Formats livrés : JPEG haute définition + versions web optimisées.</p>

<h3>ARTICLE 10 - RGPD</h3>
<p>Données traitées conformément au RGPD. Contact DPO : {{photographer_email}}</p>

<h3>ARTICLE 11 - DISPOSITIONS PARTICULIÈRES</h3>
<p>{{clauses_particulieres}}</p>

<p><br/><em>Fait en deux exemplaires, le {{date}}.</em></p>
<p><em>Chaque partie reconnaît avoir lu et accepté l'intégralité du présent contrat.</em></p>
`;

// Événement template — COMPLET
const evenementTemplate = `
<h2>CONTRAT DE PRESTATION PHOTOGRAPHIQUE - ÉVÉNEMENT</h2>

<h3>ARTICLE 1 - IDENTIFICATION DES PARTIES</h3>
<p><strong>Le Photographe :</strong> {{photographer_name}}, {{photographer_address}}</p>
<p>SIRET : {{photographer_siret}} — Tél : {{photographer_phone}} — Email : {{photographer_email}}</p>
<p><strong>Le Client :</strong> {{client_name}}, {{client_address}} — Email : {{client_email}}</p>

<h3>ARTICLE 2 - OBJET</h3>
<p><strong>{{photographer_name}}</strong> s'engage à assurer la couverture photographique de l'événement organisé par <strong>{{client_name}}</strong>.</p>

<h3>ARTICLE 3 - PRESTATION</h3>
<li>Reportage complet des moments clés de l'événement</li>
<li>Photos d'ambiance, des invités et des installations</li>
<li>Traitement et retouche des photos sélectionnées</li>
<li>Livraison de {{nombre_photos}} fichiers numériques haute définition</li>
<p>Durée de couverture prévue : {{duree_seance}}</p>
<p>Le Client s'engage à informer le Photographe de tout changement de programme au plus tôt.</p>

<h3>ARTICLE 4 - TARIFS</h3>
<p><strong>Montant total : {{montant_total}} TTC</strong></p>
<li>Acompte de 30% à la réservation : {{montant_acompte}}</li>
<li>Solde le jour de l'événement : {{montant_solde}}</li>

<h3>ARTICLE 5 - DROITS</h3>
<p>Usage personnel et privé autorisé. Crédit photo obligatoire pour tout partage public.</p>
<p>Le Photographe peut utiliser les images pour sa promotion, sauf opposition écrite.</p>

<h3>ARTICLE 6 - ANNULATION</h3>
<li>Plus de 30 jours : remboursement intégral</li>
<li>15-30 jours : 50% de l'acompte retenu</li>
<li>Moins de 15 jours : acompte acquis</li>

<h3>ARTICLE 7 - LIVRAISON</h3>
<p>Délai : {{delai_livraison}} via galerie en ligne sécurisée.</p>

<h3>ARTICLE 8 - RGPD</h3>
<p>Données traitées conformément au RGPD. Contact : {{photographer_email}}</p>

<h3>ARTICLE 9 - DISPOSITIONS PARTICULIÈRES</h3>
<p>{{clauses_particulieres}}</p>

<p><br/><em>Fait en deux exemplaires, le {{date}}.</em></p>
<p><em>Chaque partie reconnaît avoir lu et accepté l'intégralité du présent contrat.</em></p>
`;

// Famille template
const familleTemplate = `
<h2>CONTRAT DE PRESTATION PHOTOGRAPHIQUE - SÉANCE FAMILLE</h2>

<h3>ARTICLE 1 – PARTIES</h3>
<p><strong>Le Photographe :</strong><br/>
{{photographer_name}}<br/>
SIRET : {{photographer_siret}}<br/>
Adresse : {{photographer_address}}<br/>
Téléphone : {{photographer_phone}} — E-mail : {{photographer_email}}</p>

<p><strong>Le Client :</strong><br/>
{{client_name}}<br/>
Adresse : {{client_address}}<br/>
Téléphone : {{client_phone}} — E-mail : {{client_email}}</p>

<h3>ARTICLE 2 – OBJET</h3>
<p>Le Photographe s'engage à réaliser une séance photo de famille au profit du Client, dans les conditions définies ci-après.</p>

<h3>ARTICLE 3 – DESCRIPTION DE LA PRESTATION</h3>
<ul>
  <li>Type de séance : {{formule_choisie}}</li>
  <li>Durée prévue : {{duree_seance}}</li>
  <li>Nombre de photos livrées (minimum) : {{nombre_photos}}</li>
  <li>Lieu : {{lieu_seance}} — Date : {{date_seance}}</li>
  <li>Poses individuelles, en duo et de groupe</li>
  <li>Direction artistique adaptée à tous les âges</li>
  <li>Retouche colorimétrique et artistique de chaque photo livrée</li>
  <li>Livraison en haute définition via galerie en ligne sécurisée</li>
</ul>
<p>Options supplémentaires éventuelles : {{options_supplementaires}}</p>

<h3>ARTICLE 4 – ORGANISATION</h3>
<p>La séance sera organisée selon les réponses fournies au questionnaire préalable.</p>
<p>Pour les séances avec jeunes enfants ou bébés, le Photographe s'adaptera au rythme des petits (pauses, repas, changes). La durée pourra être prolongée sans surcoût si nécessaire.</p>
<p>Le Client s'engage à informer le Photographe de toute particularité (enfant en bas âge, personne à mobilité réduite, animal de compagnie, etc.).</p>

<h3>ARTICLE 5 – TARIFS ET RÈGLEMENT</h3>
<p>Montant total de la prestation : <strong>{{montant_total}} €</strong></p>
<p>Acompte à la réservation (30%) : <strong>{{montant_acompte}} €</strong></p>
<p>Solde dû le jour de la séance : <strong>{{montant_solde}} €</strong></p>
<p>Modes de paiement acceptés : virement bancaire, carte bancaire, espèces.</p>
<p>L'acompte versé est non remboursable sauf cas de force majeure.</p>

<h3>ARTICLE 6 – DROITS D'AUTEUR ET D'UTILISATION</h3>
<p>Conformément au Code de la propriété intellectuelle, le Photographe conserve l'intégralité de ses droits d'auteur.</p>
<p>Le Client bénéficie d'un droit d'utilisation strictement personnel et privé : tirages, albums, partage familial, réseaux sociaux personnels.</p>
<p>Toute utilisation commerciale est interdite sans accord écrit et rémunération complémentaire.</p>

<h3>ARTICLE 7 – DROIT À L'IMAGE</h3>
<p>Le Client autorise / n'autorise pas (rayer la mention inutile) le Photographe à utiliser les images réalisées lors de la séance pour sa promotion : site web, réseaux sociaux, portfolio, concours photo.</p>
<p><strong>Pour les photos de mineurs :</strong> L'autorisation de diffusion doit être signée par les deux parents ou le titulaire de l'autorité parentale. En l'absence d'autorisation explicite, aucune photo d'enfant mineur ne sera publiée.</p>

<h3>ARTICLE 8 – REPORT ET ANNULATION</h3>
<p>Report gratuit et illimité en cas de maladie d'un enfant (sur justificatif médical).</p>
<p>Report pour convenance personnelle : gratuit si prévenu au moins 7 jours à l'avance.</p>
<p>Annulation par le Client : l'acompte reste acquis au Photographe.</p>
<p>Annulation par le Photographe : remboursement intégral des sommes versées.</p>

<h3>ARTICLE 9 – LIVRAISON</h3>
<p>Délai de livraison : <strong>{{delai_livraison}}</strong> à compter de la séance.</p>
<p>Les photos sont livrées via une galerie en ligne sécurisée, accessible pendant 30 jours.</p>
<p>Le Client peut commander des tirages et albums supplémentaires selon la grille tarifaire en vigueur.</p>

<h3>ARTICLE 10 – RESPONSABILITÉ</h3>
<p>Le Photographe ne pourra être tenu responsable en cas de défaillance technique indépendante de sa volonté.</p>
<p>Le Photographe assure la surveillance et la sécurité des enfants pendant les prises de vue uniquement dans le cadre de la direction artistique. La responsabilité parentale demeure à la charge du Client.</p>

<h3>ARTICLE 11 – PROTECTION DES DONNÉES (RGPD)</h3>
<p>Les données personnelles collectées sont traitées conformément au Règlement Général sur la Protection des Données (RGPD).</p>
<p>Les photos de mineurs font l'objet d'une protection renforcée. Elles ne seront ni cédées ni communiquées à des tiers sans autorisation parentale.</p>
<p>Contact DPO : {{photographer_email}}</p>

<h3>ARTICLE 12 – CLAUSES PARTICULIÈRES</h3>
<p>{{clauses_particulieres}}</p>

<h3>ARTICLE 13 – DROIT APPLICABLE</h3>
<p>Le présent contrat est soumis au droit français. Tout litige sera porté devant les tribunaux compétents du ressort du domicile du Photographe.</p>

<p><br/><em>Fait en deux exemplaires originaux, le {{date}}.</em></p>
`;

// Grossesse template
const grossesseTemplate = `
<h2>CONTRAT DE PRESTATION PHOTOGRAPHIQUE - GROSSESSE & NAISSANCE</h2>

<h3>ARTICLE 1 – PARTIES</h3>
<p><strong>Le Photographe :</strong><br/>
{{photographer_name}}<br/>
SIRET : {{photographer_siret}}<br/>
Adresse : {{photographer_address}}<br/>
Téléphone : {{photographer_phone}} — E-mail : {{photographer_email}}</p>

<p><strong>Le Client :</strong><br/>
{{client_name}}<br/>
Adresse : {{client_address}}<br/>
Téléphone : {{client_phone}} — E-mail : {{client_email}}</p>

<h3>ARTICLE 2 – OBJET</h3>
<p>Le Photographe s'engage à réaliser une séance photo maternité et/ou naissance au profit du Client, dans les conditions définies ci-après.</p>

<h3>ARTICLE 3 – DESCRIPTION DE LA PRESTATION</h3>
<ul>
  <li>Type de séance : {{formule_choisie}}</li>
  <li>Durée prévue : {{duree_seance}}</li>
  <li>Nombre de photos livrées (minimum) : {{nombre_photos}}</li>
  <li>Lieu : {{lieu_seance}} — Date prévisionnelle : {{date_seance}}</li>
  <li>Séance en studio ou à domicile selon la formule choisie</li>
  <li>Pour séance nouveau-né : poses sécurisées, expérience nouveau-né certifiée</li>
  <li>Accessoires et mise en scène fournis (séance studio)</li>
  <li>Retouche artistique poussée (peau, lumière, ambiance)</li>
  <li>Livraison en haute définition via galerie en ligne sécurisée</li>
</ul>
<p>Options supplémentaires éventuelles : {{options_supplementaires}}</p>

<h3>ARTICLE 4 – ORGANISATION ET SÉCURITÉ</h3>
<p>La séance sera organisée selon les réponses fournies au questionnaire préalable.</p>
<p><strong>Séance maternité :</strong> idéalement réalisée entre la 30e et la 36e semaine de grossesse. Le Photographe adaptera les poses au confort de la future maman.</p>
<p><strong>Séance nouveau-né :</strong> la date sera confirmée après la naissance, idéalement dans les 5 à 12 premiers jours de vie. Le Photographe garantit la sécurité du bébé à tout moment : température de la pièce contrôlée, poses sécurisées, pauses fréquentes.</p>
<p>Le Client s'engage à informer le Photographe de toute particularité médicale.</p>

<h3>ARTICLE 5 – TARIFS ET RÈGLEMENT</h3>
<p>Montant total de la prestation : <strong>{{montant_total}} €</strong></p>
<p>Acompte à la réservation (30%) : <strong>{{montant_acompte}} €</strong></p>
<p>Solde dû le jour de la séance : <strong>{{montant_solde}} €</strong></p>
<p>Modes de paiement acceptés : virement bancaire, carte bancaire, espèces.</p>
<p>L'acompte versé est non remboursable sauf cas de force majeure ou motif médical.</p>

<h3>ARTICLE 6 – DROITS D'AUTEUR ET D'UTILISATION</h3>
<p>Conformément au Code de la propriété intellectuelle, le Photographe conserve l'intégralité de ses droits d'auteur.</p>
<p>Le Client bénéficie d'un droit d'utilisation strictement personnel et privé.</p>
<p>Toute utilisation commerciale est interdite sans accord écrit préalable.</p>

<h3>ARTICLE 7 – DROIT À L'IMAGE</h3>
<p>En raison de la nature intime des photos de grossesse et de nouveau-né, le Photographe s'engage à ne diffuser <strong>aucune image</strong> sans le consentement écrit et explicite du Client.</p>
<p>Le Client autorise / n'autorise pas (rayer la mention inutile) le Photographe à utiliser certaines images pour sa promotion.</p>
<p><strong>Photos de nouveau-nés :</strong> autorisation parentale obligatoire signée par les deux parents.</p>

<h3>ARTICLE 8 – REPORT ET ANNULATION</h3>
<p><strong>Report gratuit et illimité</strong> pour toute raison médicale liée à la grossesse, à l'accouchement ou à la santé du bébé (sur justificatif).</p>
<p>Report pour convenance personnelle : gratuit si prévenu au moins 7 jours à l'avance.</p>
<p>Annulation par le Client hors motif médical : l'acompte reste acquis au Photographe.</p>
<p>Annulation par le Photographe : remboursement intégral des sommes versées.</p>

<h3>ARTICLE 9 – LIVRAISON</h3>
<p>Délai de livraison : <strong>{{delai_livraison}}</strong> à compter de la séance.</p>
<p>Les photos sont livrées via une galerie en ligne sécurisée, accessible pendant 30 jours.</p>

<h3>ARTICLE 10 – RESPONSABILITÉ</h3>
<p>Le Photographe ne pourra être tenu responsable en cas de défaillance technique indépendante de sa volonté.</p>
<p>Le Photographe est formé à la manipulation de nouveau-nés et s'engage à respecter les protocoles de sécurité. Toutefois, un parent doit rester présent à tout moment pendant la séance.</p>

<h3>ARTICLE 11 – PROTECTION DES DONNÉES (RGPD)</h3>
<p>Les données personnelles collectées sont traitées conformément au RGPD.</p>
<p>Les photos de nouveau-nés et de femmes enceintes font l'objet d'une protection renforcée et ne seront ni cédées ni communiquées à des tiers.</p>
<p>Contact DPO : {{photographer_email}}</p>

<h3>ARTICLE 12 – CLAUSES PARTICULIÈRES</h3>
<p>{{clauses_particulieres}}</p>

<h3>ARTICLE 13 – DROIT APPLICABLE</h3>
<p>Le présent contrat est soumis au droit français. Tout litige sera porté devant les tribunaux compétents du ressort du domicile du Photographe.</p>

<p><br/><em>Fait en deux exemplaires originaux, le {{date}}.</em></p>
`;

// Immobilier template
const immobilierTemplate = `
<h2>CONTRAT DE PRESTATION PHOTOGRAPHIQUE - IMMOBILIER</h2>

<h3>ARTICLE 1 – PARTIES</h3>
<p><strong>Le Photographe :</strong><br/>
{{photographer_name}}<br/>
SIRET : {{photographer_siret}}<br/>
Adresse : {{photographer_address}}<br/>
Téléphone : {{photographer_phone}} — E-mail : {{photographer_email}}</p>

<p><strong>Le Client :</strong><br/>
{{client_name}}<br/>
Adresse : {{client_address}}<br/>
Téléphone : {{client_phone}} — E-mail : {{client_email}}</p>

<h3>ARTICLE 2 – OBJET</h3>
<p>Le Photographe s'engage à réaliser des photographies immobilières professionnelles pour le compte du Client, dans les conditions définies ci-après.</p>

<h3>ARTICLE 3 – DESCRIPTION DE LA PRESTATION</h3>
<ul>
  <li>Type de prestation : {{formule_choisie}}</li>
  <li>Durée estimée de l'intervention : {{duree_seance}}</li>
  <li>Nombre de photos livrées (minimum) : {{nombre_photos}}</li>
  <li>Adresse du bien : {{lieu_seance}} — Date : {{date_seance}}</li>
  <li>Photographie intérieure et extérieure du bien</li>
  <li>Traitement HDR professionnel</li>
  <li>Correction de la perspective, de la luminosité et des couleurs</li>
  <li>Livraison aux formats adaptés : web (optimisé annonces), print (haute définition)</li>
</ul>
<p>Options supplémentaires éventuelles : {{options_supplementaires}} (visite virtuelle 360°, drone, vidéo, plans 2D/3D)</p>

<h3>ARTICLE 4 – ORGANISATION</h3>
<p>L'intervention sera organisée selon les détails fournis dans le questionnaire préalable.</p>
<p>Le Client s'engage à :</p>
<ul>
  <li>Fournir les clés ou accès au bien le jour convenu</li>
  <li>Préparer le bien : rangement, propreté, éclairages fonctionnels</li>
  <li>Signaler tout accès restreint, alarme ou code d'entrée</li>
</ul>
<p>Rayon de déplacement inclus : {{rayon_deplacement}}. Au-delà : supplément de {{tarif_km}} €/km.</p>

<h3>ARTICLE 5 – TARIFS ET RÈGLEMENT</h3>
<p>Montant total HT : <strong>{{montant_total}} €</strong></p>
<p>TVA (20%) : <strong>{{montant_tva}} €</strong></p>
<p>Montant total TTC : <strong>{{montant_ttc}} €</strong></p>
<p>Paiement à réception de facture, sous 15 jours.</p>
<p>En cas de retard de paiement, des pénalités de retard seront appliquées conformément à la loi.</p>

<h3>ARTICLE 6 – DROITS D'AUTEUR ET D'UTILISATION</h3>
<p>Le Photographe conserve l'intégralité de ses droits d'auteur conformément au Code de la propriété intellectuelle.</p>
<p>Le Client bénéficie d'un droit d'utilisation des photos pour la vente, la location et la promotion du bien concerné uniquement.</p>
<p>Le Photographe peut utiliser les images dans son portfolio professionnel.</p>
<p>Les photos ne peuvent être revendues, cédées ou utilisées pour un autre bien sans accord écrit.</p>

<h3>ARTICLE 7 – REPORT ET ANNULATION</h3>
<p>Report ou annulation gratuit sous 24h de préavis.</p>
<p>En deçà de 24h : 50% du montant total sera facturé.</p>
<p>Annulation par le Photographe : report sans frais à la date la plus proche disponible.</p>

<h3>ARTICLE 8 – LIVRAISON</h3>
<p>Délai de livraison : <strong>{{delai_livraison}}</strong> à compter de la prise de vue.</p>
<p>Livraison via lien de téléchargement sécurisé, accessible pendant 30 jours.</p>
<p>Retouches supplémentaires (hors prestation initiale) : sur devis.</p>

<h3>ARTICLE 9 – RESPONSABILITÉ</h3>
<p>Le Photographe ne pourra être tenu responsable en cas d'impossibilité d'accès au bien ou de conditions météorologiques défavorables pour les prises de vue extérieures.</p>
<p>En cas d'intempéries, un report sera proposé sans frais supplémentaires.</p>

<h3>ARTICLE 10 – PROTECTION DES DONNÉES (RGPD)</h3>
<p>Les données personnelles collectées sont traitées conformément au RGPD. Aucune donnée relative au bien immobilier ne sera communiquée à des tiers.</p>
<p>Contact DPO : {{photographer_email}}</p>

<h3>ARTICLE 11 – CLAUSES PARTICULIÈRES</h3>
<p>{{clauses_particulieres}}</p>

<h3>ARTICLE 12 – DROIT APPLICABLE</h3>
<p>Le présent contrat est soumis au droit français. Tout litige sera porté devant les tribunaux compétents du ressort du domicile du Photographe.</p>

<p><br/><em>Fait en deux exemplaires originaux, le {{date}}.</em></p>
`;

// Produit template
const produitTemplate = `
<h2>CONTRAT DE PRESTATION PHOTOGRAPHIQUE - PRODUIT</h2>

<h3>ARTICLE 1 – PARTIES</h3>
<p><strong>Le Photographe :</strong><br/>
{{photographer_name}}<br/>
SIRET : {{photographer_siret}}<br/>
Adresse : {{photographer_address}}<br/>
Téléphone : {{photographer_phone}} — E-mail : {{photographer_email}}</p>

<p><strong>Le Client :</strong><br/>
{{client_name}}<br/>
Adresse : {{client_address}}<br/>
Téléphone : {{client_phone}} — E-mail : {{client_email}}</p>

<h3>ARTICLE 2 – OBJET</h3>
<p>Le Photographe s'engage à réaliser des photographies de produits pour le compte du Client, dans les conditions définies ci-après.</p>

<h3>ARTICLE 3 – DESCRIPTION DE LA PRESTATION</h3>
<ul>
  <li>Type de prestation : {{formule_choisie}}</li>
  <li>Durée estimée : {{duree_seance}}</li>
  <li>Nombre de photos livrées (minimum) : {{nombre_photos}}</li>
  <li>Lieu : {{lieu_seance}} — Date : {{date_seance}}</li>
  <li>Prises de vue selon le brief défini au questionnaire</li>
  <li>Packshot fond blanc et/ou mise en scène lifestyle</li>
  <li>Retouche professionnelle, détourage, ombrage si nécessaire</li>
  <li>Livraison aux formats et dimensions requis (web e-commerce, print catalogue, réseaux sociaux)</li>
</ul>
<p>Options supplémentaires éventuelles : {{options_supplementaires}} (vidéo 360°, animation stop-motion, flat lay)</p>

<h3>ARTICLE 4 – ORGANISATION</h3>
<p>Le Client fournit les produits à photographier en parfait état, ainsi qu'un brief détaillé (mood board, charte graphique, exemples souhaités).</p>
<p>Tout produit fragile ou de grande valeur reste sous la responsabilité du Client pendant toute la durée de la séance.</p>
<p>Le Client s'engage à fournir les produits au minimum 24h avant la séance si une préparation est nécessaire.</p>

<h3>ARTICLE 5 – TARIFS ET RÈGLEMENT</h3>
<p>Montant total HT : <strong>{{montant_total}} €</strong></p>
<p>TVA (20%) : <strong>{{montant_tva}} €</strong></p>
<p>Montant total TTC : <strong>{{montant_ttc}} €</strong></p>
<p>Paiement : 50% à la commande (<strong>{{montant_acompte}} €</strong>), 50% à la livraison (<strong>{{montant_solde}} €</strong>).</p>
<p>En cas de retard de paiement, des pénalités de retard seront appliquées conformément à la loi.</p>

<h3>ARTICLE 6 – DROITS D'AUTEUR ET D'UTILISATION</h3>
<p>Le Photographe conserve l'intégralité de ses droits d'auteur conformément au Code de la propriété intellectuelle.</p>
<p>Le Client bénéficie d'un droit d'utilisation commerciale illimité des photos pour les produits concernés : site e-commerce, marketplace, catalogues, publicité, réseaux sociaux.</p>
<p>La revente des photos à des tiers est interdite sans accord écrit.</p>
<p>Le Photographe peut utiliser les images dans son portfolio professionnel, sauf clause de confidentialité (voir Article 10).</p>

<h3>ARTICLE 7 – REPORT ET ANNULATION</h3>
<p>Annulation gratuite sous 72h de préavis.</p>
<p>Passé ce délai : 50% du montant total sera facturé.</p>
<p>Annulation par le Photographe : report sans frais à la date la plus proche disponible.</p>

<h3>ARTICLE 8 – LIVRAISON</h3>
<p>Délai de livraison : <strong>{{delai_livraison}}</strong> à compter de la séance.</p>
<p>Livraison via lien de téléchargement sécurisé, accessible pendant 30 jours.</p>
<p>Retouches supplémentaires (hors prestation initiale) : sur devis.</p>

<h3>ARTICLE 9 – RESPONSABILITÉ</h3>
<p>Le Photographe ne pourra être tenu responsable en cas de dommage aux produits survenu pendant la séance, sauf faute avérée de sa part.</p>
<p>Le Client est invité à souscrire une assurance pour les produits de valeur.</p>

<h3>ARTICLE 10 – CONFIDENTIALITÉ</h3>
<p>Le Photographe s'engage à traiter comme confidentiels les produits non encore commercialisés, les prototypes, et toute information sensible communiquée dans le cadre de la prestation.</p>
<p>Cette obligation de confidentialité s'applique pendant une durée de {{duree_cession_droits}} à compter de la signature du contrat.</p>

<h3>ARTICLE 11 – PROTECTION DES DONNÉES (RGPD)</h3>
<p>Les données personnelles collectées sont traitées conformément au RGPD.</p>
<p>Contact DPO : {{photographer_email}}</p>

<h3>ARTICLE 12 – CLAUSES PARTICULIÈRES</h3>
<p>{{clauses_particulieres}}</p>

<h3>ARTICLE 13 – DROIT APPLICABLE</h3>
<p>Le présent contrat est soumis au droit français. Tout litige sera porté devant les tribunaux compétents du ressort du domicile du Photographe.</p>

<p><br/><em>Fait en deux exemplaires originaux, le {{date}}.</em></p>
`;

// Insert templates
insertTemplate.run(uuidv4(), null, 'Contrat standard', genericTemplate);
console.log('  ✓ Template: Contrat standard');

if (mariageId) {
  insertTemplate.run(uuidv4(), mariageId, 'Contrat Mariage', mariageTemplate);
  console.log('  ✓ Template: Contrat Mariage');
}

if (fiancaillesId) {
  insertTemplate.run(uuidv4(), fiancaillesId, 'Contrat Fiançailles', fiancaillesTemplate);
  console.log('  ✓ Template: Contrat Fiançailles');
}

if (portraitId) {
  insertTemplate.run(uuidv4(), portraitId, 'Contrat Portrait', portraitTemplate);
  console.log('  ✓ Template: Contrat Portrait');
}

if (entrepriseId) {
  insertTemplate.run(uuidv4(), entrepriseId, 'Contrat Entreprise', entrepriseTemplate);
  console.log('  ✓ Template: Contrat Entreprise');
}

if (evenementId) {
  insertTemplate.run(uuidv4(), evenementId, 'Contrat Événement', evenementTemplate);
  console.log('  ✓ Template: Contrat Événement');
}

if (familleId) {
  insertTemplate.run(uuidv4(), familleId, 'Contrat Famille', familleTemplate);
  console.log('  ✓ Template: Contrat Famille');
}

if (grossesseId) {
  insertTemplate.run(uuidv4(), grossesseId, 'Contrat Grossesse & Naissance', grossesseTemplate);
  console.log('  ✓ Template: Contrat Grossesse & Naissance');
}

if (immobilierId) {
  insertTemplate.run(uuidv4(), immobilierId, 'Contrat Immobilier', immobilierTemplate);
  console.log('  ✓ Template: Contrat Immobilier');
}

if (produitId) {
  insertTemplate.run(uuidv4(), produitId, 'Contrat Produit', produitTemplate);
  console.log('  ✓ Template: Contrat Produit');
}

// ═══════════════════════════════════════════════════════════════════

console.log('\n✅ Seeding completed successfully!');
console.log('\nData inserted:');
console.log(`  - ${eventTypes.length} event types (including Fiançailles)`);
console.log('  - Questionnaire questions for all event types');
console.log('  - Contract templates for every event type');

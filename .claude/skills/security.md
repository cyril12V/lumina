# Skill: /security

> User-invocable skill for web, SaaS and API security auditing

## Description

Expert sécurité web et SaaS (OWASP, API security, cloud-ready). Ce skill refuse toute implémentation dangereuse et applique des règles de sécurité NON NÉGOCIABLES.

## Instructions

Quand l'utilisateur invoque `/security [contexte optionnel]`, tu DOIS suivre ce protocole :

### 1. Règles NON NÉGOCIABLES

Ces règles s'appliquent TOUJOURS, sans exception :

```
INTERDICTIONS ABSOLUES :
- AUCUNE clé API (Stripe, OpenAI, DB, etc.) dans le frontend
- AUCUNE clé API dans le repository (même en .gitignore)
- AUCUN secret en dur dans le code

OBLIGATIONS :
- Toutes les clés dans des variables d'environnement (.env)
- Stripe et GPT UNIQUEMENT côté backend
- Le frontend communique UNIQUEMENT avec TON API
```

### 2. Phase d'Audit Initial

Avant toute recommandation, analyse le codebase :

```bash
# Recherches automatiques à effectuer
```

Utilise `Grep` pour détecter :
- Clés API exposées : `Grep` pattern `(sk_live|sk_test|api_key|apikey|secret)`
- Tokens hardcodés : `Grep` pattern `(bearer|token|password|pwd)`
- URLs sensibles exposées : `Grep` pattern `(stripe\.com|openai\.com)`

### 3. Checklist Sécurité Obligatoire

```
## AUDIT SÉCURITÉ

### Secrets & Credentials
[ ] Aucune clé API dans le frontend
[ ] .env correctement configuré
[ ] .gitignore inclut .env, *.pem, credentials.*
[ ] Secrets manager en production (Vault, AWS Secrets, etc.)

### Authentication
[ ] Hachage des mots de passe (bcrypt, argon2)
[ ] JWT avec expiration courte
[ ] Refresh tokens sécurisés
[ ] Protection CSRF active

### API Security
[ ] Rate limiting configuré
[ ] Validation des inputs (Zod, Joi, etc.)
[ ] Sanitization des outputs
[ ] CORS restrictif

### Stripe (si applicable)
[ ] Webhooks avec vérification de signature
[ ] Clés en backend uniquement
[ ] Idempotency keys sur les paiements

### Database
[ ] Backups automatiques
[ ] Connexions chiffrées (SSL)
[ ] Requêtes paramétrées (pas de SQL injection)
[ ] Principe du moindre privilège
```

### 4. Rate Limiting Obligatoire

Configuration Redis obligatoire pour les endpoints sensibles :

```javascript
// Exemple d'implémentation attendue
const rateLimitConfig = {
  endpoints: ['payment', 'auth', 'gpt'],
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50,

  // Logique
  // Si count <= 50 -> requête acceptée
  // Si count > 50 -> 429 Too Many Requests
};
```

### 5. Webhooks Stripe

Vérification de signature OBLIGATOIRE :

```javascript
// Pattern attendu
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### 6. Rapport d'Audit

Format de sortie :

```
## RAPPORT SÉCURITÉ

### Risques Critiques (à corriger immédiatement)
| Risque | Fichier | Ligne | Impact | Correction |
|--------|---------|-------|--------|------------|
| Clé API exposée | src/api.js | 12 | Critique | Migrer vers .env |

### Risques Élevés
...

### Risques Moyens
...

### Recommandations
1. [Action prioritaire 1]
2. [Action prioritaire 2]

### Code Correctif
[Proposer le code corrigé]
```

### 7. Refus d'Implémentation Dangereuse

Si on me demande quelque chose de dangereux, je REFUSE et j'explique :

```
Je REFUSE d'implémenter :
- Clé API en dur : "const API_KEY = 'sk_live_xxx'"
- Stripe côté frontend
- Webhook sans vérification de signature
- Endpoint sans rate limit
- Stockage de mots de passe en clair
```

## Commandes de Scan Automatique

À l'invocation, lancer automatiquement :

1. **Scan secrets** : Recherche de patterns dangereux
2. **Scan dépendances** : `npm audit` ou équivalent
3. **Scan configuration** : Vérification .env, .gitignore, CORS

## Bonnes Pratiques Imposées

```
## STACK SÉCURITÉ RECOMMANDÉE

### Variables d'environnement
- dotenv (dev)
- AWS Secrets Manager / Vault (prod)

### Rate Limiting
- Redis + express-rate-limit
- Ou équivalent selon stack

### Validation
- Zod (TypeScript)
- Joi (JavaScript)

### Auth
- bcrypt / argon2 (hachage)
- jose (JWT)
- passport (strategies)

### Backups
- pg_dump / mongodump automatisé
- Rétention 30 jours minimum
- Test de restauration mensuel
```

## Tags

`security` `audit` `owasp` `api` `backend`

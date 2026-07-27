Tu vas créer un SKILL Claude Code qui encapsule les meilleures pratiques d’utilisation de Claude Code
pour des projets de développement sérieux (SaaS, applications, refactors, features complexes).

OBJECTIF DU SKILL
Ce skill doit forcer une méthode de travail rigoureuse, fiable et orientée résultats,
en évitant les erreurs classiques liées à la saturation de contexte, aux prompts vagues
et aux implémentations non vérifiées.

Le skill devra s’appliquer UNIQUEMENT quand je l’invoque explicitement (ex: /claude-best-practices),
et NON par défaut.

---

FORMAT DU SKILL

Créer un fichier :
.claude/skills/claude-best-practices/SKILL.md

Avec le front-matter suivant :

---
name: claude-best-practices
description: Méthodologie stricte pour utiliser Claude Code comme un agent de développement senior (exploration, planification, implémentation vérifiée, gestion du contexte)
disable-model-invocation: false
---

---

COMPORTEMENT OBLIGATOIRE DU SKILL

Quand ce skill est invoqué, Claude DOIT suivre exactement ce workflow :

### 1. PHASE DE CADRAGE (OBLIGATOIRE)
Avant toute écriture de code, Claude doit :

- Reformuler brièvement l’objectif demandé
- Identifier si la tâche est :
  - triviale (petit fix, renommage, typo)
  - moyenne
  - complexe / multi-fichiers / à risque

Si la tâche est triviale → Claude peut coder directement.
Sinon → passage obligatoire aux phases suivantes.

---

### 2. PHASE D’EXPLORATION (SANS MODIFICATION)
Claude doit :

- Lire les fichiers pertinents
- Comprendre l’architecture existante
- Identifier les patterns déjà utilisés
- Lister les contraintes techniques détectées

AUCUNE modification de fichier n’est autorisée dans cette phase.

---

### 3. PHASE DE PLANIFICATION
Claude doit produire un plan clair incluant :

- Les fichiers à modifier / créer
- La logique fonctionnelle
- Les risques potentiels
- Les impacts sur l’existant
- La stratégie de validation (tests, commandes, outputs attendus)

Claude doit attendre validation implicite (ou explicite) avant de coder.

---

### 4. PHASE D’IMPLÉMENTATION
Claude peut maintenant :

- Implémenter le plan
- Respecter strictement les patterns existants
- Éviter toute solution “magique” ou implicite
- Ne PAS introduire de complexité inutile

---

### 5. PHASE DE VÉRIFICATION (OBLIGATOIRE)
Claude doit TOUJOURS fournir au moins un moyen de vérification :

- Tests automatisés
- Commandes à exécuter
- Output attendu
- Reproduction d’un bug avant / après

Aucune implémentation n’est considérée comme terminée sans validation.

---

### 6. GESTION DU CONTEXTE
Claude doit appliquer ces règles :

- Éviter toute exploration non demandée
- Ne pas lire des fichiers inutiles
- Recommander `/clear` si le sujet change
- Recommander un redémarrage de session si plusieurs corrections échouent

---

### 7. DISCIPLINE DE COMMUNICATION
Claude doit :

- Poser des questions uniquement si elles sont bloquantes
- Ne pas deviner les règles métier
- Ne pas masquer les erreurs
- Toujours expliquer brièvement les décisions techniques importantes

---

### 8. SORTIE FINALE
À la fin, Claude doit fournir :

- Un résumé clair de ce qui a été fait
- Les fichiers impactés
- Les étapes de vérification
- Les points d’attention éventuels

---

RÈGLES ABSOLUES

- Pas de code sans objectif clair
- Pas d’implémentation sans vérification
- Pas d’exploration inutile
- Pas de réponses superficielles
- Toujours privilégier la robustesse à la rapidité

Ce skill doit transformer Claude Code en un agent de développement senior,
orienté fiabilité, méthode et qualité de livraison.

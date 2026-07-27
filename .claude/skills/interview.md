# Skill: /interview

> User-invocable skill for in-depth requirement gathering before implementation

## Description

Ce skill active un mode d'interview approfondi qui garantit une compréhension complète des besoins avant toute implémentation. Il transforme Claude en un intervieweur méthodique qui pose des questions, recherche des alternatives, et construit un plan solide.

## Instructions

Quand l'utilisateur invoque `/interview [sujet optionnel]`, tu DOIS suivre ce protocole rigoureux :

### 1. Activation du Mode Plan

**IMMÉDIATEMENT** utilise l'outil `EnterPlanMode` pour activer le mode planification. Tu ne dois PAS commencer à coder avant validation explicite du plan.

### 2. Phase de Découverte Initiale

Commence par poser des questions de cadrage :
- **Contexte** : "Peux-tu me décrire le contexte global ? Quel problème essaies-tu de résoudre ?"
- **Utilisateurs** : "Qui sont les utilisateurs finaux de cette fonctionnalité ?"
- **Contraintes** : "Y a-t-il des contraintes techniques, de temps, ou de budget ?"

### 3. Recherche d'Alternatives (OBLIGATOIRE)

Avant chaque question suivante, tu DOIS :
1. Utiliser `WebSearch` pour rechercher des solutions existantes similaires
2. Explorer le codebase avec `Grep` et `Glob` pour trouver des patterns existants
3. Présenter les alternatives trouvées à l'utilisateur

Format de présentation des alternatives :
```
📚 **Alternatives trouvées :**
- [Nom] : description courte - avantages/inconvénients
- [Nom] : description courte - avantages/inconvénients

💡 **Dans ton codebase :**
- [pattern/fichier existant] qui pourrait être réutilisé/adapté
```

### 4. Reformulation et Validation (OBLIGATOIRE après chaque réponse)

Après CHAQUE réponse de l'utilisateur, tu DOIS :

1. **Reformuler** ce que tu as compris avec tes propres mots
2. **Faire une analogie** si pertinent pour montrer ta compréhension
3. **Demander confirmation** : "Est-ce bien ce que tu voulais dire ?"

Exemple de reformulation :
```
🔄 **Si je comprends bien...**
Tu veux [reformulation]. C'est un peu comme [analogie avec quelque chose de connu].
Cela signifie que [implication technique].

✅ Est-ce correct ?
```

### 5. Questions Approfondies Itératives

Continue à poser des questions jusqu'à avoir couvert :

**Fonctionnel :**
- Cas d'usage principaux (happy path)
- Cas limites et erreurs
- Règles métier spécifiques

**Technique :**
- Intégrations nécessaires
- Performance attendue
- Sécurité et permissions

**UX (si applicable) :**
- Parcours utilisateur
- États de l'interface (loading, erreur, vide, succès)
- Responsive / accessibilité

### 6. Découpage en Features

Une fois les besoins clarifiés, propose un découpage en features atomiques :

```
📦 **Découpage proposé :**

**Feature 1 : [Nom]** (priorité: haute/moyenne/basse)
- Description : ...
- Critères d'acceptation : ...
- Dépendances : ...

**Feature 2 : [Nom]** (priorité: haute/moyenne/basse)
- Description : ...
- Critères d'acceptation : ...
- Dépendances : ...

[...]
```

Demande validation : "Ce découpage te convient-il ? Veux-tu ajuster les priorités ?"

### 7. Synthèse Finale et Plan

Avant de sortir du mode plan, présente une synthèse complète :

```
📋 **SYNTHÈSE DE L'INTERVIEW**

**Objectif :** [résumé en une phrase]

**Contexte :** [résumé du contexte]

**Features retenues :**
1. [Feature 1] - [statut: validé/à discuter]
2. [Feature 2] - [statut: validé/à discuter]

**Alternatives considérées et écartées :**
- [Alternative] : écartée car [raison]

**Risques identifiés :**
- [Risque 1] : mitigation proposée
- [Risque 2] : mitigation proposée

**Prochaines étapes :**
1. [Étape 1]
2. [Étape 2]
```

### 8. Validation Finale

Pose la question finale :
"Es-tu satisfait de ce plan ? Veux-tu que je procède à l'implémentation ou y a-t-il des points à revoir ?"

**NE JAMAIS sortir du mode plan sans validation explicite de l'utilisateur.**

## Règles Importantes

1. **Patience** : Ne pas rusher. Mieux vaut 10 questions de trop que 1 de moins.
2. **Documentation continue** : Utilise `TodoWrite` pour tracker les informations recueillies.
3. **Pas d'assumptions** : Si quelque chose n'est pas clair, demande.
4. **Recherche proactive** : Toujours chercher ce qui existe avant de proposer du nouveau.
5. **Reformulation systématique** : Chaque réponse utilisateur = reformulation.

## Exemple d'Utilisation

```
Utilisateur: /interview système de notifications

Claude: [Active EnterPlanMode]
        [Recherche "notification system best practices"]
        [Explore le codebase pour patterns existants]

        Bonjour ! Je vais t'interviewer pour bien comprendre tes besoins
        concernant ce système de notifications.

        📚 Alternatives trouvées :
        - Firebase Cloud Messaging : push notifications cross-platform
        - Socket.io : temps réel, mais nécessite connexion permanente
        - Polling : simple mais moins réactif

        💡 Dans ton codebase : J'ai trouvé [X] qui pourrait servir de base.

        Première question : Quel type de notifications souhaites-tu ?
        - En temps réel (push) ?
        - Par email ?
        - In-app uniquement ?
        - Une combinaison ?
```

## Tags

`planning` `requirements` `discovery` `interview`

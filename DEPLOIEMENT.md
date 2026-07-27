# Déploiement gratuit

Architecture visée : **frontend statique** d'un côté, **API + base** de l'autre.

```
Navigateur ──> Frontend statique (Vercel / Netlify / Cloudflare Pages)
                      │  appels /api
                      ▼
               API Node (Render, plan gratuit)
                      │  instantané SQLite
                      ▼
               Stockage objet (Supabase Storage, ...)
```

## Pourquoi cette architecture

Tout le code d'accès aux données est **synchrone** (104 appels `db.prepare(...).get/all/run`
sans `await`). Basculer sur une base réseau — PostgreSQL, Turso, D1 — imposerait de rendre
asynchrones ces 104 appels **et** toute leur chaîne d'appel. C'est précisément la migration
qui avait laissé le projet cassé (commit `3e53586`).

La base tient donc entièrement en mémoire (sql.js) et **seules les sauvegardes sont
asynchrones** : au démarrage on télécharge le fichier `.db`, et chaque écriture programme un
renvoi différé. L'API vue par les routes ne change pas d'une ligne.

## Étapes

### 1. Stockage objet

Créer un bucket **privé** chez un fournisseur exposant un objet en lecture/écriture par
jeton porteur (Supabase Storage convient tel quel). Noter :

- l'URL complète de l'objet, ex.
  `https://<projet>.supabase.co/storage/v1/object/<bucket>/lumina.db`
- un jeton d'accès en écriture

> Vérifiez les conditions courantes de l'offre gratuite avant de vous engager : elles
> changent régulièrement et n'ont pas pu être confirmées ici.

### 2. API sur Render

[backend/render.yaml](backend/render.yaml) est prêt (`plan: free`, `rootDir: backend`).
Renseigner dans le dashboard les variables marquées `sync: false` :

| Variable | Valeur |
|---|---|
| `DATABASE_REMOTE_URL` | l'URL de l'objet de l'étape 1 |
| `DATABASE_REMOTE_TOKEN` | le jeton d'accès |
| `FRONTEND_URL` | l'URL publique du frontend (étape 3) |

`JWT_SECRET` est généré par Render. **Ne jamais le régénérer** ensuite : cela invaliderait
toutes les sessions en cours.

### 3. Frontend

Build : `npm run build` dans `frontend/` (sortie dans `frontend/dist`).
Définir `VITE_API_URL` sur l'URL publique de l'API Render.

## Deux limites à connaître

**Une seule instance.** Deux conteneurs partageant le même instantané s'écraseraient
mutuellement. Ne pas activer l'autoscaling.

**Mise en veille.** Les plans gratuits endorment le service après quelques minutes
d'inactivité : la première requête suivante est lente, le temps du réveil et du
rechargement de l'instantané.

## Garanties du mécanisme de sauvegarde

- **Écritures sérialisées** — jamais deux envois en parallèle ; une écriture survenant
  pendant un envoi en programme un nouveau.
- **Échec d'envoi non silencieux** — la base est remise en « à sauvegarder » et l'erreur
  est journalisée ; la prochaine écriture ou l'arrêt réessaie.
- **Refus de démarrer si le stockage est en panne** — si le téléchargement initial échoue
  autrement que par un `404`, le process s'arrête (code 1) au lieu de repartir sur une base
  vide qui écraserait l'instantané distant à la première écriture. Un `404` est en revanche
  traité comme un premier démarrage légitime.
- **Arrêt propre** — sur `SIGTERM`/`SIGINT`, l'instantané en attente est envoyé avant
  la sortie.

Fenêtre de perte en cas d'arrêt brutal (kill -9, panne machine) : les écritures des
2 dernières secondes (`DATABASE_SAVE_DEBOUNCE_MS`).

## Développement local

Rien à configurer : sans `DATABASE_REMOTE_URL`, la base est le fichier
`backend/data/lumina.db`, créé automatiquement au premier lancement.

```bash
npm run install:all
npm run dev          # front :3000, API :3001
```

# Historique des bugs

## 2026-07-27 — Backend impossible à démarrer : `Cannot find package 'pg'`

**Symptôme**
`npm run dev` : le frontend démarre, le backend crash immédiatement avec
`ERR_MODULE_NOT_FOUND: Cannot find package 'pg' imported from backend/src/lib/db.ts`.

**Cause racine**
Le commit `b45a395` « Revert to SQLite for MVP simplicity » n'a fait la moitié du travail :
`backend/package.json` est bien repassé de `pg` à `sql.js`, mais `backend/src/lib/db.ts`
est resté sur l'implémentation PostgreSQL. Le dépôt n'a donc jamais contenu d'adaptateur
SQLite — alors que tout le SQL du projet est en dialecte SQLite (`?` comme placeholder,
`INSERT OR IGNORE`, `datetime('now')`).

**Fix**
- `backend/src/lib/db.ts` réécrit sur `sql.js`, en conservant l'API attendue par les routes
  (`prepare().run/get/all`, `exec`, `pragma`, `saveToFile`, `close`).
- Persistance : sauvegarde différée (100 ms) + écriture atomique via fichier temporaire,
  avec flush garanti sur `exit`, `SIGINT` et `SIGTERM`.
- `backend/src/lib/schema.ts` ajouté : le schéma (30 tables + 20 index) est appliqué au
  démarrage en `IF NOT EXISTS`. Sans ça un clone frais était impossible à lancer, `data/`
  étant dans `.gitignore` et aucun `CREATE TABLE` n'existant dans le code.
- `prepare<T>()` est générique : les services typent leurs lignes au lieu de caster.

**Bug latent corrigé au passage**
L'adaptateur PostgreSQL était asynchrone alors que plusieurs appels ne l'attendaient pas.
`auth.ts:21` par exemple faisait `const existing = db.prepare(...).get(email)` sans `await` :
la valeur était une `Promise`, toujours truthy, donc **toute inscription était rejetée**
avec « Email already registered ». L'adaptateur SQLite étant synchrone, les deux styles
d'appel (`await` ou non) donnent désormais le bon résultat.

**Leçon**
Un commit « revert » qui ne touche qu'au `package.json` ne revert rien. Après tout
changement de couche de persistance : démarrer réellement le serveur et exécuter au moins
une lecture ET une écriture avant de commiter.

**Vérification**
- `npx tsc --noEmit` vert sur backend et frontend.
- Parcours navigateur complet : landing → `/auth` → connexion → dashboard, 0 erreur console.
- Écriture confirmée sur disque : compte créé via l'API et relu par un process indépendant.
- Schéma vierge validé : 50 objets, identiques à la base existante, idempotent.

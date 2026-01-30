# Lumina - L'Artisanat du Workflow Photographique

SaaS pour photographes professionnels. Gestion de sessions, galeries clients, contrats et facturation.

## Architecture

```
lumina/
├── frontend/          # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   └── lib/
│   │       └── supabase.ts
│   └── package.json
├── backend/           # Express + TypeScript + Supabase
│   ├── src/
│   │   ├── routes/
│   │   └── lib/
│   │       └── supabase.ts
│   ├── supabase/
│   │   └── schema.sql
│   └── package.json
└── package.json       # Monorepo scripts
```

## Installation

### 1. Installer les dependances

```bash
npm run install:all
```

### 2. Configurer Supabase

1. Creer un projet sur [supabase.com](https://supabase.com)
2. Copier l'URL et les cles API depuis Settings > API
3. Configurer les variables d'environnement :

**Frontend** (`frontend/.env`):
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_API_URL=http://localhost:3001
```

**Backend** (`backend/.env`):
```
PORT=3001
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...  # Service Role Key (secret!)
SUPABASE_ANON_KEY=eyJhbG...
```

### 3. Creer les tables dans Supabase

1. Aller dans SQL Editor sur Supabase
2. Copier le contenu de `backend/supabase/schema.sql`
3. Executer le script

### 4. Lancer le projet

```bash
# Lancer front et back en parallele
npm run dev

# Ou separement
npm run dev:frontend  # Port 3000
npm run dev:backend   # Port 3001
```

## Fonctionnalites

- **Authentification** : Supabase Auth (email/password)
- **Sessions photo** : CRUD complet avec statuts
- **Clients** : Gestion de la base clients
- **Galeries** : Galeries privees avec mot de passe
- **Contrats** : Generation et signature electronique
- **Photos** : Upload et tri avec IA

## Stack Technique

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS
- **Backend**: Express, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (pour les photos)

## Endpoints API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/verify` | Verify token |
| GET | `/api/users/profile/:id` | Get profile |
| PUT | `/api/users/profile/:id` | Update profile |
| GET | `/api/sessions` | List sessions |
| GET | `/api/sessions/:id` | Get session |
| POST | `/api/sessions` | Create session |
| PUT | `/api/sessions/:id` | Update session |
| DELETE | `/api/sessions/:id` | Delete session |

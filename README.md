# AURA Coaching Platform

Plateforme de suivi client pour l'accompagnement coaching d'AURA Cabinet de Conseil.

## 🚀 Déploiement rapide

### Étape 1 : Créer un projet Supabase (gratuit)

1. Aller sur [supabase.com](https://supabase.com) et créer un compte
2. Créer un nouveau projet (choisir la région `eu-west-1` pour la France)
3. Attendre que le projet soit prêt (~2 minutes)

### Étape 2 : Configurer la base de données

1. Dans Supabase, aller dans **SQL Editor**
2. Copier-coller le contenu du fichier `supabase/schema.sql`
3. Cliquer sur **Run** pour exécuter le script

### Étape 3 : Récupérer les clés API

1. Aller dans **Settings** > **API**
2. Copier :
   - **Project URL** (ex: `https://abc123.supabase.co`)
   - **anon public** key

### Étape 4 : Configurer l'application

1. Créer un fichier `.env` à la racine du projet :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anon
```

### Étape 5 : Déployer sur Vercel

1. Créer un compte sur [vercel.com](https://vercel.com)
2. Connecter votre dépôt GitHub
3. Importer le projet
4. Dans les **Environment Variables**, ajouter :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Déployer !

### Étape 6 : Configurer le sous-domaine

1. Dans Vercel, aller dans **Settings** > **Domains**
2. Ajouter `app.auracabinet.com`
3. Dans votre gestionnaire DNS (là où est hébergé auracabinet.com) :
   - Ajouter un enregistrement CNAME : `app` → `cname.vercel-dns.com`

### Étape 7 : Créer votre compte admin

1. Aller sur l'app et créer un compte avec votre email
2. Dans Supabase > SQL Editor, exécuter :

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'votre-email@example.com';
```

## 📁 Structure du projet

```
src/
├── App.tsx                 # Routage principal
├── components/
│   ├── auth/               # Composants d'authentification
│   ├── dashboard/          # Composants du dashboard
│   └── ui/                 # Composants UI réutilisables
├── contexts/
│   └── AuthContext.tsx     # Gestion de l'authentification
├── lib/
│   ├── supabase.ts        # Client Supabase
│   ├── program-data.ts    # Données des étapes
│   └── utils.ts           # Utilitaires
├── pages/
│   ├── LoginPage.tsx      # Page de connexion
│   ├── RegisterPage.tsx   # Page d'inscription
│   ├── DashboardPage.tsx  # Dashboard client
│   └── AdminPage.tsx      # Panel admin
└── types/
    └── database.ts        # Types TypeScript
```

## 🛠️ Développement local

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build de production
npm run build
```

## 📱 Fonctionnalités

### Pour les clients
- ✅ Inscription / Connexion sécurisée
- ✅ Dashboard avec progression visuelle
- ✅ Accès aux 5 étapes du programme
- ✅ Soumission de livrables (liens et fichiers)
- ✅ Suivi du statut des validations
- ✅ Notifications

### Pour l'admin
- ✅ Liste de tous les clients
- ✅ Vue détaillée par client
- ✅ Validation/Refus des soumissions
- ✅ Déblocage automatique des étapes suivantes
- ✅ Statistiques globales

## 🔧 Personnalisation

### Modifier les étapes du programme

Éditer le fichier `src/lib/program-data.ts` pour modifier :
- Titres et descriptions des étapes
- Objectifs
- Livrables demandés
- Ressources (templates, guides)

Puis mettre à jour la base de données dans `supabase/schema.sql`.

### Ajouter des notifications email

Dans Supabase, aller dans **Edge Functions** et créer une fonction pour envoyer des emails via Resend, SendGrid ou autre.

## 📧 Support

Pour toute question technique, contacter le développeur.

---

Développé avec ❤️ pour AURA Cabinet de Conseil

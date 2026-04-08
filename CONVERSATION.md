# FacturmeWeb — Résumé de la conversation de développement

> Généré le 2026-04-08. Couvre 9 sessions de travail.

---

## Session 1 — Correction du build Vercel

### Problème
Vercel crashait à la construction avec l'erreur :
```
@supabase/ssr: Your project's URL and API key are required to create a Supabase client!
```

### Cause
`lib/supabase.ts` exportait un client Supabase **au niveau du module** :
```typescript
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```
Pendant `next build`, Next.js pré-rend la page `/_not-found` côté serveur. Les variables `NEXT_PUBLIC_SUPABASE_*` n'étant pas disponibles à ce moment, le client crashait.

### Fix appliqué — `lib/supabase.ts`
```typescript
import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}
```

### Fichiers mis à jour pour utiliser `getSupabaseClient()`
- `stores/authStore.ts`
- `stores/dataStore.ts`
- `stores/crmStore.ts`
- `app/(auth)/callback/page.tsx`
- `app/(app)/settings/page.tsx`

**Règle à retenir :** Ne jamais exporter un client Supabase browser comme constante de module dans une app Next.js. Toujours utiliser une factory lazily initialisée.

---

## Session 2 — Ajout de toutes les fonctionnalités manquantes

### 1. PDF multi-devises + coordonnées bancaires (`lib/pdf.ts`)
- Formatage monétaire via `Intl.NumberFormat` avec la devise et locale du profil
- Bloc IBAN/BIC ajouté en bas de facture (si renseigné)

### 2. Templates d'email HTML (`app/api/send-invoice/route.ts`)
- Réécriture complète de l'email avec layout responsive
- Tableau des articles, totaux, infos bancaires, bouton CTA, footer brandé
- Flag `isReminder: true` pour les emails de relance

### 3. Relances automatiques (`app/api/send-reminder/route.ts`)
- Nouvel endpoint qui appelle `/api/send-invoice` avec `isReminder: true`
- Bouton ajouté sur la page de détail d'une facture (visible si statut = `sent` ou `overdue`)
- Toast de confirmation affiché

### 4. Page de partage public (`app/share/[invoiceId]/page.tsx`)
- Page publique sans authentification requise
- API : `app/api/share/[invoiceId]/route.ts` (retourne données sanitisées)
- Middleware mis à jour pour autoriser `/share/` et `/api/share/`
- Bouton "Partager" ajouté au menu de détail facture

### 5. Export CSV (`lib/utils.ts` + pages)
- Fonction `downloadCSV()` avec encodage BOM UTF-8
- Bouton d'export sur la page des factures
- Bouton d'export sur la page des clients

### 6. Export FEC comptable (`app/api/export/fec/route.ts`)
- Format DGFiP conforme (séparé par tabulations)
- Journal VT (ventes) : comptes 411000, 706000, 445710
- Journal BQ (paiements) : comptes 512000, 411000
- Nom de fichier : `FEC{SIREN}{ANNEE}1231.txt`
- Boutons dans la page paramètres (année courante + année précédente)

### 7. Validation SIRET / TVA (`lib/utils.ts`)
```typescript
export function validateSiret(siret: string): boolean {
  return /^\d{14}$/.test(siret.replace(/\s/g, ''));
}
export function validateVatNumber(vat: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{2}[0-9]{9}$/.test(vat.replace(/\s/g, ''));
}
```

### 8. Onboarding complet (4 étapes)
| Étape | Fichier | Contenu |
|-------|---------|---------|
| 1 | `onboarding/language/page.tsx` | Choix de la langue |
| 2 | `onboarding/company/page.tsx` | Infos entreprise |
| 3 | `onboarding/address/page.tsx` | Adresse + coordonnées bancaires |
| 4 | `onboarding/template/page.tsx` | Choix du modèle de facture |
| ✓ | `onboarding/done/page.tsx` | Marque `onboarding_done: true` en BDD |

---

## Session 3 — Push sur GitHub

### Solution finale
```bash
git remote set-url origin https://github.com/A0ik/FacturmeWeb.git
git push --set-upstream origin main --force
```

---

## Session 4 — Correction faille sécurité Next.js (CVE-2025-66478)

Mise à jour vers `next: "15.5.14"` (dernière version stable).

---

## Session 5 — Erreur runtime Vercel

### Cause
Variables d'environnement Supabase non configurées sur Vercel.

### Solution
Dans Vercel → Project → Settings → Environment Variables, ajouter :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Puis Redeploy.

---

## Session 6 — Intégration composants UI modernes

### Packages installés
```bash
npm install framer-motion @iconify/react @radix-ui/react-dropdown-menu @radix-ui/react-avatar @radix-ui/react-slot class-variance-authority
```

### Composants créés dans `components/ui/`
| Fichier | Description |
|---------|-------------|
| `avatar.tsx` | Avatar Radix UI avec fallback initiales |
| `dropdown-menu.tsx` | DropdownMenu Radix UI complet |
| `modern-mobile-menu.tsx` | Menu mobile animé avec routing Next.js |
| `user-dropdown.tsx` | Dropdown utilisateur (statut, profil, upgrade, logout) |
| `auth-page.tsx` | Page auth full-page avec animation SVG |
| `progress-indicator.tsx` | Indicateur de progression animé (framer-motion) |

> Note : `@iconify/react` installé puis abandonné — remplacé par Lucide car les icônes Solar nécessitent un CDN externe non disponible en SSR.

---

## Session 7 — Correction bugs + Redesign premium

### Problèmes corrigés
1. **UserDropdown cassé** — `@iconify/react` remplacé intégralement par Lucide
2. **Paywall jamais visible** — banner proactif ajouté sur factures et dashboard
3. **Design insuffisant** — redesign premium complet
4. **Logo inexistant** — nouveau composant `Logo.tsx`

### Nouveau composant Logo (`components/ui/Logo.tsx`)
```tsx
<Logo size="md" variant="full" dark />   // → "Factu.me" avec icon
<Logo size="sm" variant="icon" />        // → icon seul
```

### Redesigns effectués
- **Sidebar** : fond gray-950, logo Factu.me, upgrade banner glassmorphism
- **Paywall** : toggle mensuel/annuel, carte Pro dark, trust signals Stripe
- **Dashboard** : dégradé CA, icônes colorées, chart amélioré
- **Layout mobile** : barre sticky top avec logo

---

## Session 8 — Redesign complet UI/UX premium

### Sidebar (`components/layout/Sidebar.tsx`)
- `h-screen sticky top-0` — profil **toujours visible en bas**, jamais scrollable
- Widget "Aperçu rapide" dans la nav : payées / en attente / en retard en live
- Badge rouge sur "Factures" si factures en retard
- Icône active avec fond coloré + barre gauche verte animée
- Indicateur plan (Gratuit / Solo / Pro) sous le nom

### Page Factures (`app/(app)/invoices/page.tsx`)
- **4 cartes stats** : total documents, revenus encaissés, en attente, en retard
- Panneau filtres dépliant avec pills de statut colorés + filtre type
- Tableau enrichi : icône type doc, HT en sous-titre, flèche hover, footer total sélection
- Raccourci "+ Devis" dans la barre d'action

### Page Clients (`app/(app)/clients/page.tsx`)
- **3 cartes stats** : total clients, CA encaissé, moyenne factures/client
- **Toggle Grille / Liste** — vue tableau complète
- Cartes enrichies : revenus, montant en attente, factures, badge "Client actif"
- Carte "+ Ajouter un client" dans la grille
- Avatars avec dégradés uniques

### Page Pipeline CRM (`app/(app)/crm/page.tsx`)
- **4 cartes stats** : pipeline pondéré, deals gagnés, taux de conversion, négociation
- **Barre de probabilité animée** sur chaque carte kanban
- Actions rapides : Modifier / ✓ Gagné / Supprimer
- Drop zone avec highlight visuel
- Modal enrichie avec barre live + valeur attendue calculée

### Page Création facture (`app/(app)/invoices/new/page.tsx`)
- **Layout 2 colonnes** : formulaire gauche, récapitulatif sticky droite
- **Panneau récap dark** : total TTC, détail HT/TVA, liste lignes
- Sélecteur type redesigné avec description
- Boutons délai rapide (J+15, J+30, J+45, J+60)
- Réorganisation lignes (flèches ↑↓)
- Suggestions clients avec avatar
- État succès animé sur le bouton CTA

---

## Session 9 — Workspace équipe, Notifications, Aide, Compte

### Base de données (Supabase — projet `ggrwyfhptxwpahwkeoyj`)
4 nouvelles tables créées via migration MCP :

```sql
-- workspaces : id, name, slug, owner_id, description, logo_url, plan, settings
-- workspace_members : workspace_id, user_id, email, role, status, invited_by, joined_at
-- workspace_invitations : workspace_id, email, role, token (unique), expires_at, accepted_at
-- notifications : user_id, type, title, body, link, read, data
```

RLS activé sur toutes les tables. Index sur les colonnes critiques.

### `stores/workspaceStore.ts` (nouveau)
Store Zustand complet avec :
- `fetchWorkspace(userId)` — charge workspace + membres + invitations
- `createWorkspace(name, description)` — crée le workspace
- `inviteMember(email, role)` — crée invitation + membre pending + envoie email Brevo
- `updateMemberRole(memberId, role)` — change le rôle
- `removeMember(memberId)` — retire le membre + supprime invitation pending
- `fetchNotifications(userId)` — charge les 50 dernières notifs
- `markRead(id)` / `markAllRead()` — marque comme lu
- `createNotification(...)` — crée une notif

### Page Workspace (`app/(app)/workspace/page.tsx`)
**État sans workspace :**
- Hero sombre avec 3 feature cards (Rôles, Invitations, Données partagées)
- Bouton "Créer mon workspace" → modal

**État avec workspace :**
- Onglets Membres / Paramètres
- Ligne propriétaire avec badge Crown
- Liste membres avec avatar coloré, badge statut, sélecteur rôle inline (si owner)
- Invitations en attente (bloc doré) avec bouton "Copier le lien"
- Guide des rôles (4 cards)
- Tableau des permissions par rôle (8 actions × 4 rôles)
- Zone de danger : suppression workspace

### Page Accepter invitation (`app/workspace/join/page.tsx`)
- Page publique (whitelistée dans le middleware)
- Vérifie le token en base, affiche infos workspace + rôle
- Bouton Accepter → met à jour `workspace_members.status = 'active'`
- Gère les cas : expiré, déjà accepté, token invalide
- **Fix Vercel build** : `useSearchParams()` isolé dans `<JoinContent>` enveloppé par `<Suspense>`

### API workspace (`app/api/workspace/invite/route.ts`)
- Authentification session obligatoire
- Récupère le profil de l'inviteur
- Envoie email HTML responsive via Brevo (avec lien d'invitation + rôle)

### Page Aide (`app/(app)/help/page.tsx`)
- Barre de recherche full-text dans les FAQs
- **10 catégories** avec icône colorée : Démarrage, Facturation, Clients, Dictée IA, Récurrentes, Pipeline, Comptabilité, Abonnements, Workspace, Sécurité & RGPD
- **56 questions/réponses** rédigées
- Filtres par catégorie (pills cliquables)
- FAQ accordion animé (open/close)
- Bloc contact : email support, GitHub Issues, version actuelle

### Page Notifications (`app/(app)/notifications/page.tsx`)
- Liste groupée Aujourd'hui / Plus ancien
- Icône + couleur par type (paiement, retard, invitation, système)
- Point bleu sur les non lues
- Bouton "Tout marquer comme lu"
- Auto-génération de notifs pour les factures en retard au chargement
- Bloc tips notifications push

### Sidebar mise à jour (`components/layout/Sidebar.tsx`)
- Section "Outils" : Workspace, Notifications (badge bleu), Aide, Paramètres
- Badge rouge sur Factures (overdue) + badge bleu sur Notifications (unread)
- `fetchNotifications` appelé au mount pour le badge live

### Settings — Suppression de compte sécurisée (`app/(app)/settings/page.tsx`)
- **Modal de confirmation** avec :
  - Liste des données qui seront supprimées
  - Champ texte : l'utilisateur doit taper `SUPPRIMER` exactement
  - Bouton désactivé (`disabled`) tant que la confirmation est incorrecte
  - État de chargement (spinner) pendant la suppression
- Bouton déconnexion séparé, plus visible

### Middleware (`middleware.ts`)
- Routes protégées étendues : `/workspace`, `/notifications`, `/help`
- `/workspace/join` ajouté en liste blanche (page publique)

---

## Variables d'environnement nécessaires sur Vercel

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `BREVO_SMTP_KEY` | Brevo → SMTP & API |
| `BREVO_SENDER_EMAIL` | Ton email vérifié Brevo |
| `BREVO_SENDER_NAME` | Ex: "Factu.me" |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys |
| `STRIPE_SOLO_PRICE_ID` | Stripe → Products (Solo €9/mo) |
| `STRIPE_PRO_PRICE_ID` | Stripe → Products (Pro €19/mo) |
| `GROQ_API_KEY` | console.groq.com |
| `OPENROUTER_API_KEY` | openrouter.ai |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | idem |
| `NEXT_PUBLIC_APP_URL` | Ex: `https://facturme.app` (utilisé pour les liens d'invitation workspace) |

---

## État actuel du projet

### Ce qui fonctionne
- Build Vercel : 36/36 pages statiques ✓
- Version Next.js : 15.5.14 (sans vulnérabilités connues) ✓
- Code pushé sur GitHub : `A0ik/FacturmeWeb` ✓
- Toutes les fonctionnalités de facturation ✓
- Design premium dark sidebar ✓
- Profil toujours visible en bas du menu ✓
- Workspace équipe avec rôles et invitations ✓
- Notifications avec badge live ✓
- Page d'aide avec 56 Q/R ✓
- Suppression de compte sécurisée (confirmation textuelle) ✓
- Page d'acceptation d'invitation publique ✓

### Ce qu'il reste à configurer (hors code)
1. **Variables d'environnement Vercel** (voir tableau ci-dessus)
2. **Projet Supabase** déjà créé : `ggrwyfhptxwpahwkeoyj` (eu-west-3, Paris)
3. **Tables SQL déjà créées** via migration MCP : profiles, clients, invoices, recurring_invoices, opportunities, workspaces, workspace_members, workspace_invitations, notifications
4. **Stripe** : créer produits Solo (9€) et Pro (19€), renseigner les Price IDs

---

## Architecture des fichiers clés

```
FacturmeWeb/
├── app/
│   ├── (app)/
│   │   ├── layout.tsx          # Sidebar + BottomNav + mobile top bar
│   │   ├── dashboard/          # Dashboard premium avec stats
│   │   ├── invoices/           # 4 stats cards + filtres + table enrichie
│   │   │   ├── [id]/           # Détail facture (relance, partage, PDF)
│   │   │   └── new/            # Création 2 colonnes + récap sticky
│   │   ├── clients/            # Grille/liste + stats + CA par client
│   │   ├── crm/                # Kanban + probability bars + win rate
│   │   ├── recurring/          # Factures récurrentes
│   │   ├── workspace/          # ← NOUVEAU membres + rôles + invitations
│   │   ├── notifications/      # ← NOUVEAU centre de notifications
│   │   ├── help/               # ← NOUVEAU 56 Q/R + recherche
│   │   ├── settings/           # Paramètres + suppression sécurisée
│   │   └── paywall/            # Plans tarifaires
│   ├── (auth)/                 # Login/Register (AuthPage framer-motion)
│   ├── (onboarding)/           # 4 étapes + ProgressIndicator
│   ├── share/[invoiceId]/      # Page publique de partage facture
│   ├── workspace/
│   │   └── join/               # ← NOUVEAU accepter une invitation (public)
│   └── api/
│       ├── send-invoice/
│       ├── send-reminder/
│       ├── share/[invoiceId]/
│       ├── export/fec/
│       ├── stripe/
│       ├── process-voice/
│       ├── account/delete/     # Suppression compte + données
│       └── workspace/
│           └── invite/         # ← NOUVEAU envoi email invitation Brevo
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx         # Dark premium + profil fixe en bas + badges live
│   │   ├── BottomNav.tsx       # Menu mobile animé
│   │   └── Header.tsx
│   └── ui/
│       ├── Logo.tsx
│       ├── avatar.tsx
│       ├── dropdown-menu.tsx
│       ├── modern-mobile-menu.tsx
│       ├── user-dropdown.tsx
│       ├── auth-page.tsx
│       ├── progress-indicator.tsx
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Badge.tsx
│       └── Modal.tsx
├── stores/
│   ├── authStore.ts
│   ├── dataStore.ts
│   ├── crmStore.ts
│   └── workspaceStore.ts       # ← NOUVEAU workspace + notifications
├── hooks/
│   └── useSubscription.ts
└── middleware.ts               # Routes protégées + whitelist /share/ /workspace/join

```

---

## Tiers de souscription

| Plan | Prix mensuel | Prix annuel | Limites |
|------|-------------|-------------|---------|
| Free | 0€ | — | 3 factures, pas de voix, pas de récurrentes |
| Solo | 9€/mois | 7€/mois (84€/an) | Illimité, voix IA, récurrentes |
| Pro | 19€/mois | 15€/mois (180€/an) | Solo + templates premium + Workspace équipe |

---

## Schéma base de données Supabase

```sql
-- Tables existantes
profiles            -- id, email, company_name, subscription_tier, invoice_count...
clients             -- id, user_id, name, email, phone, siret, vat_number...
invoices            -- id, user_id, client_id, number, document_type, status, items...
recurring_invoices  -- id, user_id, frequency, next_run_date, is_active...
opportunities       -- id, user_id, client_name, title, value, stage, probability...

-- Tables ajoutées en session 9
workspaces              -- id, name, slug, owner_id, description, plan
workspace_members       -- id, workspace_id, user_id, email, role, status, joined_at
workspace_invitations   -- id, workspace_id, email, role, token (unique), expires_at
notifications           -- id, user_id, type, title, body, link, read, data
```

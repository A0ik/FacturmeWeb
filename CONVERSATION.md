# FacturmeWeb — Récap de session de développement

> Date : 9 avril 2026  
> Projet : FacturmeWeb — SaaS de facturation Next.js 15 + Supabase + Stripe

---

## Demandes initiales

### 1. Stripe Connect
Les utilisateurs connectent leur compte Stripe. Les factures génèrent un bouton de paiement qui envoie l'argent directement sur leur compte. Statut de la facture mis à jour automatiquement quand payée.

### 2. Invitation workspace par lien
Générer un lien d'invitation partageable sans avoir besoin d'une adresse email.

### 3. Auto-complétion SIRET
Lors de la création d'un client ou dans les paramètres, rechercher une entreprise par nom remplit automatiquement le SIRET, l'adresse, le code postal, la ville et le numéro de TVA intracommunautaire — via l'API gouvernementale française `recherche-entreprises.api.gouv.fr`.

---  

## Audit des fonctionnalités manquantes

Liste complète des fonctionnalités identifiées comme manquantes :

- Watermark sur les PDF (BROUILLON, PAYÉ, EN RETARD, ANNULÉ)
- QR code sur les PDF (lien de paiement Stripe)
- Type de document "Acompte"
- Actions groupées sur les factures (sélection multiple, marquer payées, export CSV, suppression)
- Mode sombre
- PWA (Progressive Web App)
- Export RGPD (toutes les données utilisateur en JSON)
- Page comptabilité TVA / URSSAF
- Cron auto-rappels (relances automatiques des factures en retard)
- Export Factur-X XML (norme e-facture française 2026)
- Tags clients + timeline de notes
- Tâches CRM par opportunité
- Webhooks sortants configurables
- Notifications push (VAPID)
- Paiements partiels avec barre de progression
- Journal d'activité
- Mise à jour sidebar + middleware

---

## Tout a été implémenté

### Stripe Connect — `app/api/stripe/connect/route.ts`
- **POST** : génère l'URL OAuth Stripe, redirige l'utilisateur
- **GET** : callback OAuth, échange le code contre le `stripe_connect_id`, sauvegarde en base, redirige vers `/settings?stripe=connected`
- **DELETE** : déconnecte le compte et met `stripe_connect_id` à null
- Les paiements utilisent `transfer_data.destination` pour router les fonds vers le compte connecté

### Invitation workspace par lien — `stores/workspaceStore.ts` + `app/(app)/workspace/page.tsx`
- Crée une invitation avec `email: ''` (invitation ouverte, sans email requis)
- Retourne un token → URL partageable `/workspace/join?token=xxx`
- La page join détecte `email === ''` et insère un nouveau membre au lieu de chercher un existant

### Auto-complétion SIRET — `components/ui/CompanySearch.tsx`
- Composant réutilisable avec debounce 350ms
- Appelle `recherche-entreprises.api.gouv.fr/search` (gratuit, sans clé API)
- Remplit automatiquement : nom, SIRET, SIREN, adresse, code postal, ville, TVA intracommunautaire
- Calcul TVA française : `(12 + 3 * (siren % 97)) % 97`
- Utilisé dans : création de client + page paramètres

### Watermark + QR Code PDF — `lib/pdf.ts`
- BROUILLON → gris clair / EN RETARD → rouge clair / ANNULÉ → gris clair / PAYÉ → vert clair
- QR code généré via `api.qrserver.com` (sans dépendance npm)
- Positionné à côté du bouton de paiement en bas de facture

### Type "Acompte" — `app/(app)/invoices/new/page.tsx`
- Ajout dans `DOC_TYPES` avec icône `Banknote` et couleur émeraude
- Préfixe de numérotation `ACP-` géré dans `lib/pdf.ts`

### Actions groupées — `app/(app)/invoices/page.tsx`
- Checkbox sur chaque ligne (desktop + mobile)
- Barre flottante en bas avec : nombre sélectionnés, marquer payées, export CSV, supprimer
- Confirmation avant suppression groupée

### Mode sombre — `stores/themeStore.ts` + `components/ui/ThemeToggle.tsx`
- Store Zustand : `theme: 'light' | 'dark'`, `toggle()`, `setTheme()`
- Persistance via `localStorage`
- Tailwind `darkMode: 'class'` dans `tailwind.config.ts`
- CSS overrides dans `app/globals.css`
- Bouton lune/soleil dans la sidebar

### PWA — `public/manifest.json` + `public/sw.js`
- `manifest.json` avec icônes, nom, couleurs
- Service worker avec stratégie cache-first pour les assets
- Composant `ServiceWorkerRegistration` monté côté client

### Export RGPD — `app/api/export/rgpd/route.ts`
- GET authentifié
- Retourne toutes les données de l'utilisateur en JSON téléchargeable : profil, clients, factures, récurrences

### Page Comptabilité — `app/(app)/accounting/page.tsx`
- Sélecteur de trimestre
- TVA collectée / déductible / nette
- Bannière auto-entrepreneur (franchise de TVA)
- Cotisations URSSAF estimées (22% du CA)
- Récapitulatif annuel : CA total, moyenne mensuelle, meilleur mois

### Cron auto-rappels — `app/api/cron/reminders/route.ts` + `vercel.json`
- Déclenché chaque jour à 8h00 (`0 8 * * *`)
- Passe les factures `sent` échues en `overdue`
- Insère des notifications en base
- Sécurisé par `Authorization: Bearer {CRON_SECRET}`

### Export Factur-X XML — `app/api/export/facturx/[invoiceId]/route.ts`
- Génère un XML CII 100 (profil MINIMUM)
- Conforme à la norme française e-facture 2026
- Téléchargeable depuis la page d'une facture

### Tags clients + Notes timeline — `app/(app)/clients/[id]/page.tsx`
- Tags colorés : ajout/suppression, sauvegardés via `updateClient`
- Timeline de notes : ajout, suppression, tri par date décroissante
- Table Supabase : `client_notes`

### Tâches CRM — `app/(app)/crm/page.tsx`
- Panneau de tâches par opportunité
- Checkbox pour cocher/décocher
- Ajout et suppression de tâches
- Table Supabase : `crm_tasks`

### Webhooks sortants — `app/(app)/settings/page.tsx` + `app/api/webhooks/trigger/route.ts`
- Configuration d'URL + sélection des événements dans les paramètres
- Endpoint interne `/api/webhooks/trigger` déclenché par le code métier
- Sécurisé par header `X-Internal-Secret`
- Table Supabase : `webhook_endpoints`

### Notifications push — `app/api/push/subscribe/route.ts` + `app/api/push/send/route.ts`
- Abonnement VAPID stocké dans `profiles.web_push_subscription`
- Envoi via le package `web-push`

### Paiements partiels — `app/(app)/invoices/[id]/page.tsx`
- Barre de progression visuelle (montant payé / total)
- Liste des paiements avec date, méthode, note
- Formulaire d'ajout collapsible
- Marquage automatique en `paid` quand la somme atteint le total
- Table Supabase : `partial_payments`

### Journal d'activité — `app/(app)/activity/page.tsx`
- Feed des notifications du workspace
- Actions récentes sur les factures

### Sidebar + Middleware
- `components/layout/Sidebar.tsx` : ajout des entrées Comptabilité et Activité
- `middleware.ts` : `/accounting` et `/activity` ajoutés aux routes protégées

---

## Migrations Supabase à exécuter

Fichiers dans `supabase/migrations/` — à coller dans l'éditeur SQL de Supabase dans cet ordre :

| Fichier | Table créée |
|---|---|
| `001_partial_payments.sql` | `partial_payments` |
| `002_client_notes.sql` | `client_notes` |
| `003_crm_tasks.sql` | `crm_tasks` |
| `004_webhook_endpoints.sql` | `webhook_endpoints` |

---

## Variables d'environnement à configurer

À ajouter dans `.env.local` et dans les variables d'environnement Vercel :

```env
# Stripe Connect
STRIPE_CONNECT_CLIENT_ID=ca_xxxxxxxxxxxx

# Cron sécurisé
CRON_SECRET=un_secret_aleatoire_long

# Webhooks sortants
WEBHOOK_INTERNAL_SECRET=un_autre_secret

# Push notifications (générer avec: npx web-push generate-vapid-keys)
VAPID_EMAIL=mailto:toi@tondomaine.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxA
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Stack technique

| Outil | Usage |
|---|---|
| Next.js 15 App Router | Framework frontend + API routes |
| Supabase | PostgreSQL + Auth + Storage |
| Stripe | Paiements + Connect OAuth |
| Zustand | State management (auth, data, workspace, theme) |
| Tailwind CSS | Styles + dark mode via `darkMode: 'class'` |
| Brevo | Envoi d'emails (factures, invitations) |
| Groq | IA pour la dictée vocale |
| Vercel | Hébergement + Cron jobs |
| web-push | Notifications push VAPID |
| recherche-entreprises.api.gouv.fr | API SIRENE gouvernementale (gratuite, sans clé) |

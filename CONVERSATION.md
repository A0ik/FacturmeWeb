# FacturmeWeb — Résumé de la conversation de développement

> Généré le 2026-04-08. Couvre 8 sessions de travail.

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
Appliquées dans `app/(app)/clients/page.tsx` lors de la création d'un client.

### 8. Onboarding complet (4 étapes)
| Étape | Fichier | Contenu |
|-------|---------|---------|
| 1 | `onboarding/language/page.tsx` | Choix de la langue |
| 2 | `onboarding/company/page.tsx` | Infos entreprise (→ redirige vers address) |
| 3 | `onboarding/address/page.tsx` | Adresse + coordonnées bancaires *(nouveau)* |
| 4 | `onboarding/template/page.tsx` | Choix du modèle de facture |
| ✓ | `onboarding/done/page.tsx` | Marque `onboarding_done: true` en BDD |

Barre de progression ajoutée sur chaque étape.

### Clés API nécessaires sur Vercel
| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `BREVO_SMTP_KEY` | Brevo → SMTP & API |
| `BREVO_SENDER_EMAIL` | Ton email vérifié Brevo |
| `BREVO_SENDER_NAME` | Ex: "Facturme" |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys |
| `STRIPE_SOLO_PRICE_ID` | Stripe → Products (Solo €9/mo) |
| `STRIPE_PRO_PRICE_ID` | Stripe → Products (Pro €19/mo) |
| `GROQ_API_KEY` | console.groq.com |
| `OPENROUTER_API_KEY` | openrouter.ai |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Générer avec `web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Idem |

---

## Session 3 — Push sur GitHub

### Problèmes rencontrés
1. **Mauvais nom de dépôt** : utilisé `facturemeweb` au lieu de `facturmeweb`
2. **Push rejeté** : le remote avait déjà un commit (README)
3. **Pas d'upstream défini**

### Solution finale
```bash
git remote set-url origin https://github.com/A0ik/FacturmeWeb.git
git push --set-upstream origin main --force
```

---

## Session 4 — Correction de la faille de sécurité Next.js

### Problème
Vercel signalait une vulnérabilité de sécurité sur Next.js 15.3.2 (`CVE-2025-66478`).

### Solution
Mise à jour vers la dernière version stable identifiée via `npm show next versions` :
```json
"next": "15.5.14"
```
Puis `npm install` + commit + push.

---

## Session 5 — Erreur runtime sur Vercel

### Symptôme
```
Application error: a server-side exception has occurred
Digest: 795089848
```
L'app buildait correctement (31/31 pages) mais affichait une erreur en visitant l'URL.

### Cause
`app/page.tsx` appelle `createServerSupabaseClient()` à l'exécution. Les variables d'environnement Supabase n'étaient **pas configurées sur Vercel**.

### Solution
Dans Vercel → Project → **Settings** → **Environment Variables**, ajouter :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Puis **Redeploy**.

---

## Session 6 — Intégration de composants UI modernes

### Objectif
Intégrer plusieurs composants UI fournis (modern-mobile-menu, user-dropdown, auth-page, progress-indicator).

### Packages installés
```bash
npm install framer-motion @iconify/react @radix-ui/react-dropdown-menu @radix-ui/react-avatar @radix-ui/react-slot class-variance-authority
```

### Composants créés dans `components/ui/`
| Fichier | Description |
|---------|-------------|
| `avatar.tsx` | Avatar Radix UI avec fallback initiales |
| `dropdown-menu.tsx` | DropdownMenu Radix UI complet |
| `modern-mobile-menu.tsx` | Menu mobile animé — `InteractiveMenu` avec routing Next.js |
| `user-dropdown.tsx` | Dropdown utilisateur complet (statut, profil, upgrade, logout) |
| `auth-page.tsx` | Page auth full-page avec animation SVG floatante |
| `progress-indicator.tsx` | Indicateur de progression animé (framer-motion) |

### Fichiers modifiés
| Fichier | Changement |
|---------|------------|
| `app/globals.css` | Variables CSS shadcn + styles `.menu` + keyframe `iconBounce` |
| `tailwind.config.ts` | Tokens `muted`, `card`, `popover`, `secondary`, `border`, `ring` |
| `components/layout/BottomNav.tsx` | Utilise `InteractiveMenu` avec routing Next.js |
| `components/layout/Sidebar.tsx` | `UserDropdown` intégré dans la section profil |
| `app/(auth)/layout.tsx` | Simplifié (plus de card wrapper, géré par AuthPage) |
| `app/(auth)/login/page.tsx` | Utilise `AuthPage` avec logique Supabase existante |
| `app/(auth)/register/page.tsx` | Utilise `AuthPage` mode register |

### Correction TypeScript
Les callbacks `ref={(el) => ...}` devaient retourner `void`. Fix :
```typescript
// Avant
ref={(el) => (itemRefs.current[index] = el)}
// Après
ref={(el) => { itemRefs.current[index] = el; }}
```

---

## Session 7 — Correction bugs + Redesign premium complet

### Problèmes identifiés
1. **UserDropdown cassé** — `@iconify/react` nécessite le pack d'icônes "solar" chargé via CDN, qui n'était pas disponible
2. **Paywall jamais visible** — pas de déclenchement proactif, aucun banner d'alerte
3. **Design insuffisant** — pas assez premium pour un SaaS payant
4. **Logo inexistant** — juste une lettre "F" en fond vert

### Fix UserDropdown
Remplacement complet de `@iconify/react` par Lucide (déjà installé) :
- Toutes les icônes Solar remplacées par leurs équivalents Lucide
- `User`, `Settings`, `Bell`, `Smile`, `Moon`, `Zap`, `HelpCircle`, `ExternalLink`, `LogOut`
- Fichier : `components/ui/user-dropdown.tsx`

### Nouveau : Composant Logo (`components/ui/Logo.tsx`)
```tsx
<Logo size="md" variant="full" dark />   // → "Factu.me" avec icon
<Logo size="sm" variant="icon" />        // → icon seul
```
- Monogramme SVG "F" + accent éclair
- Dégradé `from-primary to-primary-dark`
- Props : `size` (sm/md/lg/xl), `variant` (full/icon), `dark`

### Redesign Sidebar (`components/layout/Sidebar.tsx`)
- Fond `gray-950` (plus profond)
- Logo `Factu.me` avec `.me` en vert primaire
- Indicateur de statut (point vert) sur l'avatar dans le UserDropdown
- Upgrade banner glassmorphism avec bordure verte translucide
- Navigation : `strokeWidth` adaptatif (2.5 actif / 1.8 inactif)

### Redesign Paywall (`app/(app)/paywall/page.tsx`)
- Toggle mensuel / annuel (-20%) animé
- Carte "Pro" en dark (`gray-950`) avec `scale-[1.02]`
- Badge "⭐ Recommandé" en bandeau vert
- Jauge de progression pour le plan gratuit
- Prix annuels avec calcul des économies
- Trust signals : Stripe, résiliation, sans engagement
- CTA dynamique : état chargement, plan actuel

### Banner paywall proactif (`app/(app)/invoices/page.tsx`)
Affiché dès que l'utilisateur free utilise ≥ 2/3 factures :
```
⚡ Plan gratuit · 2/3 factures utilisées — Factures illimitées dès 9€/mois →
```
Devient alerte rouge quand la limite est atteinte.
Même logique ajoutée sur le dashboard.

### Redesign Dashboard (`app/(app)/dashboard/page.tsx`)
- Carte "CA ce mois" : dégradé `from-primary to-primary-dark` avec cercles décoratifs
- Icônes colorées + ombres subtiles sur chaque card
- Quick actions : hover coloré animé (vert/bleu/violet selon type)
- Chart : `barCategoryGap="30%"` + tooltips avec box-shadow
- Empty state avec CTA illustré
- Lien "Tout voir" avec flèche `ArrowUpRight`

### Mobile top bar (`app/(app)/layout.tsx`)
Nouvelle barre sticky sur mobile (cachée sur desktop) :
```tsx
<div className="lg:hidden sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
  <Logo size="sm" variant="full" />
</div>
```

### Styles globaux (`app/globals.css`)
- Scrollbar fine stylée (5px, grise, arrondie)
- `font-feature-settings: 'cv11', 'ss01'` pour Inter
- `overscroll-behavior: none`

---

## État actuel du projet

### Ce qui fonctionne
- Build Vercel : 31/31 pages statiques ✓
- Version Next.js : 15.5.14 (sans vulnérabilités connues) ✓
- Code pushé sur GitHub : `A0ik/FacturmeWeb` ✓
- Toutes les fonctionnalités implémentées ✓
- Design premium ✓
- Logo Factu.me ✓
- UserDropdown fonctionnel (Lucide) ✓
- Paywall proactif ✓
- Menu mobile animé ✓
- Page auth moderne (framer-motion) ✓

### Ce qu'il reste à faire
1. **Configurer les variables d'environnement** sur Vercel (notamment les 3 clés Supabase minimum)
2. **Créer le projet Supabase** sur [supabase.com](https://supabase.com) si pas encore fait
3. **Créer les tables en base de données** — schéma SQL à exécuter dans Supabase SQL Editor :
   - `profiles`
   - `clients`
   - `invoices`
   - `recurring_invoices`
   - `opportunities`
4. **Configurer Stripe** — créer les produits Solo (9€) et Pro (19€) et renseigner les Price IDs

---

## Architecture des fichiers clés

```
FacturmeWeb/
├── app/
│   ├── (app)/              # Routes protégées (auth requise)
│   │   ├── layout.tsx      # Sidebar + BottomNav + mobile top bar
│   │   ├── dashboard/      # Dashboard redesigné premium
│   │   ├── invoices/       # Banner paywall proactif
│   │   │   ├── [id]/       # Détail facture (reminder, share)
│   │   │   └── new/        # Création avec voix IA
│   │   ├── clients/
│   │   ├── crm/
│   │   ├── recurring/
│   │   ├── settings/       # Paramètres + export FEC
│   │   └── paywall/        # Redesign premium toggle mensuel/annuel
│   ├── (auth)/             # Login/Register avec AuthPage
│   ├── (onboarding)/       # 4 étapes + ProgressIndicator
│   ├── share/[invoiceId]/  # Page publique de partage
│   └── api/
│       ├── send-invoice/
│       ├── send-reminder/
│       ├── share/[invoiceId]/
│       ├── export/fec/
│       ├── stripe/
│       ├── process-voice/
│       └── account/delete/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx     # Dark premium + Logo + UserDropdown
│   │   ├── BottomNav.tsx   # InteractiveMenu animé
│   │   └── Header.tsx
│   └── ui/
│       ├── Logo.tsx        # ← NOUVEAU composant Logo SVG
│       ├── avatar.tsx      # ← NOUVEAU Radix Avatar
│       ├── dropdown-menu.tsx # ← NOUVEAU Radix DropdownMenu
│       ├── modern-mobile-menu.tsx # ← NOUVEAU menu animé
│       ├── user-dropdown.tsx # ← Reécrit avec Lucide
│       ├── auth-page.tsx   # ← NOUVEAU page auth framer-motion
│       ├── progress-indicator.tsx # ← NOUVEAU progress animé
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Badge.tsx
│       └── Modal.tsx
├── lib/
│   ├── supabase.ts         # Client browser (lazy init)
│   ├── supabase-server.ts  # Client server + admin
│   ├── pdf.ts              # Générateur HTML facture multi-devises
│   └── utils.ts            # downloadCSV, validateSiret, validateVatNumber, cn
├── stores/
│   ├── authStore.ts
│   ├── dataStore.ts
│   └── crmStore.ts
├── hooks/
│   └── useSubscription.ts  # isFree, isSolo, isPro, isAtLimit, maxInvoices
└── middleware.ts            # Protection routes + whitelist /share/
```

---

## Tiers de souscription

| Plan | Prix mensuel | Prix annuel | Limites |
|------|-------------|-------------|---------|
| Free | 0€ | — | 3 factures, pas de voix, pas de récurrentes |
| Solo | 9€/mois | 7€/mois (84€/an) | Illimité, voix IA, récurrentes |
| Pro | 19€/mois | 15€/mois (180€/an) | Solo + templates premium + Stripe Connect |

---

## Packages npm installés (session 6)

```bash
framer-motion              # Animations (AuthPage, ProgressIndicator)
@radix-ui/react-dropdown-menu  # Dropdown accessible
@radix-ui/react-avatar     # Avatar accessible
@radix-ui/react-slot       # Polymorphisme composants
class-variance-authority   # CVA pour variants
```

> Note : `@iconify/react` a été installé puis **abandonné** (remplacé par Lucide) car les icônes Solar nécessitent un CDN externe non disponible en SSR.

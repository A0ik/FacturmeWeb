# FacturmeWeb — Résumé de la conversation de développement

> Généré le 2026-04-07. Couvre 5 sessions de travail.

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
`app/page.tsx` appelle `createServerSupabaseClient()` à l'exécution :
```typescript
export default async function RootPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) redirect('/dashboard');
  else redirect('/login');
}
```
Les variables d'environnement Supabase n'étaient **pas configurées sur Vercel**.

### Solution
Dans Vercel → Project → **Settings** → **Environment Variables**, ajouter :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Puis **Redeploy**.

---

## État actuel du projet

### Ce qui fonctionne
- Build Vercel : 31/31 pages statiques ✓
- Version Next.js : 15.5.14 (sans vulnérabilités connues) ✓
- Code pushé sur GitHub : `A0ik/FacturmeWeb` ✓
- Toutes les fonctionnalités implémentées ✓

### Ce qu'il reste à faire
1. **Configurer les variables d'environnement** sur Vercel (notamment les 3 clés Supabase minimum)
2. **Créer le projet Supabase** sur [supabase.com](https://supabase.com) si pas encore fait
3. **Créer les tables en base de données** — schéma SQL à exécuter dans Supabase SQL Editor :
   - `profiles`
   - `clients`
   - `invoices`
   - `recurring_invoices`
   - `opportunities`

---

## Architecture des fichiers clés

```
FacturmeWeb/
├── app/
│   ├── (app)/              # Routes protégées (auth requise)
│   │   ├── dashboard/
│   │   ├── invoices/
│   │   │   ├── [id]/       # Détail facture (reminder, share)
│   │   │   └── new/
│   │   ├── clients/
│   │   ├── crm/
│   │   ├── recurring/
│   │   ├── settings/       # Paramètres + export FEC
│   │   └── paywall/
│   ├── (auth)/             # Login, register, callback
│   ├── (onboarding)/       # 4 étapes d'onboarding
│   ├── share/[invoiceId]/  # Page publique de partage
│   └── api/
│       ├── send-invoice/
│       ├── send-reminder/
│       ├── share/[invoiceId]/
│       ├── export/fec/
│       ├── stripe/
│       ├── process-voice/
│       └── account/delete/
├── lib/
│   ├── supabase.ts         # Client browser (lazy init)
│   ├── supabase-server.ts  # Client server + admin
│   ├── pdf.ts              # Générateur HTML facture
│   └── utils.ts            # downloadCSV, validateSiret, validateVatNumber
├── stores/
│   ├── authStore.ts
│   ├── dataStore.ts
│   └── crmStore.ts
└── middleware.ts            # Protection routes + whitelist /share/
```

---

## Tiers de souscription

| Plan | Prix | Limites |
|------|------|---------|
| Free | 0€ | 3 factures, pas de voix, pas de récurrentes |
| Solo | 9€/mo | Illimité, voix, récurrentes |
| Pro | 19€/mo | Solo + template personnalisé |

# Documentation Complète - Intégration SumUp

**Projet** : FacturmeWeb-ESPOIR
**Dernière mise à jour** : 22 avril 2026
**Version** : 1.0

---

## Table des matières

1. [Architecture globale](#architecture-globale)
2. [Schéma de base de données](#schéma-de-base-de-données)
3. [API Routes](#api-routes)
4. [Composants UI](#composants-ui)
5. [Types TypeScript](#types-typescript)
6. [Flux de données](#flux-de-données)
7. [Configuration requise](#configuration-requise)
8. [Sécurité](#sécurité)
9. [Dépannage](#dépannage)

---

## Architecture globale

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐      ┌──────────────────────────────────┐   │
│  │ Settings Page    │──────│ PaymentProviderModal             │   │
│  │ (Paramètres)     │      │ (Choix Stripe/SumUp)             │   │
│  └──────────────────┘      └──────────────────────────────────┘   │
│           │                                                        │
│           ▼                                                        │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Invoice Detail Page                                          ││
│  │ - Bouton "Créer lien de paiement"                            ││
│  │ - Affichage du lien existant                                 ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       API ROUTES (Next.js)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  POST   /api/sumup/connect          → Connexion compte SumUp        │
│  GET    /api/sumup/connect          → Vérifier état connexion      │
│  DELETE /api/sumup/connect          → Déconnexion                  │
│  POST   /api/sumup/payment-link     → Créer lien de paiement       │
│  POST   /api/sumup/webhook          → Webhook SumUp                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                                │
├─────────────────────────────────────────────────────────────────────┤
│  Table "profiles"                                                   │
│  - sumup_api_key        (text)    → Clé API SumUp                  │
│  - sumup_merchant_code  (text)    → Code marchand                  │
│  - sumup_email          (text)    → Email compte SumUp             │
│                                                                      │
│  Table "invoices"                                                   │
│  - sumup_checkout_id   (text)    → ID du checkout SumUp            │
│  - payment_link        (text)    → URL complète de paiement        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SUMUP API EXTERNE                             │
├─────────────────────────────────────────────────────────────────────┤
│  GET  https://api.sumup.com/v0.1/me       → Valider clé API        │
│  POST https://api.sumup.com/v0.1/checkouts → Créer checkout        │
│  Payment URL: https://pay.sumup.com/b2c/{id}                       │
│  Webhook: POST depuis SumUp (paiement effectué)                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Schéma de base de données

### Table `profiles`

Colonne | Type | Obligatoire | Description
--------|------|-------------|-------------
`sumup_api_key` | `text` | Non | Clé API SumUp (Bearer token)
`sumup_merchant_code` | `text` | Non | Code marchand (ex: MCGKP3GE)
`sumup_email` | `text` | Non | Email du compte SumUp

### Table `invoices`

Colonne | Type | Obligatoire | Description
--------|------|-------------|-------------
`sumup_checkout_id` | `text` | Non | ID du checkout créé chez SumUp
`payment_link` | `text` | Non | URL complète de paiement

### Migration

**Fichier** : `supabase/migrations/009_sumup_integration.sql`

```sql
-- SumUp integration fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sumup_api_key text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sumup_merchant_code text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS sumup_checkout_id text;

-- Note: sumup_email a été ajouté manuellement ultérieurement
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sumup_email text;
```

---

## API Routes

### 1. POST `/api/sumup/connect`

**But** : Connecter le compte SumUp de l'utilisateur

**Fichier** : `app/api/sumup/connect/route.ts`

#### Requête

```typescript
POST /api/sumup/connect
Content-Type: application/json

{
  "apiKey": "sup_sk_...",        // Clé API SumUp
  "merchantCode": "MCGKP3GE",   // Code marchand
  "merchantEmail": "user@sumup.com"  // Optionnel: email manuel
}
```

#### Validation

- `apiKey` : min 10 caractères
- `merchantCode` : min 3 caractères
- Appel à l'API SumUp `/v0.1/me` pour valider la clé

#### Réponse Succès (200)

```json
{
  "success": true,
  "merchantCode": "MCGKP3GE",
  "merchantName": "Nom du commerce",
  "sumupEmail": "user@sumup.com",
  "emailDetected": true,
  "validated": true
}
```

#### Réponses Erreur

| Code | Message |
|------|---------|
| 400 | "Clé API trop courte (minimum 10 caractères)" |
| 400 | "Code marchand invalide (trop court)" |
| 400 | "Clé API invalide ou expirée. Vérifiez votre clé..." |
| 400 | "Impossible de joindre l'API SumUp. Vérifiez votre connexion." |
| 500 | "Erreur lors de la sauvegarde des credentials" |

#### Extraction de l'email

Le code essaie plusieurs chemins dans la réponse SumUp :

```typescript
sumupEmail =
  data.merchant_profile?.personal_profile?.email ||  // Chemin principal
  data.account?.username ||                           // Fallback 1
  data.email ||                                       // Fallback 2
  data.username ||                                    // Fallback 3
  manualEmail ||                                      // Email manuel fourni
  null;
```

---

### 2. GET `/api/sumup/connect`

**But** : Vérifier l'état de la connexion SumUp

#### Réponse

```json
{
  "connected": true,
  "merchantCode": "MCGKP3GE",
  "sumupEmail": "user@sumup.com",
  "emailMissing": false
}
```

---

### 3. DELETE `/api/sumup/connect`

**But** : Déconnecter le compte SumUp

#### Réponse

```json
{
  "success": true
}
```

**Effets en base** : Les colonnes `sumup_api_key`, `sumup_merchant_code`, `sumup_email` sont mises à `NULL`.

---

### 4. POST `/api/sumup/payment-link`

**But** : Créer un lien de paiement pour une facture

**Fichier** : `app/api/sumup/payment-link/route.ts`

#### Requête

```typescript
POST /api/sumup/payment-link
Content-Type: application/json

{
  "invoiceId": "uuid-de-la-facture"
}
```

#### Pré-requis

- Utilisateur authentifié (Supabase)
- Facture existe avec un montant > 0
- Compte SumUp connecté (`sumup_api_key` + `sumup_merchant_code`)

#### Payload envoyé à SumUp

```json
{
  "checkout_reference": "uuid-facture",
  "amount": 630.00,
  "currency": "EUR",
  "description": "Facture FACT-2026-021",
  "pay_to_email": "user@sumup.com"  // Seulement si sumup_email existe
}
```

**Notes importantes** :
- Le montant doit être en unités principales (ex: 10.50 pour €10.50), PAS en centimes
- Le montant est arrondi à 2 décimales maximum
- `pay_to_email` est OBLIGATOIRE pour les comptes affiliés/opérateur SumUp

#### Réponse Succès (200)

```json
{
  "url": "https://pay.sumup.com/b2c/587f0c02-dcd8-4cf1-8878-323fde2d1b17",
  "checkoutId": "587f0c02-dcd8-4cf1-8878-323fde2d1b17"
}
```

#### Réponse avec Warning (200)

Si le checkout est créé mais la page de paiement est 404 (compte non activé) :

```json
{
  "url": "https://pay.sumup.com/b2c/587f0c02-dcd8-4cf1-8878-323fde2d1b17",
  "checkoutId": "587f0c02-dcd8-4cf1-8878-323fde2d1b17",
  "warning": "Le checkout a été créé mais la page de paiement retourne une erreur 404..."
}
```

#### Réponses Erreur

| Code | Message |
|------|---------|
| 400 | "SumUp non configuré. Connectez votre compte..." |
| 400 | "Le montant de la facture doit être supérieur à 0" |
| 400 | "Clé API SumUp invalide ou expirée..." |
| 400 | "Votre clé API SumUp n'a pas les permissions..." |
| 400 | "Un lien de paiement existe déjà pour cette facture..." |
| 400 | "Votre compte SumUp nécessite un email marchand..." |
| 500 | "Erreur SumUp : {détail de l'erreur}" |

---

### 5. POST `/api/sumup/webhook`

**But** : Recevoir les notifications de paiement de SumUp

**Fichier** : `app/api/sumup/webhook/route.ts`

#### Requête (envoyée par SumUp)

```typescript
POST /api/sumup/webhook
Content-Type: application/json
X-Sumup-Signature: hmac-sha256=...

{
  "event": "checkout.status.changed",
  "status": "PAID",
  "checkout_reference": "uuid-facture",
  // ... autres champs SumUp
}
```

#### Sécurité

- Vérification de signature HMAC-SHA256
- Clé : `SUMUP_WEBHOOK_SECRET` (variable d'environnement)
- Header : `X-Sumup-Signature`

#### Action

Si `status === "PAID"` :
- Met à jour la facture : `status = "paid"`
- Enregistre : `payment_method = "sumup"`
- Timestamp : `paid_at = NOW()`

---

## Composants UI

### 1. PaymentProviderModal

**Fichier** : `components/ui/PaymentProviderModal.tsx`

Modale de sélection du fournisseur de paiement.

```typescript
interface PaymentProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProvider: (provider: 'stripe' | 'sumup') => void;
  hasStripe: boolean;      // Stripe configuré ?
  hasSumUp: boolean;       // SumUp configuré ?
  amount: number;          // Montant de la facture
}
```

**Affichage** :
- Carte Stripe (indigo #635BFF)
- Carte SumUp (vert #1D9E75)
- Indicateur de configuration (✓ Configuré / ⚠ Non configuré)

---

### 2. Settings Page - Section SumUp

**Fichier** : `app/(app)/settings/page.tsx` (lignes 788-887)

#### État déconnecté

```tsx
<form>
  <input
    type="password"
    placeholder="sup_sk_..."
    value={sumupApiKey}
    onChange={(e) => setSumupApiKey(e.target.value)}
  />
  <input
    type="text"
    placeholder="MCGKP3GE"
    value={sumupMerchantCode}
    onChange={(e) => setSumupMerchantCode(e.target.value)}
  />
  <input
    type="email"
    placeholder="votre@email.com"
    value={sumupEmail}
    onChange={(e) => setSumupEmail(e.target.value)}
    required
  />
  <button onClick={handleConnectSumUp}>
    Connecter SumUp
  </button>
</form>
```

#### État connecté

```tsx
<div>
  {/* Badge succès */}
  <div>Compte SumUp connecté</div>
  <div>{sumupMerchantCode}</div>

  {/* Warning si email manquant */}
  {sumupEmailMissing && (
    <div className="amber">
      Email SumUp manquant — liens de paiement bloqués.
      Déconnectez et reconnectez avec votre email.
    </div>
  )}

  {/* Bouton déconnexion */}
  <button onClick={handleDisconnectSumUp}>
    Déconnecter SumUp
  </button>
</div>
```

#### États du composant

| Variable | Type | Description |
|----------|------|-------------|
| `sumupApiKey` | `string` | Valeur input clé API |
| `sumupMerchantCode` | `string` | Valeur input code marchand |
| `sumupEmail` | `string` | Valeur input email SumUp |
| `sumupMerchantName` | `string` | Nom du commerce (depuis API) |
| `sumupConnected` | `boolean` | État de connexion |
| `sumupLoading` | `boolean` | État de chargement |
| `sumupStatus` | `'connected' \| 'error' \| null` | Statut de la dernière action |
| `sumupEmailMissing` | `boolean` | Email manquant en base |

---

### 3. Invoice Detail Page

**Fichier** : `app/(app)/invoices/[id]/page.tsx`

#### Bouton de création de lien

```tsx
{invoice.document_type === 'invoice' && invoice.status !== 'paid' && (
  <button onClick={() => setShowPaymentModal(true)}>
    Créer un lien de paiement
  </button>
)}
```

#### Handler SumUp

```tsx
const handleSumUpLink = async () => {
  setGeneratingSumUpLink(true);
  try {
    const res = await fetch('/api/sumup/payment-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: invoice.id }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    if (data.warning) {
      toast.error(data.warning, { duration: 8000 });
    } else {
      toast.success('Lien SumUp créé !');
      window.open(data.url, '_blank');
    }
  } catch (e: any) {
    toast.error(e.message || 'Erreur lors de la création du lien SumUp.');
  } finally {
    setGeneratingSumUpLink(false);
  }
};
```

---

## Types TypeScript

### Interface Profile (partie SumUp)

**Fichier** : `types/index.ts` (lignes 30-31)

```typescript
export interface Profile {
  // ... autres champs ...
  sumup_api_key?: string;
  sumup_merchant_code?: string;
  sumup_email?: string;
  // ... autres champs ...
}
```

### Interface Invoice (partie SumUp)

**Fichier** : `types/index.ts` (ligne 143)

```typescript
export interface Invoice {
  // ... autres champs ...
  sumup_checkout_id?: string;
  payment_link?: string;
  // ... autres champs ...
}
```

---

## Flux de données

### 1. Flux de connexion SumUp

```
┌─────────────────┐
│ User enters     │
│ credentials     │
│ in Settings     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ POST /api/sumup/connect                │
│ { apiKey, merchantCode, merchantEmail } │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Validate credentials via SumUp API     │
│ GET https://api.sumup.com/v0.1/me      │
│ Bearer {apiKey}                         │
└────────┬────────────────────────────────┘
         │
         ├─ FAILURE ──▶ Error 400 + message
         │
         ▼ SUCCESS
┌─────────────────────────────────────────┐
│ Extract merchant info                   │
│ - merchantName                          │
│ - sumupEmail (multiple paths)           │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Save to Supabase                        │
│ UPDATE profiles SET                     │
│   sumup_api_key = apiKey,               │
│   sumup_merchant_code = code,           │
│   sumup_email = email                   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Return success + merchant info          │
│ { success, merchantCode,                │
│   merchantName, sumupEmail,             │
│   emailDetected, validated }            │
└─────────────────────────────────────────┘
```

---

### 2. Flux de création de lien de paiement

```
┌─────────────────────────────────────┐
│ User clicks "Créer lien de paiement"│
│ on invoice detail page              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ POST /api/sumup/payment-link                        │
│ { invoiceId: "uuid" }                               │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ Verify user authenticated                           │
│ Get invoice data (amount, number, client)           │
│ Get profile SumUp credentials                       │
└──────────────┬──────────────────────────────────────┘
               │
               ├─ No credentials ──▶ Error 400
               │
               ▼ Has credentials
┌─────────────────────────────────────────────────────┐
│ Check if checkout already exists                    │
│ IF invoice.sumup_checkout_id exists                 │
│   → Return existing URL                             │
└──────────────┬──────────────────────────────────────┘
               │
               ▼ New checkout
┌─────────────────────────────────────────────────────┐
│ Validate amount > 0                                 │
│ Round amount to 2 decimals                          │
└──────────────┬──────────────────────────────────────┘
               │
               ├─ Invalid ──▶ Error 400
               │
               ▼ Valid
┌─────────────────────────────────────────────────────┐
│ Build checkout payload                              │
│ {                                                   │
│   checkout_reference: invoiceId,                    │
│   amount: 630.00,                                   │
│   currency: "EUR",                                  │
│   description: "Facture FACT-XXX",                  │
│   pay_to_email: "sumup@email.com" OR omit          │
│ }                                                   │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ Call SumUp Checkout API                             │
│ POST https://api.sumup.com/v0.1/checkouts          │
│ Authorization: Bearer {sumup_api_key}               │
│ Body: checkout payload                              │
└──────────────┬──────────────────────────────────────┘
               │
               ├─ 401 ──▶ Error 400 "Clé invalide..."
               ├─ 403 ──▶ Error 400 "Permissions..."
               ├─ 409 ──▶ Error 400 "Déjà existant..."
               ├─ 400 ──▶ Error 400/500 avec détails SumUp
               │
               ▼ SUCCESS (200)
┌─────────────────────────────────────────────────────┐
│ Parse checkout response                             │
│ { id: "uuid", status: "PENDING", ... }              │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ Verify payment URL accessibility                    │
│ HEAD https://pay.sumup.com/b2c/{id}                │
│ (optional, with timeout 5s)                         │
└──────────────┬──────────────────────────────────────┘
               │
               ├─ 404 ──▶ Warning + return URL
               │
               ▼ Accessible or timeout
┌─────────────────────────────────────────────────────┐
│ Save checkout to invoice                            │
│ UPDATE invoices SET                                 │
│   sumup_checkout_id = checkout.id,                  │
│   payment_link = "https://pay.sumup.com/..."        │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ Return payment URL to client                        │
│ { url, checkoutId } OR { url, checkoutId, warning } │
└─────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ Client opens payment URL in new tab                │
│ window.open(data.url, '_blank')                     │
└─────────────────────────────────────────────────────┘
```

---

### 3. Flux Webhook (paiement reçu)

```
┌─────────────────────────────────────────┐
│ Customer pays on SumUp payment page     │
│ pay.sumup.com/b2c/{checkout_id}         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ SumUp processes payment                             │
│ Checkout status: PENDING → PAID                     │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ SumUp sends webhook to our endpoint                │
│ POST /api/sumup/webhook                             │
│ Body: { event: "checkout.status.changed",           │
│        status: "PAID",                              │
│        checkout_reference: "invoice_id" }           │
│ Header: X-Sumup-Signature (HMAC)                    │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ Verify webhook signature                           │
│ HMAC-SHA256(body, SUMUP_WEBHOOK_SECRET)             │
│ == X-Sumup-Signature ?                              │
└──────────────┬──────────────────────────────────────┘
               │
               ├─ Invalid ──▶ Ignore request
               │
               ▼ Valid
┌─────────────────────────────────────────────────────┐
│ Parse webhook payload                               │
│ event === "checkout.status.changed"                 │
│ status === "PAID"                                   │
│ checkout_reference → invoice ID                     │
└──────────────┬──────────────────────────────────────┘
               │
               ├─ Not PAID ──▶ Ignore
               │
               ▼ PAID
┌─────────────────────────────────────────────────────┐
│ Update invoice status                               │
│ UPDATE invoices SET                                 │
│   status = 'paid',                                  │
│   payment_method = 'sumup',                         │
│   paid_at = NOW()                                   │
│ WHERE id = checkout_reference                       │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ Return 200 OK                                       │
│ (Acknowledge webhook)                               │
└─────────────────────────────────────────────────────┘
```

---

## Configuration requise

### Variables d'environnement

```env
# Supabase (obligatoire)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# SumUp Webhook Secret (recommandé pour la production)
SUMUP_WEBHOOK_SECRET=votre_secret_hmac
```

**Note** : `SUMUP_WEBHOOK_SECRET` est optionnel mais fortement recommandé pour la sécurité des webhooks.

### Configuration compte SumUp

1. **Créer un compte SumUp marchand**
   - Aller sur [sumup.com](https://sumup.com)
   - Créer un compte merchant
   - Compléter le KYC (vérification d'identité)

2. **Obtenir les identifiants API**
   - Se connecter sur [merchants.sumup.com](https://merchants.sumup.com)
   - Aller dans **Settings → Developers**
   - Créer une nouvelle clé API
   - **Important** : Cocher le scope `payments` pour autoriser la création de checkouts

3. **Trouver son code marchand**
   - Dans le dashboard merchant
   - Section **Account** ou **Profile**
   - Le code marchand est généralement au format `MCGXXXXX` ou similaire

4. **Activer les paiements en ligne**
   - Aller dans **Online Store** ou **Boutique en ligne**
   - Activer la fonctionnalité Checkout / Payment Links
   - Si non disponible : contacter le support SumUp

---

## Sécurité

### 1. Stockage des credentials

- Les clés API SumUp sont stockées en **clair** dans `profiles.sumup_api_key`
- **Recommandation** : Chiffrer la clé au repos avec Supabase Vault ou pgcrypto

### 2. Authentification des API routes

- Toutes les routes vérifient l'authentification Supabase
- Utilisation de `createServerClient` pour valider le JWT

### 3. Webhook Security

- Vérification HMAC-SHA256 de la signature
- Clé secrète : `SUMUP_WEBHOOK_SECRET`
- Header vérifié : `X-Sumup-Signature`

### 4. Validation des entrées

- Clé API : minimum 10 caractères
- Code marchand : minimum 3 caractères
- Montant : doit être > 0
- Invoice ID : doit exister et appartenir à l'utilisateur

### 5. Permissions / RLS

- Les policies RLS Supabase doivent être configurées pour :
  - Un utilisateur ne peut voir/modifier que son propre `profile`
  - Un utilisateur ne peut voir/modifier que ses propres `invoices`

---

## Dépannage

### Problème : "Clé API invalide" (401)

**Causes possibles** :
- Clé API incorrecte ou mal copiée
- Clé API expirée
- Scope `payments` non activé sur la clé

**Solution** :
1. Vérifier la clé dans [merchants.sumup.com](https://merchants.sumup.com)
2. Régénérer une nouvelle clé avec scope `payments`
3. Se reconnecter dans les paramètres de l'app

---

### Problème : "Validation error SumUp"

**Causes possibles** :
- `pay_to_email` manquant (compte affilié/opérateur)
- Montant au format incorrect
- Devise non supportée
- Code marchand invalide

**Solutions** :
1. **Email manquant** : Déconnecter SumUp et reconnecter en fournissant l'email
2. **Montant** : Vérifier que le montant de la facture est positif
3. **Devise** : Vérifier que `currency` est bien "EUR" (ou autre devise supportée)

---

### Problème : Page de paiement 404

**Cause** : Le compte SumUp n'a pas les paiements en ligne activés

**Solution** :
1. Aller sur [merchants.sumup.com](https://merchants.sumup.com)
2. Chercher "Online Store" ou "Boutique en ligne"
3. Activer la fonctionnalité
4. Si absent : contacter le support avec les détails du compte

**Message au support** :
```
Objet : Activation Checkout API — Marchand MCGKP3GE

Bonjour,

Je développe une intégration avec l'API SumUp Checkout.
Les checkouts sont créés avec succès via POST /v0.1/checkouts (code 200),
mais la page pay.sumup.com/b2c/{id} retourne 404.

Pourriez-vous activer la fonctionnalité "Payment Links / Checkout API"
sur mon compte MCGKP3GE ?

Merci.
```

---

### Problème : Webhook non reçu

**Causes possibles** :
- URL webhook mal configurée dans SumUp
- Signature incorrecte
- Serverless function timeout

**Vérifications** :
1. Vérifier l'URL webhook dans le dashboard SumUp
2. Vérifier que `SUMUP_WEBHOOK_SECRET` est configuré
3. Checker les logs Vercel pour les erreurs

---

### Problème : Facture pas marquée "Payée"

**Causes possibles** :
- Webhook jamais appelé par SumUp
- Webhook appelé mais `status != "PAID"`
- Erreur lors de l'update en base

**Debug** :
1. Vérifier les logs Vercel (endpoint `/api/sumup/webhook`)
2. Vérifier en base : la facture a-t-elle `sumup_checkout_id` ?
3. Tester manuellement : faire un paiement de test sur un lien

---

### Logs utiles pour le debug

**Vercel Runtime Logs** :
```
Filtre: sumup-payment-link
→ Montre tous les logs de création de liens
→ Inclut les détails de l'erreur SumUp

Filtre: sumup-connect
→ Montre les tentatives de connexion
→ Montre les infos extraites du compte SumUp
```

**Supabase Logs** :
```
Vérifier la table "invoices" :
- sumup_checkout_id renseigné ?
- payment_link renseigné ?
- status = 'paid' après paiement ?
```

---

## Changelog

### Version 1.0 (22 avril 2026)

**Correction bug majeur - email SumUp manquant**

- **Problème** : `sumup_email` était null → `pay_to_email` non envoyé → SumUp validation error
- **Racine** : Extraction de l'email échouait (mauvais chemins dans la réponse API)
- **Correction** :
  - `connect/route.ts` : Ajout fallbacks `account.username`, `data.username`
  - `connect/route.ts` : Accepte email manuel dans le body
  - `connect/route.ts` : Retourne `emailDetected` et `sumupEmail`
  - `payment-link/route.ts` : Messages d'erreur précis par code HTTP
  - `payment-link/route.ts` : Détection du cas `pay_to_email` manquant
  - `payment-link/route.ts` : Vérification accessibilité URL après création
  - `payment-link/route.ts` : Log complet de la réponse SumUp
  - `settings/page.tsx` : Champ email SumUp obligatoire dans le formulaire
  - `settings/page.tsx` : Banner warning si email manquant
  - `invoices/[id]/page.tsx` : Affichage du warning si 404 détecté

---

## Ressources externes

### Documentation SumUp API

- **API Reference** : [developer.sumup.com/api](https://developer.sumup.com/api/)
- **Checkout API** : [developer.sumup.com/api/checkout](https://developer.sumup.com/api/checkout/)
- **Webhooks** : [developer.sumup.com/api/webhooks](https://developer.sumup.com/api/webhooks/)

### Endpoints utiles

```
Production API :  https://api.sumup.com
Production Pay : https://pay.sumup.com
Dashboard :      https://merchants.sumup.com
Developer :      https://developer.sumup.com
```

### Support SumUp

- Email : support@sumup.com
- Tel France : 01 86 26 46 36
- Contact : [sumup.com/contact](https://sumup.com/contact)

---

## Notes de développement

### À faire (TODO)

1. **Chiffrement des credentials**
   - Implémenter le chiffrement de `sumup_api_key` au repos
   - Utiliser Supabase Vault ou pgcrypto

2. **Tests automatisés**
   - Tests unitaires pour les API routes
   - Tests d'intégration avec SumUp sandbox

3. **Améliorations UX**
   - Indicateur de statut de paiement en temps réel
   - Rafraîchissement automatique de la facture après paiement

4. **Monitoring**
   - Alertes sur les erreurs SumUp
   - Dashboard d'activité des paiements

### Connaissances acquises

1. **Pay-to-email obligatoire** : Pour les comptes affiliés/opérateur, `pay_to_email` est OBLIGATOIRE dans la création de checkout

2. **Montant en unités principales** : L'API SumUp attend le montant en euros/dollars (ex: 10.50), PAS en centimes (1050)

3. **Checkout vs Payment Link** : Ce sont deux features distinctes chez SumUp. Un compte peut avoir l'une sans l'autre.

4. **URL format** : La page de paiement utilise toujours `pay.sumup.com/b2c/{checkout_id}`, PAS `pay.sumup.io`

5. **Webhook fiable** : Les webhooks SumUp sont fiables mais peuvent être retardés de quelques secondes à quelques minutes. Ne pas compter sur eux pour une mise à jour immédiate dans l'UI.

---

**Fin de la documentation**

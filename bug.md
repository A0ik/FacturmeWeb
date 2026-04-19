# Bug Report - Free Trial Implementation

## Contexte
Implémentation d'un système d'essai gratuit de 4 jours pour FacturmeWeb-ESPOIR.

## Tâches Accomplies ✅

### 1. Composants UI Créés
- **`components/ui/upgrade-banner.tsx`**: Bannière d'upgrade avec icônes d'avertissement (remplace les engrenages)
- **`components/ui/trial-countdown.tsx`**: Compteur à rebours visible en haut pour les utilisateurs en essai
- **`components/ui/invoice-counter.tsx`**: Popup persistant pour les utilisateurs gratuits (5 factures max)

### 2. Base de Données
- **`supabase/migrations/017_add_trial_fields.sql`**: Migration SQL qui ajoute:
  - `trial_start_date` (timestamptz)
  - `trial_end_date` (timestamptz)
  - `is_trial_active` (boolean)
  - Index sur `is_trial_active`
  - Fonction `public.activate_trial(uuid)` pour activer l'essai
  - Fonction `public.expire_trials()` pour expirer les essais terminés

### 3. API Routes
- **`app/api/subscription/activate-trial/route.ts`**: POST pour activer l'essai
- **`app/api/subscription/trial-status/route.ts`**: GET pour vérifier le statut et le temps restant

### 4. Pages
- **`app/(app)/trial/page.tsx`**: Page d'essai gratuit complète avec animations, cartes 3D, explications

### 5. Hooks Mis à Jour
- **`hooks/useSubscription.ts`**: Ajout de la logique d'essai:
  - `isTrialActive`, `isTrial`
  - `trialRemaining` (jours, heures, minutes, secondes)
  - `canDeleteInvoice` (autorise les utilisateurs en essai)
  - `invoicesRemaining` pour les gratuits

### 6. Layout Intégré
- **`app/(app)/layout.tsx`**: Intègre tous les composants:
  - `TrialCountdown` pour les essais
  - `InvoiceCounter` pour les gratuits
  - `UpgradeBanner` sur `/invoices` pour les gratuits

### 7. Autres Modifications
- **`stores/dataStore.ts`**: Logique de suppression mise à jour (gratuits ne peuvent pas supprimer, essai oui)
- **`components/layout/Sidebar.tsx`**: Lien vers essai gratuit pour les utilisateurs gratuits
- **`app/(app)/paywall/page.tsx`**: Bannière promotionnelle pour l'essai gratuit

## Problème Actuel ⚠️

### Migration SQL Échoue
La migration `017_add_trial_fields.sql` échoue avec l'erreur:
```
ERROR: 42P01: relation "v_current_tier" does not exist
```

**Note**: Cette erreur est étrange car la dernière version du SQL n'utilise plus de variables `DECLARE` ni `v_current_tier`.

### Tentatives de Correction
1. Première version avec bloc `DECLARE` → Échec
2. Seconde version simplifiée → Toujours la même erreur
3. Version finale sans variables, avec `FOUND` → À tester

### Projet Supabase
- **Project Ref**: `ggrwyfhptxwpahwkeoyj`
- **MCP URL**: `https://mcp.supabase.com/mcp?project_ref=ggrwyfhptxwpahwkeoyj&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage`

### Commande MCP à Exécuter
```bash
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=ggrwyfhptxwpahwkeoyj&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage"
```

## Solution de Secours

Si la migration continue d'échouer, exécuter manuellement dans l'éditeur SQL Supabase:

```sql
-- Étape 1: Ajouter les colonnes
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS is_trial_active boolean DEFAULT false;

-- Étape 2: Créer l'index
CREATE INDEX IF NOT EXISTS idx_profiles_trial_active ON public.profiles(is_trial_active) WHERE is_trial_active = true;

-- Étape 3: Créer la fonction activate_trial
DROP FUNCTION IF EXISTS public.activate_trial(uuid);
CREATE OR REPLACE FUNCTION public.activate_trial(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    trial_start_date = now(),
    trial_end_date = now() + interval '4 days',
    is_trial_active = true,
    subscription_tier = 'trial'
  WHERE id = p_user_id
    AND subscription_tier NOT IN ('pro', 'business', 'trial')
    AND (is_trial_active IS NULL OR is_trial_active = false);
  RETURN FOUND;
END;
$$;

-- Étape 4: Créer la fonction expire_trials
DROP FUNCTION IF EXISTS public.expire_trials();
CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    is_trial_active = false,
    subscription_tier = 'free'
  WHERE
    is_trial_active = true
    AND trial_end_date < now()
    AND subscription_tier = 'trial';
END;
$$;

-- Étape 5: Permissions
GRANT EXECUTE ON FUNCTION public.activate_trial(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_trials() TO service_role;
```

## Fichiers Modifiés/Créés

### Nouveaux Fichiers:
- `components/ui/upgrade-banner.tsx`
- `components/ui/trial-countdown.tsx`
- `components/ui/invoice-counter.tsx`
- `supabase/migrations/017_add_trial_fields.sql`
- `app/api/subscription/activate-trial/route.ts`
- `app/api/subscription/trial-status/route.ts`
- `app/(app)/trial/page.tsx`

### Fichiers Modifiés:
- `hooks/useSubscription.ts`
- `stores/dataStore.ts`
- `app/(app)/layout.tsx`
- `components/layout/Sidebar.tsx`
- `app/(app)/paywall/page.tsx`

## Prochaine Étape
Une fois la migration SQL exécutée avec succès, tester le flux complet:
1. Utilisateur gratuit connecté → Voit le compteur de factures
2. Clic sur "Essai gratuit" → Page /trial
3. Activation de l'essai → 4 jours d'accès Pro
4. Compteur à rebours visible
5. Après 4 jours → Basculement vers Pro payant

# Variables d'environnement Vercel - Intégration SumUp OAuth 2.0

## Variables à ajouter dans Vercel

Rendez-vous sur : https://vercel.com/sociqls-projects/facturme/settings/environment-variables

### Variables obligatoires pour SumUp OAuth 2.0

```
SUMUP_CLIENT_ID=your_sumup_client_id
SUMUP_CLIENT_SECRET=your_sumup_client_secret
```

---

## Comment obtenir ces valeurs chez SumUp

### 1. Créer une application OAuth SumUp

1. Connectez-vous sur [developer.sumup.com](https://developer.sumup.com)
2. Allez dans **Your Apps** ou **Mes Applications**
3. Cliquez sur **Create a new app** ou **Créer une application**

### 2. Configurer l'application

Remplissez le formulaire :
- **App Name** : FacturmeWeb (ou le nom de votre projet)
- **App Description** : Application de facturation avec paiements SumUp
- **App Type** : Web Application

### 3. Configurer les URLs de redirection

Ajoutez ces URLs de redirection (Redirect URIs) :

```
https://facturme-psi.vercel.app/api/sumup/oauth/callback
https://localhost:3000/api/sumup/oauth/callback
```

Remplacez `facturme-psi.vercel.app` par votre domaine de production si différent.

### 4. Sélectionner les scopes (permissions)

Cochez les scopes suivants :
- ✅ **payments** — Créer des liens de paiement
- ✅ **user.profile_read** — Lire les infos du compte marchand

### 5. Récupérer les identifiants

Une fois l'application créée, SumUp vous affiche :
- **Client ID** → `SUMUP_CLIENT_ID`
- **Client Secret** → `SUMUP_CLIENT_SECRET`

Copiez ces valeurs dans vos variables d'environnement Vercel.

---

## Configuration dans Vercel

### Méthode via l'interface Vercel

1. Allez sur https://vercel.com/sociqls-projects/facturme/settings/environment-variables
2. Cliquez sur **Add New**
3. Ajoutez chaque variable :
   - **Key** : `SUMUP_CLIENT_ID`
   - **Value** : (votre client ID)
   - **Environment** : Production, Preview, Development
4. Répétez pour `SUMUP_CLIENT_SECRET`
5. Cliquez sur **Save**

### Via Vercel CLI (alternative)

```bash
vercel env add SUMUP_CLIENT_ID production
vercel env add SUMUP_CLIENT_SECRET production
```

---

## Variables d'environnement complètes (récapitulatif)

```env
# Supabase (déjà configuré)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# SumUp OAuth 2.0 (à ajouter)
SUMUP_CLIENT_ID=votre_client_id_ici
SUMUP_CLIENT_SECRET=votre_client_secret_ici

# Optionnel : Webhook SumUp
SUMUP_WEBHOOK_SECRET=votre_secret_pour_webhooks
```

---

## Tester l'OAuth en local

Pour tester localement, créez un fichier `.env.local` à la racine du projet :

```env
SUMUP_CLIENT_ID=votre_client_id
SUMUP_CLIENT_SECRET=votre_client_secret
```

Puis lancez le dev server :
```bash
npm run dev
```

---

## Dépannage

### Erreur : "redirect_uri_mismatch"

**Cause** : L'URL de redirection ne correspond pas à celle configurée chez SumUp.

**Solution** : Vérifiez que l'URL dans votre application SumUp correspond exactement à votre domaine Vercel, y compris le protocole (https) et le chemin.

### Erreur : "invalid_client"

**Cause** : Client ID ou Client Secret incorrect.

**Solution** : 
1. Vérifiez que vous avez bien copié les valeurs depuis SumUp Developer Portal
2. Assurez-vous qu'il n'y a pas d'espaces en trop dans les variables Vercel

### Erreur : "access_denied"

**Cause** : L'utilisateur a refusé l'autorisation ou les scopes ne sont pas corrects.

**Solution** : Vérifiez que les scopes `payments` et `user.profile_read` sont bien cochés dans votre application SumUp.

### Token qui expire fréquemment

**Comportement normal** : Les tokens SumUp expirent après 1 heure. Le système les rafraîchit automatiquement grâce au refresh token.

Si les problèmes persistent, vérifiez les logs Vercel dans la section Runtime Logs avec le filtre `sumup-oauth`.

---

## Sécurité

⚠️ **IMPORTANT** : Le `SUMUP_CLIENT_SECRET` est confidentiel. Ne le communiquez jamais et ne le committez jamais dans un dépôt public.

Vercel chiffre automatiquement ces variables et elles ne sont jamais exposées dans le code client-side.

---

## Support SumUp Développeurs

- **Documentation OAuth** : [developer.sumup.com/portal/docs/oauth](https://developer.sumup.com/portal/docs/oauth)
- **Support Email** : tech-support@sumup.com
- **Forum développeurs** : [developer.sumup.com/portal/community](https://developer.sumup.com/portal/community)

---

**Document créé le** : 22 avril 2026
**Version OAuth** : 2.0 (Authorization Code Flow)

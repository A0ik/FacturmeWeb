# Configuration Webhook SumUp - Mise à jour automatique des factures

## Vue d'ensemble

Quand un client paie une facture via SumUp, le webhook SumUp notifie automatiquement Factu.me qui met à jour la facture en **temps réel**. L'utilisateur connecté voit une notification sur son écran sans recharger la page.

---

## Comment ça marche

```
Client paie sur SumUp
       ↓
SumUp envoie webhook (POST /api/sumup/webhook)
       ↓
Factu.me met à jour la facture (status = "paid")
       ↓
Supabase Realtime notifie le navigateur
       ↓
La facture se met à jour en temps réel + notification toast
```

---

## Configuration du webhook SumUp

### 1. Obtenir l'URL du webhook

Votre URL webhook est :
```
https://facturme-psi.vercel.app/api/sumup/webhook
```

Remplacez `facturme-psi.vercel.app` par votre domaine de production si différent.

### 2. Configurer le webhook dans SumUp

1. Connectez-vous sur [merchants.sumup.com](https://merchants.sumup.com)
2. Allez dans **Settings → Developers** ou **Paramètres → Développeurs**
3. Cherchez la section **Webhooks**
4. Cliquez sur **Add webhook** ou **Ajouter un webhook**
5. Entrez l'URL : `https://facturme-psi.vercel.app/api/sumup/webhook`
6. Sélectionnez les événements à écouter :
   - ✅ **Checkout status changed** — obligatoire pour les paiements
7. Cliquez sur **Save** ou **Enregistrer**

### 3. Configurer le secret webhook (recommandé)

Pour sécuriser le webhook, SumUp peut signer les requêtes avec un secret.

1. Dans la configuration du webhook SumUp, définissez un **secret** (ex: un mot de passe aléatoire)
2. Copiez ce secret
3. Ajoutez la variable d'environnement dans Vercel :

```
SUMUP_WEBHOOK_SECRET=votre_secret_ici
```

Pour ajouter cette variable :
- Allez sur https://vercel.com/sociqls-projects/facturme/settings/environment-variables
- Cliquez **Add New**
- Key : `SUMUP_WEBHOOK_SECRET`
- Value : (votre secret SumUp)

---

## Tester le webhook

### Test manuel

SumUp permet de tester les webhooks depuis leur dashboard :

1. Dans la section Webhooks de SumUp
2. Cliquez sur **Send test webhook** ou **Envoyer webhook de test**
3. Vérifiez les logs Vercel pour confirmer la réception

### Vérifier les logs

Allez sur https://vercel.com/sociqls-projects/facturme/logs et filtrez avec `sumup-webhook` pour voir :
- Les webhooks reçus
- Les factures mises à jour
- Les erreurs éventuelles

---

## Comportement pour l'utilisateur

### Notification de paiement

Quand un client paie une facture :

1. ✅ L'utilisateur connecté voit une **notification toast** verte en haut à droite :
   ```
   💰 Paiement reçu ! La facture a été marquée comme payée.
   ```

2. ✅ Le badge de statut change instantanément :
   - Avant : "Envoyée" (bleu)
   - Après : "Payée" (vert)

3. ✅ La page facture se met à jour en temps réel (pas besoin de recharger)

### Mise à jour automatique en arrière-plan

L'écoute Realtime fonctionne même quand l'utilisateur est sur une autre page :
- Dès qu'il revient sur la facture, le statut à jour est affiché
- La liste des factures se met aussi à jour automatiquement

---

## Détails techniques

### Webhook Handler

**Fichier** : `app/api/sumup/webhook/route.ts`

Le webhook :
1. Vérifie la signature HMAC-SHA256 (si secret configuré)
2. Parse l'événement SumUp
3. Détecte les événements `checkout.status.changed` avec `status === "PAID"`
4. Trouve la facture par `sumup_checkout_id` ou `checkout_reference`
5. Met à jour : `status = "paid"`, `paid_at = NOW()`, `payment_method = "sumup"`

### Realtime Updates Hook

**Fichier** : `hooks/use-invoice-realtime.ts`

Le hook :
1. S'abonne aux changements PostgreSQL sur la facture via Supabase Realtime
2. Met à jour l'état local quand un changement est détecté
3. Déclenche une notification si le statut passe à "paid"

### Page Facture

**Fichier** : `app/(app)/invoices/[id]/page.tsx`

Utilise le hook `useInvoiceRealtime` pour :
- Recevoir les mises à jour en temps réel
- Afficher la notification toast
- Mettre à jour l'UI instantanément

---

## Dépannage

### Webhook non reçu

**Symptôme** : Le paiement est effectué mais la facture ne se met pas à jour

**Solutions** :
1. Vérifier que l'URL webhook est correcte dans SumUp
2. Vérifier les logs Vercel (filtre `sumup-webhook`)
3. Tester le webhook manuellement depuis SumUp

### Erreur "Invalid signature"

**Symptôme** : Le webhook retourne 401

**Solution** :
- Vérifiez que `SUMUP_WEBHOOK_SECRET` est configuré dans Vercel
- Vérifiez que le secret dans Vercel correspond exactement à celui dans SumUp
- Si vous changez le secret, mettez-le à jour dans les 2 endroits

### La notification ne s'affiche pas

**Symptôme** : La facture est payée mais pas de notification

**Causes possibles** :
1. L'utilisateur n'est pas connecté
2. L'utilisateur est sur une autre page (la notification s'affichera au retour)
3. Le navigateur bloque les notifications (vérifier les paramètres du navigateur)

**Solution** : Le statut se met à jour quand même, l'utilisateur le verra en rechargeant la page ou en y retournant.

---

## Variables d'environnement requises

```env
# Supabase (déjà configuré)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# SumUp OAuth (déjà configuré)
SUMUP_CLIENT_ID=xxx
SUMUP_CLIENT_SECRET=xxx

# SumUp Webhook (à ajouter)
SUMUP_WEBHOOK_SECRET=votre_secret_webhook
```

---

## Sécurité

Le webhook SumUp est sécurisé par :
1. **Signature HMAC-SHA256** : Empêche les requêtes falsifiées
2. **HTTPS uniquement** : Transport chiffré
3. **Validation des données** : Seuls les événements `PAID` déclenchent des mises à jour

---

## Support

Si vous rencontrez des problèmes :

1. **Logs Vercel** : https://vercel.com/sociqls-projects/facturme/logs
2. **Dashboard SumUp** : https://merchants.sumup.com → Developers → Webhooks
3. **Documentation** : [developer.sumup.com/api/webhooks](https://developer.sumup.com/api/webhooks/)

---

**Document créé le** : 22 avril 2026
**Version** : 2.0 (OAuth + Realtime)

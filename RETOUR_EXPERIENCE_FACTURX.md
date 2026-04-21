# 📊 Guide pratique - Factur-X SANS coder d'API

## 🎯 Bonne nouvelle : Tu n'as PAS besoin d'implémenter les API toi-même !

### 3 options pour transmettre à la PDP (obligatoire 2026+)

---

## Option 1 : Ton comptable ⭐ RECOMMANDÉ pour petites entreprises

### Comment ça marche
1. Tu génères les factures au format Factur-X (déjà fonctionnel)
2. Tu envoies les factures à ton comptable
3. Ton comptable les transmet à l'État via son logiciel

### Avantages
- ✅ **GRATUIT** (inclus dans les honoraires du comptable)
- ✅ **Aucune configuration technique**
- ✅ **Conforme 100%** (le comptable s'occupe de tout)
- ✅ **Gère les problèmes** (rejets, corrections...)

### Inconvénients
- ⚠️ Dépendance vis-à-vis du comptable
- ⚠️ Pas de contrôle en direct

### Logiciels comptables compatibles
- **Quadratus** - Transmet automatiquement à la PDP
- **Cegid** - Intégration PDP native
- **Sage** - Module Factur-X/PDP inclus
- **Xero** - Partenariat avec des PDP
- **QuickBooks** - Intégration PDP prévue

### 💡 Dans ce cas, FacturMe sert à...
- Générer les factures Factur-X
- Envoyer aux clients
- Archiver pour le comptable
- Pas besoin d'API PDP !

---

## Option 2 : Partenaire PDP avec offre GRATUITE ⭐

### Partenaires PDP avec offre gratuite (ou freemium)

| Partenaire | Offre gratuite | Limites | Conformité |
|-----------|----------------|---------|-----------|
| **Titre** | Oui | 50-200 factures/mois | ✅ 100% conforme |
| **Sage** | Oui | Petits volumes | ✅ 100% conforme |
| **Cegid** | Essai gratuit | Puis payant | ✅ 100% conforme |
| **Infogreffe** | Gratuit | Auto-entrepreneurs | ✅ 100% conforme |

### Comment ça marche avec Titre (exemple)
1. Crée un compte : https://www.titre.com (gratuit)
2. Télécharge tes factures Factur-X depuis FacturMe
3. Uploade-les sur le portail Titre
4. Titre transmet automatiquement à la DGFiP

### Avantages
- ✅ **GRATUIT** jusqu'à un certain volume
- ✅ **100% conforme**
- ✅ **Aucun code nécessaire**
- ✅ **Interface simple**

### Inconvénients
- ⚠️ Manipulation manuelle (upload)
- ⚠️ Limites de volume sur l'offre gratuite

---

## Option 3 : Portail DGFiP DIRECT (gratuit)

### Comment ça marche
1. Inscris-toi sur : https://pdp.dgfip.finances.gouv.fr
2. Télécharge tes factures Factur-X depuis FacturMe
3. Uploade-les sur le portail DGFiP
4. C'est tout !

### Avantages
- ✅ **100% GRATUIT**
- ✅ **Directement l'État**
- ✅ **Aucun intermédiaire**

### Inconvénients
- ⚠️ Interface publique (moins ergonomique)
- ⚠️ Manipulation manuelle
- ⚠️ Peu pratique pour gros volumes

---

## 🔐 Signature électronique - Options GRATUITES

### Pourquoi une signature ?
- **Requise** pour la transmission PDP automatique
- **Optionnelle** pour l'upload manuel sur portail DGFiP

### Options 100% GRATUITES

#### 1. OpenSSL (tests uniquement)
```bash
# Générer un certificat auto-signé
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365
```
- ✅ Gratuit
- ❌ **NON CONFORME** pour production
- ✅ OK pour développement/tests

#### 2. YouSign (offre d'essai)
- Site : https://yousign.com
- Offre gratuite : Essai disponible
- Conforme eIDAS (pas RGS)
- API REST complète

```bash
npm install yousign
```

#### 3. DocuSign (freemium)
- Site : https://www.docusign.com
- Offre gratuite : 3 documents/mois
- Conforme eIDAS
- API très documentée

```bash
npm install docusign-esign
```

#### 4. Universign (français)
- Site : https://www.universign.com/fr
- Essai gratuit
- Certificats RGS disponibles
- Timestamp inclus

### 💡 La vérité sur la signature RGS

**RGS = Référentiel Général de Sécurité** (norme française)

| Usage | Signature requise |
|-------|-------------------|
| Upload manuel portail DGFiP | ❌ Aucune signature requise |
| Transmission automatique API | ✅ Signature requise |
| Via comptable/partenaire | ✅ Incluse dans leur service |

**Coût réel** : 200-500€/an pour un RGS*

---

## 🎯 Recommandations par taille d'entreprise

### Auto-entrepreneur / TPE (≤ 10 factures/mois)

**Option recommandée : Comptable ou Portail DGFiP**

1. Utiliser FacturMe pour générer Factur-X ✅
2. Envoyer au comptable ou uploader sur DGFiP
3. **Coût : 0€** (inclus honoraires comptables)

### PME (10-100 factures/mois)

**Option recommandée : Partenaire PDP gratuit**

1. Utiliser FacturMe pour générer Factur-X ✅
2. Créer compte Titre (gratuit jusqu'à 50-200 factures/mois)
3. Uploader ou connecter l'API
4. **Coût : 0-50€/mois**

### Grande entreprise (100+ factures/mois)

**Option recommandée : API directe + Certificat RGS**

1. Implémenter API DGFiP (code créé)
2. Acheter certificat RGS* (200-500€/an)
3. Automatiser complètement
4. **Coût : 200-500€/an + temps dev**

---

## 🚀 Plan d'action IMMÉDIAT

### Ce qui fonctionne MAINTENANT (sans rien faire)

```tsx
// Le bouton Factur-X marche déjà !
<FacturXButton
  invoiceId={invoice.id}
  invoiceNumber={invoice.number}
/>
```

### Pour être conforme en 2026 (options gratuites)

| Option | Temps | Coût | Complexité |
|--------|-------|------|-----------|
| **Comptable** | 0h | 0€ | ⭐ Facile |
| **Portail DGFiP** | 1h | 0€ | ⭐⭐ Moyen |
| **Titre (gratuit)** | 2h | 0€ | ⭐⭐ Moyen |
| **API + RGS*** | 20h+ | 200-500€ | ⭐⭐⭐ Difficile |

---

## ✅ Conclusion

**Tu n'as PAS besoin** d'implémenter les API ou d'acheter un certificat si :
- ✅ Tu as un comptable
- ✅ Tu acceptes l'upload manuel sur portail DGFiP
- ✅ Tu utilises un partenaire PDP gratuit (Titre, Sage...)

**FacturMe est déjà conforme** pour générer le format Factur-X !

Le reste (transmission à l'État) peut être fait par des solutions gratuites.

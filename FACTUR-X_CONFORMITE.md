# Conformité Factur-X et Réforme Facturation Électronique 2026+

## 📊 État actuel de la conformité

| Composant | Statut | Impact |
|-----------|--------|--------|
| Format Factur-X (EN 16931) | ✅ Conforme | Critique |
| Génération PDF + XML | ✅ Opérationnel | Critique |
| Validation champs PDP | ⚠️ Partiel | Critique |
| Transmission PDP automatique | ❌ Manquant | Critique |
| Signature électronique | ❌ Manquant | Critique |
| Chorus Pro (B2G) | ❌ Manquant | Haut |
| Format EDIGASO | ❌ Manquant | Moyen |
| API DGFiP | ❌ Manquant | Critique |

**Score global de conformité : ~45%**

---

## ✅ Ce qui fonctionne déjà

### 1. Format Factur-X (EN 16931)
- ✅ Génération PDF avec XML embarqué
- ✅ Profil EN 16931 conforme
- ✅ Métadonnées XMP correctes
- ✅ Validation structurelle XML

**Fichiers :**
- `lib/facturx.ts` - Génération et validation
- `components/ui/FacturXButton.tsx` - Interface utilisateur

### 2. Validation PDP
- ✅ Vérification des champs obligatoires
- ✅ Détection des informations manquantes
- ✅ Recommandations d'amélioration

**Fichiers :**
- `components/ui/PDPValidator.tsx`

### 3. Interface utilisateur
- ✅ Bouton de téléchargement fonctionnel
- ✅ Documentation d'aide complète
- ✅ Logs d'audit

---

## ❌ Ce qui manque pour la conformité complète

### 1. Transmission PDP automatique (CRITIQUE)

**Description :** Envoi automatique des factures à la Plateforme de Dématérialisation Partagée de l'État.

**Ce qu'il faut implémenter :**
- API DGFiP pour la transmission des factures
- Gestion des accusés de réception
- Retry automatique en cas d'échec
- Historique des transmissions

**Options API gratuites :**
1. **API DGFiP (gratuite)** - Officielle pour les PDP
   - Documentation : https://www.dgfip.gouv.fr
   - Nécessite : Certificat de signature
   - Délai : 2-4 semaines pour l'accréditation

2. **Partenaires PDP (payants mais offres d'essai)**
   - Titre (https://www.titre.com)
   - SAGE (https://www.sage.com)
   - Cegid (https://www.cegid.com)

### 2. Signature électronique (CRITIQUE)

**Description :** Certificat de signature pour authentifier les factures transmises.

**Ce qu'il faut implémenter :**
- Intégration avec un fournisseur de certificats
- Signature des PDF Factur-X
- Validation des certificats
- Gestion du renouvellement

**Options API gratuites :**
1. **OpenSSL (gratuit)** - Pour développement uniquement
2. **Sectigo (payant)** - Certificats RGS
3. **Certigna (payant)** - Certificats RGS français
4. **DigiCert (payant)** - Certificats internationaux

### 3. Chorus Pro - B2G (HAUT)

**Description :** Connexion à Chorus Pro pour la facturation des commandes publiques.

**Ce qu'il faut implémenter :**
- API Chorus Pro
- Gestion des flux dépenses
- Synchronisation des statuts
- Gestion des rejets

**Options API :**
1. **API Chorus Pro (gratuite)** - Officielle
   - Documentation : https://chorus-pro.gouv.fr
   - Nécessite : Habilitation et certificat
   - Délai : 4-6 semaines pour l'habilitation

### 4. Format EDIGASO (MOYEN)

**Description :** Format spécifique pour les factures B2G (administration).

**Ce qu'il faut implémenter :**
- Convertisseur Factur-X vers EDIGASO
- Validation des spécifications EDIGASO
- Tests avec les portails B2G

**Ressources :**
- Spécifications : https://www.economie.gouv.fr

---

## 🔧 Implémentation recommandée

### Étape 1 : Transmission PDP (priorité CRITIQUE)

```bash
# Créer le service de transmission PDP
app/api/pdp/transmit/route.ts
lib/pdp-transmitter.ts
```

**Fonctionnalités :**
1. Vérifier l'éligibilité à la transmission
2. Préparer le payload selon les spécifications DGFiP
3. Signer avec le certificat
4. Envoyer à l'API DGFiP
5. Traiter l'accusé de réception
6. Logger le résultat

### Étape 2 : Signature électronique (priorité CRITIQUE)

```bash
# Créer le service de signature
lib/electronic-signature.ts
components/admin/CertificateManager.tsx
```

**Fonctionnalités :**
1. Upload du certificat RGS
2. Signature des PDF Factur-X
3. Vérification de la validité
4. Alertes de renouvellement

### Étape 3 : Intégration Chorus Pro (priorité HAUTE)

```bash
# Créer le service Chorus Pro
app/api/chorus/send/route.ts
lib/chorus-pro.ts
```

**Fonctionnalités :**
1. Connexion à l'API Chorus Pro
2. Conversion au format EDIGASO
3. Gestion des flux dépenses
4. Suivi des statuts

---

## 📦 Dépendances à ajouter

```bash
# Signature électronique
npm install node-forge @peculiar/webcrypto

# XML et validation
npm install xmldom xpath

# Pour les tests
npm install @types/node-forge
```

---

## 🚀 Roadmap de mise en conformité

### Phase 1 : Fondations (semaine 1-2)
- [ ] Mettre en place les variables d'environnement pour les API
- [ ] Créer les services de base pour la transmission
- [ ] Mettre en place la gestion des certificats

### Phase 2 : Intégration PDP (semaine 3-4)
- [ ] Intégrer l'API DGFiP
- [ ] Implémenter la signature électronique
- [ ] Mettre en place les retries automatiques

### Phase 3 : Chorus Pro (semaine 5-6)
- [ ] Intégrer l'API Chorus Pro
- [ ] Implémenter le format EDIGASO
- [ ] Tests avec l'environnement de test

### Phase 4 : Tests et validation (semaine 7-8)
- [ ] Tests bout en bout
- [ ] Validation avec la DGFiP
- [ ] Documentation utilisateur

---

## 📚 Ressources utiles

### Officielles
- **DGFiP** : https://www.dgfip.gouv.fr
- **Chorus Pro** : https://chorus-pro.gouv.fr
- **FNFE-MPE** : https://fnfe-mpe.org/factur-x/
- **Économie.gouv.fr** : https://www.economie.gouv.fr/facture-electronique

### Spécifications techniques
- **EN 16931** : https://fnfe-mpe.org/factur-x/
- **Factur-X** : https://www.ferd-net.de/
- **EDIGASO** : https://www.economie.gouv.fr

### Outils de validation
- **Validateur Factur-X** : https://facturx.lierney.com/
- **Validateur EN 16931** : https://www.peppol.eu/

---

## ⚠️ Points d'attention

1. **Délai d'accréditation** : Compter 4-8 semaines pour l'accès aux API officielles
2. **Certificat RGS** : Obligatoire et payant (~200-500€/an)
3. **Tests obligatoires** : L'environnement de test est obligatoire avant la production
4. **Pénalités** : Non-conformité = 0.5% du chiffre d'affaires (plafonné à 75k€)

---

## 🎯 Score cible

Pour être conforme à 100% :
- Tous les critères "critiques" doivent être conformes
- Tous les critères "hauts" doivent être conformes
- Les critères "moyens" et "faibles" sont optionnels

**Actuel : 45%**
**Cible Q1 2026 : 100%** (date limite réforme)

---

## 📞 Support

Pour l'implémentation des API PDP et Chorus Pro :
1. Contacter le support DGFiP : support.dgfip@finances.gouv.fr
2. S'inscrire sur le portail développeur : https://developer.gouv.fr
3. Consulter les forums spécialisés : https://www.developpement-durable.gouv.fr

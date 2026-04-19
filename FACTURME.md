# Factu.me — Documentation Produit

## Qu'est-ce que Factu.me ?

**Factu.me** est une plateforme SaaS de facturation et de gestion d'entreprise 100% française, conçue pour les auto-entrepreneurs, freelances, TPE et PME. Elle permet de créer, envoyer et gérer toutes vos factures et documents commerciaux en quelques clics, avec l'aide de l'intelligence artificielle.

### Le problème que l'on résout

Les entrepreneurs français perdent des heures chaque mois sur des tâches administratives : rédiger des factures, relancer les impayés, faire la comptabilité, gérer les clients. Factu.me automatise tout ça pour que vous vous concentriez sur votre activité.

---

## Fonctionnalités principales

### 1. Facturation multi-documents

Créez 6 types de documents professionnels :

| Type | Description |
|------|-------------|
| **Facture** | Document de facturation standard avec TVA |
| **Devis** | Proposition commerciale, valable 30 jours par défaut |
| **Avoir** | Note de crédit ou remboursement |
| **Bon de commande** | Commande d'achat officielle |
| **Bon de livraison** | Confirmation de livraison de marchandises |
| **Facture d'acompte** | Paiement partiel avant livraison finale |

Chaque document inclut :
- Numérotation automatique (ex: `FACT-2026-001`)
- Lignes de prestation avec quantité, prix HT, TVA (0%, 5.5%, 10%, 20%)
- Remise globale en pourcentage
- Conditions de paiement personnalisables
- Mentions légales automatiques (pénalités de retard, indemnité forfaitaire 40€, art. L.441-6)
- Logo, couleurs et informations de l'entreprise

### 2. Création par Intelligence Artificielle

**Dictez votre facture à voix haute** ou **décrivez-la en texte** — l'IA fait tout le reste.

- **Dictée vocale** : Appuyez sur le micro, parlez naturellement ("Facture pour Dupont Consulting, 5 jours de développement web à 600€ HT, TVA 20%"), l'IA remplit automatiquement tous les champs
- **Génération textuelle** : Tapez votre description, l'IA génère la facture complète
- **Modification intelligente** : L'IA comprend si vous voulez ajouter, modifier ou supprimer une ligne ("ajoute 2 jours de conseil à 400€")
- **Descriptions professionnelles** : L'IA transforme "site web" en "Conception et développement de site web" automatiquement

### 3. Envoi et suivi

- **Envoi par e-mail** avec pièce jointe PDF professionnelle et template HTML personnalisé
- **Liens de paiement en ligne** : Stripe et SumUp intégrés — vos clients paient directement
- **Portail client** : vos clients accèdent à un espace sécurisé pour voir leurs factures, payer et signer
- **Relances automatiques** pour les factures impayées
- **Signature électronique** pour les devis et contrats
- **Suivi en temps réel** : brouillon, envoyée, payée, en retard

### 4. 6 Templates PDF professionnels

Choisissez parmi 6 modèles de documents, tous personnalisables avec votre logo et vos couleurs :

1. **Minimaliste** — Épuré, barre d'accent discrète, moderne
2. **Classique** — Formaliste, header sombre, polices serif (Georgia)
3. **Moderne** — Gradient coloré, design audacieux
4. **Élégant** — Tons chauds ivoire, bordures raffinées
5. **Corporate** — Slate bleu nuit, structuré et professionnel
6. **Nature** — Tons verts organiques, design frais

Tous les templates affichent : vos informations d'entreprise, les détails du client, le tableau des prestations, les totaux, les conditions de paiement, les coordonnées bancaires et les mentions légales.

---

## Gestion de clients (CRM léger)

### Fiches clients complètes
- Nom, e-mail, téléphone, adresse complète
- SIRET, numéro de TVA intracommunautaire
- Tags de catégorisation
- Logo par client
- Notes internes
- Historique des factures

### Import et automatisation
- **Import CSV** pour ajouter des clients en masse
- **Recherche automatique** d'entreprise via l'API du registre français (auto-complétion SIRET, adresse, etc.)
- **Association client → facture** avec pré-remplissage automatique

### CRM Pipeline (Pro/Business)
- **Pipeline de vente en 6 étapes** : Prospect → Qualifié → Proposition → Négociation → Gagné → Perdu
- Probabilité de conversion par étape
- Valeur estimée des deals
- Glisser-déposer entre les étapes

---

## Comptabilité et finances

### Export FEC (Fichier des Écritures Comptables)
Conforme aux exigences de la DGFiP. Export officiel pour la déclaration fiscale française. Disponible en plans Pro et Business.

### Factur-X
Export au format électronique ZUGFeRD/Factur-X pour l'échange de factures B2B, conforme à la réglementation européenne.

### Suivi des dépenses
- Catégorisation : Transport, Repas, Hébergement, Équipement, Bureau, Courses, Autre
- Modes de paiement : Carte, Espèces, Virement, Chèque
- TVA récupérable sur les dépenses
- Justificatifs attachés

### Scan de documents (OCR)
- Photographiez ou uploadez un reçu/facture fournisseur
- L'IA extrait automatiquement : montant, TVA, date, fournisseur
- Catégorisation intelligente des dépenses
- Rapprochement automatique avec les transactions bancaires

### Import bancaire
- Compatible avec les principales banques françaises (BNP, Société Générale, Crédit Agricole, etc.)
- Formats CSV et OFX
- Rapprochement automatique factures ↔ transactions

---

## Espace collaboratif

### Workspaces multi-équipes (Business)
- Jusqu'à 10 espaces de travail isolés
- Invitation de collaborateurs par lien
- Rôles : Propriétaire, Admin, Éditeur, Lecteur
- Données séparées par workspace

### Flux d'activité
- Timeline unifiée de toutes les actions
- Filtre par type : factures, paiements, clients, dépenses
- Temps relatif ("il y a 5 minutes")

---

## Calendrier et rendez-vous

- Vue mensuelle complète
- Prise de rendez-vous liée à un client
- Catégories colorées
- Lieu et notes
- Récurrence des rendez-vous

---

## Catalogue produits et services

- Fiches produits avec prix unitaire, unité (heure, jour, forfait, kg, km…)
- Catégories : Service, Produit, Logiciel, Conseil, Autre
- TVA personnalisable par produit
- Ajout rapide depuis une facture

---

## Gestion des fournisseurs

- Base de données fournisseurs
- Mapping automatique pour le rapprochement bancaire
- Codes comptables associés
- Statistiques par fournisseur

---

## Notifications

- **Push notifications** dans le navigateur
- Alertes : facture payée, impayée, envoi, invitation workspace
- Historique complet des notifications
- Marquage lu/non-lu

---

## Intégrations

| Intégration | Usage | Plans |
|-------------|-------|-------|
| **Stripe** | Paiements en ligne, abonnements SaaS, Connect pour les utilisateurs | Tous |
| **SumUp** | Alternative européenne de paiement | Tous |
| **OpenRouter AI** | Génération de factures, analyse de documents, OCR | Solo+ |
| **Groq** | Reconnaissance vocale (Whisper) | Solo+ |
| **Brevo** | Envoi d'e-mails transactionnels avec PDF joint | Tous |
| **Supabase** | Base de données, authentification, stockage, RLS | Backend |

---

## Sécurité et conformité

- **Row Level Security (RLS)** sur toutes les tables Supabase — chaque utilisateur n'accède qu'à ses propres données
- **Authentification** : email/mot de passe + Google OAuth
- **Portail client** sécurisé par token unique avec date d'expiration
- **Export RGPD** : téléchargement complet de vos données
- **Suppression de compte** avec effacement total
- **Mentions légales automatiques** conformes au droit français (pénalités de retard, TVA non applicable art. 293 B, etc.)

---

## Onboarding

Processus d'inscription en 5 étapes :

1. **Langue** — Français ou Anglais
2. **Entreprise** — Nom, statut juridique (auto-entrepreneur, EURL, SARL, SAS, SASU…), secteur d'activité
3. **Adresse & Banque** — Adresse complète, téléphone, IBAN/BIC
4. **Template** — Choix parmi 6 modèles de facture
5. **Terminé** — Accès immédiat au dashboard

---

## Tarifs

| | **Gratuit** | **Solo — 9.99€/mois** | **Pro — 19.99€/mois** | **Business — 39.99€/mois** |
|---|---|---|---|---|
| Factures/mois | 3 | ∞ | ∞ | ∞ |
| Clients | ∞ | ∞ | ∞ | ∞ |
| Templates PDF | 6 | 6 | 6 | 6 |
| Envoi par e-mail | ✓ | ✓ | ✓ | ✓ |
| Paiement en ligne | ✓ | ✓ | ✓ | ✓ |
| IA & Dictée vocale | — | ✓ | ✓ | ✓ |
| Export FEC | — | — | ✓ | ✓ |
| CRM Pipeline | — | — | ✓ | ✓ |
| Factures récurrentes | — | — | ✓ | ✓ |
| Signature électronique | — | — | ✓ | ✓ |
| Workspaces | — | 1 | 1 | 10 |
| Multi-utilisateurs | — | — | — | ✓ |
| API & Webhooks | — | — | — | ✓ |
| Support prioritaire | — | — | — | ✓ |

---

## Stack technique

- **Frontend** : Next.js 15 (App Router), React 19, Tailwind CSS, Zustand
- **Backend** : Next.js API Routes, Supabase (PostgreSQL, Auth, Storage)
- **PDF** : @react-pdf/renderer, pdf-lib
- **IA** : OpenRouter (Mistral), Groq (Whisper)
- **Paiements** : Stripe, SumUp
- **E-mail** : Brevo
- **Notifications** : Web Push API (VAPID)
- **Déploiement** : Vercel

---

## En résumé

Factu.me est la solution tout-en-un pour les entrepreneurs français qui veulent se débarrasser de la paperasse. Facturation, IA, comptabilité, CRM, paiements — tout est centralisé dans une interface moderne et intuitive. Plus besoin de 5 outils différents : Factu.me remplace votre logiciel de facturation, votre comptable pour les tâches basiques, votre CRM et votre scanner de reçus.

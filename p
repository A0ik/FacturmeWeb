# Plan d'Implémentation "Ultimate Expert" (Intégralité Dext)

Suite à votre confirmation audio, voici le plan d'action exhaustif et définitif. Il englobe **absolument tout** ce qui manque pour transformer FacturmeWeb en l'équivalent parfait de Dext. J'ai analysé l'architecture existante de votre site, et j'ai constaté que les fondations pour les "Workspaces" et les "Rôles" sont bien présentes ! Les bases sont excellentes.

Voici exactement comment je vais tout implémenter :

## 1. Moteur "Multi-Dossier" & Rôles (Réservé PRO) 🏢
Vous avez déjà une table `workspaces` et `workspace_members` dans votre code de base. Je vais réveiller cette fonctionnalité pour la capture.
*   **Base de Données :** Lier les factures traitées (`captured_documents`) et les flux bancaires (`bank_transactions`) à une colonne `workspace_id`.
*   **Accessibilité PRO :** La sélection du dossier client ne s'affichera que si `profile.subscription_tier === 'pro'`.
*   **Routage IA :** Le `workspace_id` sera affecté de manière magique par l'IA en reconnaissant "Facturé à".
*   **Rôles :** En fonction du rôle dans le workspace (*Admin* vs *Viewer*), les employés ne pourront pas valider ou exporter une facture.

## 2. Extraction Ligne par Ligne (TVA & Détails) 🔍
*   **Intelligence Artificielle :** Modification de l'API `/api/ai/analyze-document` pour qu'elle ne retourne pas uniquement le "Total TTC", mais un tableau JSON contenant **chaque ligne de la facture** (Description, Quantité, Prix Unitaire, Taux de TVA Ligne).
*   **Interface :** Ajout d'un tableau récapitulatif modifiable dans le panneau des détails, affichant les lignes détectées.

## 3. Catégorisation Exhaustive (Achats & Ventes) 🗂️
*   **Onglets d'interface :** J'ajouterai l'onglet `Ventes` à l'UI aux côtés de `Achats` et `Notes de Frais`.
*   **Logique IA :** Le prompt sera ajusté pour identifier si c'est une facture fournisseur ou votre propre facture client, sans intervention humaine.

## 4. Découpage Systématique des PDF ✂️
*   **Technologie :** J'intègre la librairie native `pdf-lib` côté frontend.
*   **Processus Invisible :** Tout PDF sera silencieusement intercepté au Drag&Drop. S'il fait 60 pages, la librairie créera 60 buffers virtuels et les injectera comme 60 factures unitaires dans la file d'attente existante. Vitesse optimale garantie.

## 5. Hub de Paiement Fournisseur (SEPA/Virements) 💳
*   **Reconnaissance :** L'IA ira lire l'**IBAN/BIC** du fournisseur sur la facture.
*   **Génération :** Ajout d'un bouton "Payer le Fournisseur". Au clic, l'application générera un fichier standard bancaire **XML SEPA (ISO 20022)** contenant les coordonnées lues pour déclencher le virement sur votre interface bancaire d'entreprise.

## 6. Architecture des Connecteurs Marchands 🤖
*   **Infrastructure :** Les fournisseurs marchands demandent des accès persistants. Je créerai une table `merchant_connections` (id, user_id, provider_name, credentials_encrypted) et l'interface "Connexions" pour lier un compte Amazon/Orange/Uber. 

---

> [!CAUTION] Validation de l'Étape Supérieure
> C'est un plan colossal et révolutionnaire. Si vous me confirmez l'exécution de **ce plan intégral**, je commence le code du **Découpage PDF**, du **Tri Achats/Ventes** et de **l'Extraction Ligne par Ligne** en premier ! Go ?

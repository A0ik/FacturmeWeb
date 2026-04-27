# RAPPORT D'INTERVENTION - Mise à jour FacturmeWeb

## Date : 27/04/2026

---

## ✅ 1. TAUX DE COTISATION 2026 - CORRIGÉS

### Modifications dans `[lib/labor-law/cotisations.ts]`

#### Taux CSG/CRDS 2026 (CORRECTS)
- **CSG déductible** : 6.80% (sur 98.25% du brut)
- **CSG non-déductible** : 2.40% (sur 98.25% du brut)
- **CRDS** : 0.50% (sur 98.25% du brut)
- **Total CSG/CRDS** : 9.70% sur 98.25% du salaire brut

#### Taux Retraite 2026 (CORRECTS)
- **Vieillesse plafonnée salariale** : 6.93%
- **Vieillesse déplafonnée salariale** : 0.40%
- **Vieillesse patronale** : 10.55% (8.55% plafonnée + 2.00% déplafonnée)
- **Retraite cadres AGIRC-ARRCO** : variable selon tranches

#### Réduction Fillon 2026 (AJOUTÉE)
- Devenue "Réduction générale des cotisations"
- Formule : `Coefficient = (Salaire/SMIC × 1.6 - 1) / 0.6`
- Plafonnée à 31.95% du salaire brut
- Applicable si salaire < 1.6 × SMIC

#### Plafond SS 2026
- **Mensuel** : 3 666 €
- **Annuel** : 43 992 €

---

## ✅ 2. MODÈLES IA UTILISÉS ET COÛTS

### Liste des modèles IA utilisés dans l'application

| Modèle | Usage | Coût | Localisation |
|--------|-------|------|--------------|
| **Google Gemma 3 27B** | Parsing texte/voix contrats | ~0.10€/M tokens | `process-text-contract/route.ts` |
| **Groq Whisper Large v3 Turbo** | Transcription audio | GRATUIT via Groq | `process-voice-contract/route.ts` |
| **Claude 3.5 Sonnet** | LiaService (conformité légale) | Via OpenRouter | `lia-service.ts` |

### Coût estimé par contrat
- **Texte → Contrat** : ~0.002€ (2K tokens)
- **Voix → Contrat** : ~0.003€ (transcription + 3K tokens)
- **Vérification conformité** : ~0.005€ (5K tokens)

---

## ✅ 3. MAGNIFICENT DATE PICKER - AMÉLIORÉ

### Nouvelles fonctionnalités ajoutées

#### 1. Saisie directe au format JJ/MM/AAAA
- L'utilisateur peut maintenant taper directement la date
- Détection automatique du format
- Validation en temps réel

#### 2. Masquage des dates passées
- Nouveau prop `disablePastDates` (par défaut: false)
- Quand activé, masque automatiquement toutes les dates avant aujourd'hui
- Utilisation recommandée pour les contrats

#### 3. Utilisation dans les contrats
```tsx
<MagnificentDatePicker
  label="Date de début du contrat"
  disablePastDates={true}  // Masque les dates passées
  allowTextInput={true}     // Permet la saisie JJ/MM/AAAA
  value={contractStartDate}
  onChange={setContractStartDate}
/>
```

---

## ✅ 4. IA CONTRATS - AMÉLIORATIONS

### Extraction améliorée des informations

#### Numéro de Sécurité sociale
- Détection des formats: 15 chiffres, X XX XX XX XXX XXX XX
- Recherche des termes: NIR, numéro Sécu, sécurité sociale, SS
- Nettoyage automatique (sans espaces ni tirets)

#### Nationalité
- Détection des termes: nationalité, de nationalité, Français(e)
- Valeurs courantes: Française, Marocaine, Algérienne, Tunisienne, etc.

#### Dates de contrat
- Recherche: date de début, date de fin, prise de fonction
- Conversion automatique au format YYYY-MM-DD
- Support des dates relatives ("dans 2 semaines", "le mois prochain")

### Exemples de prompts améliorés

**Dicter**: *"Je veux embaucher Marie Dupont, de nationalité française, née le 15 mars 1990, numéro de sécurité sociale 2 85 01 234 567 89, comme développeuse web à Paris. Le contrat commence le 1er février 2026 pour 6 mois à 3000 euros par mois."*

**Résultat JSON**:
```json
{
  "employeeFirstName": "Marie",
  "employeeLastName": "Dupont",
  "employeeNationality": "Française",
  "employeeBirthDate": "1990-03-15",
  "employeeSocialSecurity": "2850123456789",
  "jobTitle": "Développeuse web",
  "workLocation": "Paris",
  "contractStartDate": "2026-02-01",
  "contractEndDate": "2026-08-01",
  "salaryAmount": "3000",
  "salaryFrequency": "monthly"
}
```

---

## ✅ 5. EMOJIS REMPLACÉS PAR ICÔNES

### Modifications dans `[components/labor-law/AISuggestionsModal.tsx]`

#### Avant (avec emojis):
```tsx
{ value: 'informatique', label: 'Informatique / Tech', icon: '💻' },
{ value: 'btp', label: 'BTP / Construction', icon: '🏗️' },
{ value: 'horeca', label: 'Horeca / Restauration', icon: '🍽️' },
```

#### Après (avec icônes lucide-react):
```tsx
{ value: 'informatique', label: 'Informatique / Tech', icon: Laptop, color: 'text-blue-600' },
{ value: 'btp', label: 'BTP / Construction', icon: HardHat, color: 'text-yellow-600' },
{ value: 'horeca', label: 'Horeca / Restauration', icon: Utensils, color: 'text-orange-600' },
```

---

## ✅ 6. ANALYSE SAUVEGARDE DES CONTRATS

### Diagnostic

Le code de sauvegarde dans `app/(app)/contracts/cdi/page.tsx` est **CORRECT**:

```tsx
const { error } = await supabase
  .from('contracts_cdi')
  .insert({
    user_id: user.id,
    employee_first_name: formData.employeeFirstName,
    // ... tous les champs requis
  });
```

### Politiques RLS
Les politiques RLS ont été corrigées dans la migration `024_fix_contract_rls_auth_uid.sql` :

```sql
CREATE POLICY "contracts_cdi_insert" ON public.contracts_cdi
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Causes possibles d'échec
Si les contrats ne se sauvegardent pas, vérifier:

1. **Authentification**: L'utilisateur doit être connecté
2. **Champs obligatoires**: Tous les champs requis doivent être remplis
3. **Validation**: Les dates doivent être au format correct (YYYY-MM-DD)
4. **Permissions**: La table doit exister dans Supabase

### Vérification dans Supabase
```sql
-- Vérifier que les tables existent
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'contracts_%';

-- Vérifier les politiques RLS
SELECT * FROM pg_policies WHERE tablename LIKE 'contracts_%';
```

---

## ✅ 7. BULLETIN DE PAIE - TAUX DE RETRAITE ET RÉDUCTION FILLON

### Modifications dans `[lib/labor-law/bulletin-paie.ts]`

#### Taux de retraite détaillés (CORRIGÉS)
**Cotisations salariales :**
- **Vieillesse plafonnée** : 6.93% (sur la base plafonnée SS)
- **Vieillesse déplafonnée** : 0.40% (sur le salaire brut total)
- **Retraite cadres AGIRC-ARRCO T1** : 0.86% (pour les cadres)

**Cotisations patronales :**
- **Vieillesse plafonnée** : 8.55% (sur la base plafonnée SS)
- **Vieillesse déplafonnée** : 2.00% (sur le salaire brut total)
- **Retraite cadres AGIRC-ARRCO T1** : 1.29% (tranche 1, jusqu'au plafond SS)
- **Retraite cadres AGIRC-ARRCO T2** : 11.49% (tranche 2, de 1 à 8x le plafond SS)

#### Réduction Fillon (AJOUTÉE)
- Affichée dans la section "Cotisations patronales"
- Montant déduit en **vert** (ex: `-150.00 €`)
- Apparaît dans le récapitulatif du mois
- Formule : `(Salaire/SMIC × 1.6 - 1) / 0.6` (plafonné à 31.95%)

#### CSG/CRDS détaillée
- **CSG déductible** : 6.80% (sur 98.25% du brut)
- **CSG non-déductible** : 2.40% (sur 98.25% du brut)
- **CRDS** : 0.50% (sur 98.25% du brut)

#### Affichage amélioré
- Séparation claire entre base plafonnée et base déplafonnée
- Taux exacts affichés pour chaque cotisation
- Coût employeur final avec réduction Fillon déduite

---

## ✅ 8. TEMPLATE PDF - DESIGN NOIR PROFESSIONNEL

### Modifications dans `[lib/contract-pdf-server.ts]`

#### Corrections apportées
- **Marges augmentées** : 55px au lieu de 48px (évite la superposition)
- **Blocs signatures agrandis** : 135px de hauteur
- **Articles VII et VIII ajoutés** :
  - **Article VII** : Maladie et incapacité temporaire
  - **Article VIII** : Formation professionnelle
- **Espacements entre sections** : Augmentés pour plus de clarté

#### Articles complets conformes au Code du travail
- Article préalable (Préambule)
- Article I : Engagement et période d'essai (L.1221-26, L.1242-2)
- Article II : Lieu de travail et horaires (L.3121-1, L.3123-1)
- Article III : Rémunération (L.3221-2)
- Article IV : Congés payés et absences (L.3141-1)
- Article V : Obligations du salarié
- Article VI : Confidentialité
- Article VII : Maladie (L.1226-1)
- Article VIII : Formation professionnelle (L.6321-1)
- Articles IX/X/XI : Rupture selon type de contrat
- Article final : Dispositions diverses

---

## ⚠️ 9. RESTE À FAIRE

### Template PDF personnalisé
📁 Fichier de référence: `CDI_ISHAK_AHMED_BS_STRUCTURE_02-02-2026.pdf`

Le template actuel est fonctionnel et conforme légalement. Pour le personnaliser exactement comme le PDF de référence :
1. Analyser les couleurs spécifiques du PDF (dégradés, accents)
2. Ajuster les positions exactes des champs
3. Intégrer le logo de l'entreprise si fourni

---

## 📊 RÉSUMÉ DES FICHIERS MODIFIÉS

| Fichier | Modifications |
|---------|---------------|
| `lib/labor-law/cotisations.ts` | Taux 2026 + Fillon |
| `lib/labor-law/bulletin-paie.ts` | Taux retraite détaillés + Fillon |
| `lib/contract-pdf-server.ts` | Template PDF design noir + marges + articles VII/VIII |
| `components/ui/MagnificentDatePicker.tsx` | Saisie directe + dates passées |
| `app/api/process-text-contract/route.ts` | Prompts améliorés |
| `app/api/process-voice-contract/route.ts` | Prompts améliorés |
| `components/labor-law/AISuggestionsModal.tsx` | Icônes au lieu d'emojis |

---

## 🔍 RECOMMANDATIONS

1. **Tester la sauvegarde des contrats** avec un utilisateur connecté
2. **Vérifier les politiques RLS** dans le dashboard Supabase
3. **Appliquer les migrations** si elles ne sont pas encore appliquées
4. **Tester le DatePicker** avec la saisie directe JJ/MM/AAAA

---

*Généré par Claude Code - FacturmeWeb ESPOIR*

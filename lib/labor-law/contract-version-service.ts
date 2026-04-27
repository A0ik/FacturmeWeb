/**
 * Service de gestion des versions de contrats
 * Permet de tracer l'historique des modifications de contrats
 */

import { getSupabaseClient } from '@/lib/supabase';

export interface ContractVersion {
  id: string;
  contract_id: string;
  contract_type: 'cdi' | 'cdd' | 'other';
  version_number: number;
  contract_data: any; // Données complètes du contrat
  changes: ContractChange[]; // Liste des modifications
  created_at: string;
  created_by: string; // user_id
  created_by_name?: string; // Nom du créateur
  comment?: string; // Commentaire de la version
  is_current: boolean;
}

export interface ContractChange {
  field: string;
  fieldName: string; // Nom lisible du champ
  oldValue: any;
  newValue: any;
  changeType: 'created' | 'modified' | 'deleted';
}

export interface ContractComparison {
  versionA: ContractVersion;
  versionB: ContractVersion;
  changes: ContractChange[];
  summary: {
    totalChanges: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

/**
 * Crée une nouvelle version d'un contrat
 */
export async function createContractVersion(
  contractId: string,
  contractType: 'cdi' | 'cdd' | 'other',
  contractData: any,
  userId: string,
  comment?: string
): Promise<ContractVersion> {
  const supabase = getSupabaseClient();

  // Récupérer la version actuelle
  const { data: currentVersion } = await supabase
    .from('contract_versions')
    .select('version_number')
    .eq('contract_id', contractId)
    .eq('is_current', true)
    .single();

  // Marquer l'ancienne version comme non courante
  if (currentVersion) {
    await supabase
      .from('contract_versions')
      .update({ is_current: false })
      .eq('contract_id', contractId)
      .eq('is_current', true);
  }

  // Calculer les changements
  const changes = currentVersion
    ? detectChanges(currentVersion.contract_data, contractData)
    : getInitialChanges(contractData);

  // Créer la nouvelle version
  const newVersionNumber = (currentVersion?.version_number || 0) + 1;

  const { data, error } = await supabase
    .from('contract_versions')
    .insert({
      contract_id: contractId,
      contract_type: contractType,
      version_number: newVersionNumber,
      contract_data: contractData,
      changes,
      created_by: userId,
      comment,
      is_current: true
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Récupère l'historique des versions d'un contrat
 */
export async function getContractVersions(
  contractId: string
): Promise<ContractVersion[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('contract_versions')
    .select('*')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Compare deux versions d'un contrat
 */
export function compareContractVersions(
  versionA: ContractVersion,
  versionB: ContractVersion
): ContractComparison {
  const changes = detectChanges(versionA.contract_data, versionB.contract_data);

  // Calculer les statistiques
  const summary = {
    totalChanges: changes.length,
    byType: {} as Record<string, number>,
    byCategory: {} as Record<string, number>
  };

  for (const change of changes) {
    summary.byType[change.changeType] = (summary.byType[change.changeType] || 0) + 1;
    const category = getFieldCategory(change.field);
    summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
  }

  return {
    versionA,
    versionB,
    changes,
    summary
  };
}

/**
 * Détecte les différences entre deux versions de données
 */
function detectChanges(oldData: any, newData: any): ContractChange[] {
  const changes: ContractChange[] = [];
  const allKeys = new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {})
  ]);

  for (const key of allKeys) {
    const oldValue = oldData?.[key];
    const newValue = newData?.[key];

    if (oldValue === undefined && newValue !== undefined) {
      changes.push({
        field: key,
        fieldName: getFieldName(key),
        oldValue,
        newValue,
        changeType: 'created'
      });
    } else if (oldValue !== undefined && newValue === undefined) {
      changes.push({
        field: key,
        fieldName: getFieldName(key),
        oldValue,
        newValue,
        changeType: 'deleted'
      });
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field: key,
        fieldName: getFieldName(key),
        oldValue,
        newValue,
        changeType: 'modified'
      });
    }
  }

  return changes;
}

/**
 * Génère les changements initiaux pour la première version
 */
function getInitialChanges(contractData: any): ContractChange[] {
  const changes: ContractChange[] = [];

  for (const [key, value] of Object.entries(contractData || {})) {
    if (value !== undefined && value !== null && value !== '') {
      changes.push({
        field: key,
        fieldName: getFieldName(key),
        oldValue: null,
        newValue: value,
        changeType: 'created'
      });
    }
  }

  return changes;
}

/**
 * Retourne le nom lisible d'un champ
 */
function getFieldName(field: string): string {
  const fieldNames: Record<string, string> = {
    // Salarié
    employeeFirstName: 'Prénom du salarié',
    employeeLastName: 'Nom du salarié',
    employeeEmail: 'Email',
    employeePhone: 'Téléphone',
    employeeAddress: 'Adresse',
    employeePostalCode: 'Code postal',
    employeeCity: 'Ville',
    employeeBirthDate: 'Date de naissance',
    employeeNationality: 'Nationalité',
    employeeQualification: 'Qualification',

    // Contrat
    contractStartDate: 'Date de début',
    contractEndDate: 'Date de fin',
    trialPeriodDays: 'Durée période d\'essai',
    jobTitle: 'Intitulé du poste',
    workLocation: 'Lieu de travail',
    workSchedule: 'Horaires de travail',
    workingHours: 'Heures hebdomadaires',
    salaryAmount: 'Salaire',
    salaryFrequency: 'Fréquence de salaire',
    contractClassification: 'Classification',
    contractReason: 'Motif du CDD',
    replacedEmployeeName: 'Salarié remplacé',

    // Entreprise
    companyName: 'Nom de l\'entreprise',
    companyAddress: 'Adresse entreprise',
    companyPostalCode: 'Code postal entreprise',
    companyCity: 'Ville entreprise',
    companySiret: 'SIRET',
    employerName: 'Nom de l\'employeur',
    employerTitle: 'Titre de l\'employeur',

    // Avantages
    hasTransport: 'Titre de transport',
    hasMeal: 'Tickets restaurant',
    hasHealth: 'Mutuelle',
    hasOther: 'Autres avantages',
    otherBenefits: 'Détails autres avantages',

    // Clauses
    collectiveAgreement: 'Convention collective',
    probationClause: 'Clause de période d\'essai renouvelable',
    nonCompeteClause: 'Clause de non-concurrence',
    mobilityClause: 'Clause de mobilité',

    // Signatures
    employerSignature: 'Signature employeur',
    employeeSignature: 'Signature salarié'
  };

  return fieldNames[field] || field;
}

/**
 * Retourne la catégorie d'un champ
 */
function getFieldCategory(field: string): string {
  if (field.startsWith('employee')) return 'Salarié';
  if (field.startsWith('company') || field.startsWith('employer')) return 'Entreprise';
  if (field.startsWith('contract') || field.includes('Date') || field.includes('Period')) return 'Contrat';
  if (field.startsWith('salary') || field.startsWith('has') || field === 'otherBenefits') return 'Rémunération & Avantages';
  if (field.includes('Clause') || field === 'collectiveAgreement') return 'Clauses';
  if (field.includes('Signature')) return 'Signatures';
  return 'Autre';
}

/**
 * Restaure une version précédente d'un contrat
 */
export async function restoreContractVersion(
  versionId: string
): Promise<any> {
  const supabase = getSupabaseClient();

  // Récupérer la version à restaurer
  const { data: version } = await supabase
    .from('contract_versions')
    .select('*')
    .eq('id', versionId)
    .single();

  if (!version) throw new Error('Version non trouvée');

  // Créer une nouvelle version avec les données de l'ancienne
  return await createContractVersion(
    version.contract_id,
    version.contract_type,
    version.contract_data,
    version.created_by,
    `Restauration de la version ${version.version_number}`
  );
}

/**
 * Supprime les versions anciennes (garde conservation)
 */
export async function cleanupOldVersions(
  contractId: string,
  keepCount: number = 10
): Promise<void> {
  const supabase = getSupabaseClient();

  // Récupérer toutes les versions
  const { data: versions } = await supabase
    .from('contract_versions')
    .select('id, created_at')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false });

  if (!versions || versions.length <= keepCount) return;

  // Supprimer les versions au-delà de keepCount
  const toDelete = versions.slice(keepCount);
  const idsToDelete = toDelete.map(v => v.id);

  await supabase
    .from('contract_versions')
    .delete()
    .in('id', idsToDelete);
}

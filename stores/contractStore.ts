'use client';
import { create } from 'zustand';
import { getSupabaseClient } from '@/lib/supabase';
import { ContractType, ContractStatus, ContractSummary, ContractDashboardStats, ContractFormData, Contract } from '@/types';

interface ContractState {
  contracts: ContractSummary[];
  loading: boolean;
  stats: ContractDashboardStats | null;
  fetchContracts: () => Promise<void>;
  createContract: (data: ContractFormData, profile: any) => Promise<{ id: string; contract_number: string }>;
  updateContract: (id: string, contractType: ContractType, data: Partial<ContractFormData>) => Promise<void>;
  updateContractStatus: (id: string, contractType: ContractType, status: ContractStatus) => Promise<void>;
  deleteContract: (id: string, contractType: ContractType) => Promise<void>;
  duplicateContract: (id: string, contractType: ContractType, profile: any) => Promise<{ id: string; contract_number: string } | null>;
  getContractDetail: (id: string, contractType: ContractType) => Promise<Contract>;
  getNextContractNumber: (type: ContractType, count: number) => string;
  computeStats: () => void;
  clearData: () => void;
}

const TABLE_MAP: Record<ContractType, string> = {
  cdi: 'contracts_cdi',
  cdd: 'contracts_cdd',
  other: 'contracts_other',
};

const PREFIX_MAP: Record<ContractType, string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  other: 'CTR',
};

export const useContractStore = create<ContractState>((set, get) => ({
  contracts: [],
  loading: false,
  stats: null,

  clearData: () => set({ contracts: [], stats: null }),

  getNextContractNumber: (type, count) =>
    `${PREFIX_MAP[type]}-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`,

  fetchContracts: async () => {
    set({ loading: true });
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const [cdiRes, cddRes, otherRes] = await Promise.all([
        supabase.from('contracts_cdi').select('id, contract_number, employee_first_name, employee_last_name, company_name, job_title, contract_start_date, salary_amount, salary_frequency, document_status, created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }),
        supabase.from('contracts_cdd').select('id, contract_number, employee_first_name, employee_last_name, company_name, job_title, contract_start_date, contract_end_date, salary_amount, salary_frequency, document_status, created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }),
        supabase.from('contracts_other').select('id, contract_number, contract_category, employee_first_name, employee_last_name, company_name, job_title, start_date, end_date, salary_amount, salary_frequency, document_status, created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      ]);

      const all: ContractSummary[] = [];

      (cdiRes.data || []).forEach((c: any) => {
        all.push({
          id: c.id,
          contract_number: c.contract_number || '',
          contract_type: 'cdi',
          employee_name: `${c.employee_first_name} ${c.employee_last_name}`,
          company_name: c.company_name,
          job_title: c.job_title,
          start_date: c.contract_start_date,
          status: c.document_status,
          salary_amount: c.salary_amount,
          salary_frequency: c.salary_frequency,
          created_at: c.created_at,
        });
      });

      (cddRes.data || []).forEach((c: any) => {
        all.push({
          id: c.id,
          contract_number: c.contract_number || '',
          contract_type: 'cdd',
          employee_name: `${c.employee_first_name} ${c.employee_last_name}`,
          company_name: c.company_name,
          job_title: c.job_title,
          start_date: c.contract_start_date,
          end_date: c.contract_end_date,
          status: c.document_status,
          salary_amount: c.salary_amount,
          salary_frequency: c.salary_frequency,
          created_at: c.created_at,
        });
      });

      (otherRes.data || []).forEach((c: any) => {
        all.push({
          id: c.id,
          contract_number: c.contract_number || '',
          contract_type: 'other',
          contract_category: c.contract_category,
          employee_name: `${c.employee_first_name} ${c.employee_last_name}`,
          company_name: c.company_name,
          job_title: c.job_title,
          start_date: c.start_date,
          end_date: c.end_date,
          status: c.document_status,
          salary_amount: c.salary_amount,
          salary_frequency: c.salary_frequency,
          created_at: c.created_at,
        });
      });

      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      set({ contracts: all });
      get().computeStats();
    } finally {
      set({ loading: false });
    }
  },

  createContract: async (formData, profile) => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Non authentifié');
    if (!profile) throw new Error('Profil introuvable');

    const contractCount = (profile.contract_count || 0) + 1;
    const number = get().getNextContractNumber(formData.contract_type, contractCount);
    const now = new Date().toISOString();

    const row: Record<string, any> = {
      user_id: session.user.id,
      contract_number: number,
      document_status: 'draft',
      updated_at: now,
      employee_first_name: formData.employee_first_name,
      employee_last_name: formData.employee_last_name,
      employee_address: formData.employee_address,
      employee_postal_code: formData.employee_postal_code,
      employee_city: formData.employee_city,
      employee_email: formData.employee_email || null,
      employee_phone: formData.employee_phone || null,
      employee_birth_date: formData.employee_birth_date || null,
      employee_social_security: formData.employee_social_security || null,
      employee_nationality: formData.employee_nationality || 'Française',
      employee_qualification: formData.employee_qualification || null,
      company_name: formData.company_name,
      company_address: formData.company_address || '',
      company_postal_code: formData.company_postal_code || '',
      company_city: formData.company_city || '',
      company_siret: formData.company_siret,
      employer_name: formData.employer_name,
      employer_title: formData.employer_title || 'Gérant',
      job_title: formData.job_title,
      work_location: formData.work_location,
      work_schedule: formData.work_schedule || '35h hebdomadaires',
      salary_amount: parseFloat(formData.salary_amount) || 0,
      salary_frequency: formData.salary_frequency || 'monthly',
      has_transport: formData.has_transport || false,
      has_meal: formData.has_meal || false,
      has_health: formData.has_health || false,
      has_other: formData.has_other || false,
      other_benefits: formData.other_benefits || null,
      contract_start_date: formData.contract_start_date || null,
      trial_period_days: formData.trial_period_days ? parseInt(formData.trial_period_days) : null,
      employer_signature: formData.employer_signature || null,
      employee_signature: formData.employee_signature || null,
      employer_signature_date: formData.employer_signature_date || null,
      employee_signature_date: formData.employee_signature_date || null,
    };

    // Type-specific fields
    if (formData.contract_type === 'cdi') {
      row.contract_classification = formData.contract_classification || null;
      row.working_hours = formData.working_hours || null;
      row.collective_agreement = formData.collective_agreement || null;
      row.probation_clause = formData.probation_clause || false;
      row.non_compete_clause = formData.non_compete_clause || false;
      row.non_compete_duration = formData.non_compete_duration || null;
      row.non_compete_compensation = formData.non_compete_compensation || null;
      row.non_compete_area = formData.non_compete_area || null;
      row.mobility_clause = formData.mobility_clause || false;
      row.mobility_area = formData.mobility_area || null;
    } else if (formData.contract_type === 'cdd') {
      row.contract_end_date = formData.contract_end_date || null;
      row.contract_reason = formData.contract_reason || '';
      row.replaced_employee_name = formData.replaced_employee_name || null;
      row.collective_agreement = formData.collective_agreement || null;
      row.probation_clause = formData.probation_clause || false;
      row.non_compete_clause = formData.non_compete_clause || false;
      row.mobility_clause = formData.mobility_clause || false;
    } else {
      row.contract_category = formData.contract_category || 'stage';
      row.contract_title = formData.contract_title || null;
      row.duration_weeks = formData.duration_weeks || null;
      row.end_date = formData.contract_end_date || null;
      row.tutor_name = formData.tutor_name || null;
      row.school_name = formData.school_name || null;
      row.speciality = formData.speciality || null;
      row.objectives = formData.objectives || null;
      row.tasks = formData.tasks || null;
      row.working_hours = formData.working_hours || null;
      row.collective_agreement = formData.collective_agreement || null;
      row.statut = formData.statut || 'non_cadre';
    }

    const { data, error } = await supabase
      .from(TABLE_MAP[formData.contract_type])
      .insert(row)
      .select('id, contract_number')
      .single();

    if (error) throw error;

    // Update profile count in background
    (async () => {
      try {
        await supabase.from('profiles').update({
          contract_count: contractCount,
          monthly_contract_count: (profile.monthly_contract_count || 0) + 1,
          contract_month: new Date().toISOString().slice(0, 7),
        }).eq('id', session.user.id);
        const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (updatedProfile) {
          try {
            const { useAuthStore } = require('@/stores/authStore');
            useAuthStore.getState().setProfile(updatedProfile);
          } catch {}
        }
      } catch {}
    })();

    // Refresh list
    await get().fetchContracts();
    return { id: data.id, contract_number: data.contract_number };
  },

  updateContract: async (id, contractType, data) => {
    const supabase = getSupabaseClient();
    const row: Record<string, any> = { ...data, updated_at: new Date().toISOString() };
    if (row.salary_amount && typeof row.salary_amount === 'string') row.salary_amount = parseFloat(row.salary_amount);
    if (row.trial_period_days && typeof row.trial_period_days === 'string') row.trial_period_days = parseInt(row.trial_period_days);

    const { error } = await supabase.from(TABLE_MAP[contractType]).update(row).eq('id', id);
    if (error) throw error;
    await get().fetchContracts();
  },

  updateContractStatus: async (id, contractType, status) => {
    const supabase = getSupabaseClient();
    const row: any = { document_status: status, updated_at: new Date().toISOString() };
    if (status === 'signed') row.employer_signature_date = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from(TABLE_MAP[contractType]).update(row).eq('id', id);
    if (error) throw error;
    set((s) => ({
      contracts: s.contracts.map((c) => c.id === id ? { ...c, status } : c),
    }));
  },

  deleteContract: async (id, contractType) => {
    const { error } = await getSupabaseClient().from(TABLE_MAP[contractType]).delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ contracts: s.contracts.filter((c) => c.id !== id) }));
    get().computeStats();
  },

  duplicateContract: async (id, contractType, profile) => {
    const detail = await get().getContractDetail(id, contractType);
    const formData: ContractFormData = {
      contract_type: contractType,
      contract_category: 'contract_category' in detail ? (detail as any).contract_category : undefined,
      employee_first_name: detail.employee_first_name,
      employee_last_name: detail.employee_last_name,
      employee_address: detail.employee_address,
      employee_postal_code: detail.employee_postal_code,
      employee_city: detail.employee_city,
      employee_email: detail.employee_email,
      employee_phone: detail.employee_phone,
      employee_birth_date: detail.employee_birth_date,
      employee_social_security: detail.employee_social_security,
      employee_nationality: detail.employee_nationality,
      employee_qualification: detail.employee_qualification,
      company_name: detail.company_name,
      company_address: detail.company_address,
      company_postal_code: detail.company_postal_code,
      company_city: detail.company_city,
      company_siret: detail.company_siret,
      employer_name: detail.employer_name,
      employer_title: detail.employer_title,
      job_title: detail.job_title,
      work_location: detail.work_location,
      work_schedule: detail.work_schedule,
      salary_amount: String(detail.salary_amount),
      salary_frequency: detail.salary_frequency,
      has_transport: detail.has_transport,
      has_meal: detail.has_meal,
      has_health: detail.has_health,
      has_other: detail.has_other,
      other_benefits: detail.other_benefits,
      contract_start_date: detail.contract_start_date,
      trial_period_days: detail.trial_period_days ? String(detail.trial_period_days) : undefined,
    };
    return get().createContract(formData, profile);
  },

  getContractDetail: async (id, contractType) => {
    const { data, error } = await getSupabaseClient()
      .from(TABLE_MAP[contractType])
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { ...data, contract_type: contractType } as Contract;
  },

  computeStats: () => {
    const contracts = get().contracts;
    const stats: ContractDashboardStats = {
      total: contracts.length,
      drafts: contracts.filter((c) => c.status === 'draft').length,
      pendingSignature: contracts.filter((c) => c.status === 'pending_signature').length,
      signed: contracts.filter((c) => c.status === 'signed').length,
      active: contracts.filter((c) => c.status === 'active').length,
      ended: contracts.filter((c) => c.status === 'ended').length,
      byType: {
        cdi: contracts.filter((c) => c.contract_type === 'cdi').length,
        cdd: contracts.filter((c) => c.contract_type === 'cdd').length,
        other: contracts.filter((c) => c.contract_type === 'other').length,
      },
    };
    set({ stats });
  },
}));

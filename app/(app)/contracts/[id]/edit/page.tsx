'use client';

import React, { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { ContractForm } from '@/components/contracts/ContractForm';
import { useContractStore } from '@/stores/contractStore';
import { ContractType, ContractFormData } from '@/types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ContractEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const contractType = (searchParams.get('type') || 'cdi') as ContractType;
  const { getContractDetail } = useContractStore();

  const [initialData, setInitialData] = useState<Partial<ContractFormData> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContract();
  }, [id, contractType]);

  const loadContract = async () => {
    try {
      const contract = await getContractDetail(id, contractType);
      const data: Partial<ContractFormData> = {
        contract_type: contractType,
        contract_category: 'contract_category' in contract ? (contract as any).contract_category : undefined,
        employee_first_name: contract.employee_first_name,
        employee_last_name: contract.employee_last_name,
        employee_address: contract.employee_address,
        employee_postal_code: contract.employee_postal_code,
        employee_city: contract.employee_city,
        employee_email: contract.employee_email || '',
        employee_phone: contract.employee_phone || '',
        employee_birth_date: contract.employee_birth_date || '',
        employee_social_security: contract.employee_social_security || '',
        employee_nationality: contract.employee_nationality || 'Française',
        employee_qualification: contract.employee_qualification || '',
        company_name: contract.company_name,
        company_address: contract.company_address || '',
        company_postal_code: contract.company_postal_code || '',
        company_city: contract.company_city || '',
        company_siret: contract.company_siret || '',
        employer_name: contract.employer_name || '',
        employer_title: contract.employer_title || '',
        job_title: contract.job_title,
        work_location: contract.work_location,
        work_schedule: contract.work_schedule,
        salary_amount: String(contract.salary_amount),
        salary_frequency: contract.salary_frequency,
        has_transport: contract.has_transport,
        has_meal: contract.has_meal,
        has_health: contract.has_health,
        has_other: contract.has_other,
        other_benefits: contract.other_benefits || '',
        contract_start_date: contract.contract_start_date || '',
        trial_period_days: contract.trial_period_days ? String(contract.trial_period_days) : '',
        contract_number: contract.contract_number || '',
      };

      // Type-specific fields
      if (contractType === 'cdi') {
        const c = contract as any;
        data.contract_classification = c.contract_classification || '';
        data.working_hours = c.working_hours || '';
        data.collective_agreement = c.collective_agreement || '';
        data.probation_clause = c.probation_clause || false;
        data.non_compete_clause = c.non_compete_clause || false;
        data.non_compete_duration = c.non_compete_duration || '';
        data.non_compete_compensation = c.non_compete_compensation || '';
        data.non_compete_area = c.non_compete_area || '';
        data.mobility_clause = c.mobility_clause || false;
        data.mobility_area = c.mobility_area || '';
      } else if (contractType === 'cdd') {
        const c = contract as any;
        data.contract_end_date = c.contract_end_date || '';
        data.contract_reason = c.contract_reason || '';
        data.replaced_employee_name = c.replaced_employee_name || '';
        data.collective_agreement = c.collective_agreement || '';
        data.probation_clause = c.probation_clause || false;
        data.non_compete_clause = c.non_compete_clause || false;
        data.mobility_clause = c.mobility_clause || false;
      } else {
        const c = contract as any;
        data.contract_category = c.contract_category || 'stage';
        data.contract_title = c.contract_title || '';
        data.duration_weeks = c.duration_weeks || '';
        data.contract_end_date = c.end_date || '';
        data.tutor_name = c.tutor_name || '';
        data.school_name = c.school_name || '';
        data.speciality = c.speciality || '';
        data.objectives = c.objectives || '';
        data.tasks = c.tasks || '';
        data.working_hours = c.working_hours || '';
        data.collective_agreement = c.collective_agreement || '';
        data.statut = c.statut || '';
      }

      setInitialData(data);
    } catch {
      toast.error('Contrat introuvable');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!initialData) return null;

  return (
    <ContractForm
      contractType={contractType}
      mode="edit"
      initialData={initialData}
      contractId={id}
      onSaved={(savedId) => {
        toast.success('Contrat mis à jour !');
      }}
    />
  );
}

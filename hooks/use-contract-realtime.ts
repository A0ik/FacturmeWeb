'use client';
import { useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useContractStore } from '@/stores/contractStore';
import { ContractType } from '@/types';
import { toast } from 'sonner';

const TABLE_MAP: Record<ContractType, string> = {
  cdi: 'contracts_cdi',
  cdd: 'contracts_cdd',
  other: 'contracts_other',
};

export function useContractRealtime(contractId: string, contractType: ContractType) {
  const { fetchContracts } = useContractStore();

  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`contract-${contractId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: TABLE_MAP[contractType],
        filter: `id=eq.${contractId}`,
      }, (payload) => {
        const newStatus = payload.new?.document_status;
        const oldStatus = payload.old?.document_status;
        if (newStatus && newStatus !== oldStatus) {
          const labels: Record<string, string> = {
            draft: 'Brouillon',
            pending_signature: 'En attente de signature',
            signed: 'Signé',
            active: 'Actif',
            ended: 'Terminé',
            terminated: 'Rompus',
            cancelled: 'Annulé',
          };
          toast.info(`Contrat mis à jour : ${labels[newStatus] || newStatus}`);
          fetchContracts();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contractId, contractType]);
}

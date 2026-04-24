/**
 * React Hook pour Lia Service
 * Facilite l'intégration des fonctionnalités IA dans les composants
 */
import { useState, useCallback } from 'react';

interface ContractConformityResult {
  isConform: boolean;
  missingMentions: string[];
  recommendations: string[];
  legalReferences: string[];
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
}

interface PayslipModificationResult {
  modifiedPayslip: any;
  explanation: string;
  warnings: string[];
  legalCompliance: string[];
}

interface UseLiaReturn {
  // Conformity
  checkConformity: (contractType: string, contractData: any, contractContent?: string) => Promise<ContractConformityResult | null>;
  conformityLoading: boolean;
  conformityError: string | null;

  // Payslip modification
  modifyPayslip: (currentPayslip: any, requestedChanges: string, employeeData?: any) => Promise<PayslipModificationResult | null>;
  modificationLoading: boolean;
  modificationError: string | null;

  // Suggestions
  getSuggestions: (contractType: string, contractData: any) => Promise<string[]>;
  suggestionsLoading: boolean;
}

export function useLia(): UseLiaReturn {
  const [conformityLoading, setConformityLoading] = useState(false);
  const [conformityError, setConformityError] = useState<string | null>(null);
  const [modificationLoading, setModificationLoading] = useState(false);
  const [modificationError, setModificationError] = useState<string | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const checkConformity = useCallback(async (
    contractType: string,
    contractData: any,
    contractContent?: string
  ): Promise<ContractConformityResult | null> => {
    setConformityLoading(true);
    setConformityError(null);

    try {
      const response = await fetch('/api/lia/contract-conformity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractType,
          contractData,
          contractContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la vérification');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setConformityError(errorMessage);
      return null;
    } finally {
      setConformityLoading(false);
    }
  }, []);

  const modifyPayslip = useCallback(async (
    currentPayslip: any,
    requestedChanges: string,
    employeeData?: any
  ): Promise<PayslipModificationResult | null> => {
    setModificationLoading(true);
    setModificationError(null);

    try {
      const response = await fetch('/api/lia/payslip-modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPayslip,
          requestedChanges,
          employeeData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la modification');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setModificationError(errorMessage);
      return null;
    } finally {
      setModificationLoading(false);
    }
  }, []);

  const getSuggestions = useCallback(async (
    contractType: string,
    contractData: any
  ): Promise<string[]> => {
    setSuggestionsLoading(true);

    try {
      const response = await fetch('/api/lia/contract-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractType,
          contractData,
        }),
      });

      if (!response.ok) {
        return [];
      }

      const result = await response.json();
      return result.suggestions || [];
    } catch (error) {
      console.error('Erreur récupération suggestions:', error);
      return [];
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  return {
    checkConformity,
    conformityLoading,
    conformityError,
    modifyPayslip,
    modificationLoading,
    modificationError,
    getSuggestions,
    suggestionsLoading,
  };
}

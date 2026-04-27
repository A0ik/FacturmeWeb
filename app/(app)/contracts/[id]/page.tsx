'use client';

import React, { useEffect, useState, use } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, FileText, Building2, User, Calendar, Euro, Download, Send,
  Trash2, Copy, FileEdit, Loader2, CheckCircle, Clock, Shield,
  FileCheck, History, Sparkles, Calculator
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useContractStore } from '@/stores/contractStore';
import { useAuthStore } from '@/stores/authStore';
import { Contract, ContractType, ContractStatus } from '@/types';
import { ContractStatusBadge, ContractTypeBadge } from '@/components/contracts/ContractStatusBadge';
import { ExportFormatModal } from '@/components/labor-law/ExportFormatModal';
import { ContractEmailModal } from '@/components/labor-law/ContractEmailModal';
import { ContractVersionHistory } from '@/components/labor-law/ContractVersionHistory';
import { AISuggestionsModal } from '@/components/labor-law/AISuggestionsModal';
import { PayslipEditor } from '@/components/labor-law/PayslipEditor';
import { creerBulletinDepuisContrat } from '@/lib/labor-law/bulletin-paie';
import { generateContract as generateTemplate } from '@/lib/labor-law/contract-templates';

const TYPE_LABELS: Record<ContractType, string> = { cdi: 'CDI', cdd: 'CDD', other: 'Autre' };

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const contractType = (searchParams.get('type') || 'cdi') as ContractType;
  const router = useRouter();
  const { profile } = useAuthStore();
  const { getContractDetail, deleteContract, duplicateContract, updateContractStatus } = useContractStore();

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [showPayslipEditor, setShowPayslipEditor] = useState(false);
  const [payslipData, setPayslipData] = useState<any>(null);

  useEffect(() => {
    loadContract();
  }, [id, contractType]);

  const loadContract = async () => {
    setLoading(true);
    try {
      const data = await getContractDetail(id, contractType);
      setContract(data);
    } catch {
      toast.error('Contrat introuvable');
      router.push('/contracts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer ce contrat ?')) return;
    try {
      await deleteContract(id, contractType);
      toast.success('Contrat supprimé');
      router.push('/contracts');
    } catch {
      toast.error('Erreur');
    }
  };

  const handleDuplicate = async () => {
    try {
      const result = await duplicateContract(id, contractType, profile);
      if (result) {
        toast.success('Contrat dupliqué');
        router.push(`/contracts/${result.id}?type=${contractType}`);
      }
    } catch {
      toast.error('Erreur');
    }
  };

  const handleStatusChange = async (status: ContractStatus) => {
    try {
      await updateContractStatus(id, contractType, status);
      setContract(prev => prev ? { ...prev, document_status: status } as Contract : prev);
      toast.success('Statut mis à jour');
    } catch {
      toast.error('Erreur');
    }
  };

  const handleDownloadPDF = async () => {
    if (!contract) return;
    setExportLoading(true);
    try {
      const res = await fetch('/api/contracts/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract: { ...contract, contractType } }),
      });
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contrat_${TYPE_LABELS[contractType]}_${contract.employee_last_name}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF téléchargé');
    } catch {
      toast.error('Erreur');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownloadDOCX = async () => {
    if (!contract) return;
    setExportLoading(true);
    try {
      const res = await fetch('/api/contracts/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract: { ...contract, contractType } }),
      });
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Contrat_${TYPE_LABELS[contractType]}_${contract.employee_last_name}_${new Date().toISOString().split('T')[0]}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('DOCX téléchargé');
    } catch {
      toast.error('Erreur');
    } finally {
      setExportLoading(false);
    }
  };

  const handleGeneratePayslip = () => {
    if (!contract) return;
    try {
      const data = creerBulletinDepuisContrat({ ...contract, contractType } as any, '', '');
      setPayslipData(data);
      setShowPayslipEditor(true);
    } catch {
      toast.error('Erreur');
    }
  };

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
  const fmtMoney = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!contract) return null;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/contracts" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />Retour aux contrats
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {contract.contract_number || 'Contrat'}
            </h1>
            <ContractTypeBadge type={contract.contract_type} />
            <ContractStatusBadge status={contract.document_status as ContractStatus} />
          </div>
          <div className="flex gap-2">
            {contract.document_status === 'draft' && (
              <button onClick={() => handleStatusChange('pending_signature')} className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl text-sm font-semibold hover:bg-amber-200 transition-colors">Envoyer pour signature</button>
            )}
            {contract.document_status === 'pending_signature' && (
              <button onClick={() => handleStatusChange('signed')} className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-semibold hover:bg-blue-200 transition-colors">Marquer signé</button>
            )}
            {contract.document_status === 'signed' && (
              <button onClick={() => handleStatusChange('active')} className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl text-sm font-semibold hover:bg-green-200 transition-colors">Activer</button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Info Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Employee */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><User className="w-5 h-5 text-primary" />Salarié</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Nom :</span> <span className="font-medium">{contract.employee_first_name} {contract.employee_last_name}</span></p>
            <p><span className="text-gray-500">Adresse :</span> {contract.employee_address}, {contract.employee_postal_code} {contract.employee_city}</p>
            {contract.employee_email && <p><span className="text-gray-500">Email :</span> {contract.employee_email}</p>}
            {contract.employee_phone && <p><span className="text-gray-500">Tél :</span> {contract.employee_phone}</p>}
            <p><span className="text-gray-500">Né(e) le :</span> {fmtDate(contract.employee_birth_date)}</p>
            <p><span className="text-gray-500">Nationalité :</span> {contract.employee_nationality}</p>
            {contract.employee_social_security && <p><span className="text-gray-500">NIR :</span> {contract.employee_social_security}</p>}
            {'employee_qualification' in contract && contract.employee_qualification && <p><span className="text-gray-500">Qualification :</span> {contract.employee_qualification}</p>}
          </div>
        </motion.div>

        {/* Company */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" />Entreprise</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Raison sociale :</span> <span className="font-medium">{contract.company_name}</span></p>
            <p><span className="text-gray-500">Adresse :</span> {contract.company_address}, {contract.company_postal_code} {contract.company_city}</p>
            <p><span className="text-gray-500">SIRET :</span> <span className="font-mono">{contract.company_siret}</span></p>
            <p><span className="text-gray-500">Employeur :</span> {contract.employer_name} ({contract.employer_title})</p>
          </div>
        </motion.div>

        {/* Contract */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Contrat</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Poste :</span> <span className="font-medium">{contract.job_title}</span></p>
            <p><span className="text-gray-500">Lieu :</span> {contract.work_location}</p>
            <p><span className="text-gray-500">Horaires :</span> {contract.work_schedule}</p>
            <p><span className="text-gray-500">Début :</span> {fmtDate(contract.contract_start_date)}</p>
            {'contract_end_date' in contract && contract.contract_end_date && <p><span className="text-gray-500">Fin :</span> {fmtDate(contract.contract_end_date)}</p>}
            {contract.trial_period_days && <p><span className="text-gray-500">Essai :</span> {contract.trial_period_days} jours</p>}
            {'contract_reason' in contract && contract.contract_reason && <p><span className="text-gray-500">Motif :</span> {contract.contract_reason}</p>}
            {'replaced_employee_name' in contract && (contract as any).replaced_employee_name && <p><span className="text-gray-500">Salarié remplacé :</span> {(contract as any).replaced_employee_name}</p>}
            {'contract_classification' in contract && contract.contract_classification && <p><span className="text-gray-500">Classification :</span> {contract.contract_classification}</p>}
            {'working_hours' in contract && (contract as any).working_hours && <p><span className="text-gray-500">Heures hebdo :</span> {(contract as any).working_hours}</p>}
            {'collective_agreement' in contract && contract.collective_agreement && <p><span className="text-gray-500">Convention :</span> {contract.collective_agreement}</p>}
            {/* Other-specific: Stage/Alternance */}
            {contractType === 'other' && (() => {
              const c = contract as any;
              return <>
                {c.contract_category && <p><span className="text-gray-500">Catégorie :</span> {c.contract_category}</p>}
                {c.contract_title && <p><span className="text-gray-500">Titre :</span> {c.contract_title}</p>}
                {c.duration_weeks && <p><span className="text-gray-500">Durée :</span> {c.duration_weeks} semaines</p>}
                {c.tutor_name && <p><span className="text-gray-500">Tuteur :</span> {c.tutor_name}</p>}
                {c.school_name && <p><span className="text-gray-500">École/CFA :</span> {c.school_name}</p>}
                {c.speciality && <p><span className="text-gray-500">Spécialité :</span> {c.speciality}</p>}
                {c.objectives && <p><span className="text-gray-500">Objectifs :</span> {c.objectives}</p>}
                {c.tasks && <p><span className="text-gray-500">Tâches :</span> {c.tasks}</p>}
                {c.statut && <p><span className="text-gray-500">Statut :</span> {c.statut}</p>}
              </>;
            })()}
          </div>
        </motion.div>

        {/* Remuneration */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Euro className="w-5 h-5 text-primary" />Rémunération & Avantages</h3>
          <div className="space-y-2 text-sm">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmtMoney(contract.salary_amount)} <span className="text-sm font-normal text-gray-500">{contract.salary_frequency === 'hourly' ? '/h' : contract.salary_frequency === 'monthly' ? '/mois' : ''}</span></p>
            <div className="flex flex-wrap gap-2 mt-3">
              {contract.has_transport && <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">Transport</span>}
              {contract.has_meal && <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-xs font-medium">Repas</span>}
              {contract.has_health && <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-medium">Mutuelle</span>}
              {contract.has_other && contract.other_benefits && <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-xs font-medium">{contract.other_benefits}</span>}
            </div>
            {'non_compete_clause' in contract && (contract as any).non_compete_clause && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Non-concurrence</p>
                {(contract as any).non_compete_duration && <p className="text-xs text-amber-700">Durée : {(contract as any).non_compete_duration}</p>}
                {(contract as any).non_compete_compensation && <p className="text-xs text-amber-700">Indemnité : {(contract as any).non_compete_compensation}€/mois</p>}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-3 justify-center">
        <Link href={`/contracts/${id}/edit?type=${contractType}`} className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm">
          <FileEdit className="w-4 h-4" />Éditer
        </Link>
        <button onClick={() => setShowExportModal(true)} className="px-5 py-2.5 bg-primary/10 text-primary rounded-xl font-semibold hover:bg-primary/20 transition-colors flex items-center gap-2 text-sm" disabled={exportLoading}>
          <Download className="w-4 h-4" />Télécharger
        </button>
        <button onClick={() => setShowEmailModal(true)} className="px-5 py-2.5 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors flex items-center gap-2 text-sm">
          <Send className="w-4 h-4" />Email
        </button>
        <button onClick={handleGeneratePayslip} className="px-5 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-2 text-sm">
          <Calculator className="w-4 h-4" />Bulletin de paie
        </button>
        <button onClick={() => setShowAISuggestions(true)} className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4" />IA
        </button>
        <button onClick={() => setShowVersionHistory(true)} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm">
          <History className="w-4 h-4" />Versions
        </button>
        <button onClick={handleDuplicate} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm">
          <Copy className="w-4 h-4" />Dupliquer
        </button>
        <button onClick={handleDelete} className="px-5 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2 text-sm">
          <Trash2 className="w-4 h-4" />Supprimer
        </button>
      </motion.div>

      {/* Modals */}
      <ExportFormatModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} onExportPDF={handleDownloadPDF} onExportDOCX={handleDownloadDOCX} loading={exportLoading} />
      {showEmailModal && contract && (
        <ContractEmailModal
          contractType={contractType}
          employeeName={`${contract.employee_first_name} ${contract.employee_last_name}`}
          defaultEmail={contract.employee_email || ''}
          contractHtml={contract.contract_html || ''}
          contractData={contract as any}
          onClose={() => setShowEmailModal(false)}
        />
      )}
      <ContractVersionHistory isOpen={showVersionHistory} onClose={() => setShowVersionHistory(false)} contractId={id} contractType={contractType} />
      <AISuggestionsModal isOpen={showAISuggestions} onClose={() => setShowAISuggestions(false)} onApplyClause={(clause) => toast.success(`Clause "${clause.title}" suggérée`)} contractType={contractType} />
      {showPayslipEditor && payslipData && <PayslipEditor initialData={payslipData} onClose={() => setShowPayslipEditor(false)} />}
    </div>
  );
}

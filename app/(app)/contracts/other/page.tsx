'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  Mic,
  Send,
  Download,
  Eye,
  Loader2,
  Check,
  AlertCircle,
  User,
  Building2,
  FileCheck,
  X,
  Euro,
  Calendar,
  Shield,
  Calculator,
  Info,
  Sparkles
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { MagicSelect, CONTRACT_OTHER_TYPES, BENEFIT_OPTIONS } from '@/components/ui/MagicSelect';
import { SireneAutocomplete } from '@/components/ui/SireneAutocomplete';
import { MagnificentDatePicker } from '@/components/ui/MagnificentDatePicker';
import { ContractValidator } from '@/components/labor-law/ContractValidator';
import { ContractSigning } from '@/components/labor-law/SignaturePad';
import { creerBulletinDepuisContrat, ouvrirBulletinPaie } from '@/lib/labor-law/bulletin-paie';

interface OtherContractFormData {
  contractCategory: 'apprentissage' | 'professionnalisation' | 'cui_cie' | 'cui_cae' | 'portage' | 'interim' | 'domicile' | 'stage' | 'freelance' | 'other';
  contractTitle: string;
  durationWeeks: string;
  startDate: string;
  endDate: string;

  // Parties
  employeeFirstName: string;
  employeeLastName: string;
  employeeAddress: string;
  employeePostalCode: string;
  employeeCity: string;
  employeeEmail: string;
  employeePhone: string;
  employeeBirthDate: string;
  employeeSocialSecurity: string;
  employeeNationality: string;

  companyName: string;
  companyAddress: string;
  companyPostalCode: string;
  companyCity: string;
  companySiret: string;
  employerName: string;
  employerTitle: string;

  // Financial
  salaryAmount: string;
  salaryFrequency: 'monthly' | 'hourly' | 'weekly' | 'flat_rate';

  // Benefits
  hasTransport: boolean;
  hasMeal: boolean;
  hasHealth: boolean;
  hasOther: boolean;
  otherBenefits: string;

  // Specific fields
  tutorName: string;
  schoolName: string;
  speciality: string;
  objectives: string;
  tasks: string;

  // Additional for pay slip
  jobTitle: string;
  workLocation: string;
  workSchedule: string;
  workingHours: string;
  collectiveAgreement: string;
  statut: 'cadre' | 'non_cadre' | 'alternance';
}

const initialFormData: OtherContractFormData = {
  contractCategory: 'apprentissage',
  contractTitle: '',
  durationWeeks: '',
  startDate: '',
  endDate: '',
  employeeFirstName: '',
  employeeLastName: '',
  employeeAddress: '',
  employeePostalCode: '',
  employeeCity: '',
  employeeEmail: '',
  employeePhone: '',
  employeeBirthDate: '',
  employeeSocialSecurity: '',
  employeeNationality: 'Française',
  companyName: '',
  companyAddress: '',
  companyPostalCode: '',
  companyCity: '',
  companySiret: '',
  employerName: '',
  employerTitle: '',
  salaryAmount: '',
  salaryFrequency: 'monthly',
  hasTransport: false,
  hasMeal: false,
  hasHealth: false,
  hasOther: false,
  otherBenefits: '',
  tutorName: '',
  schoolName: '',
  speciality: '',
  objectives: '',
  tasks: '',
  jobTitle: '',
  workLocation: '',
  workSchedule: '35h hebdomadaires',
  workingHours: '35',
  collectiveAgreement: '',
  statut: 'non_cadre',
};

export default function OtherContractPage() {
  const { profile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'type-select' | 'edit' | 'preview' | 'success'>('type-select');
  const [processingVoice, setProcessingVoice] = useState(false);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OtherContractFormData>(initialFormData);
  const [contractHtml, setContractHtml] = useState('');
  const [error, setError] = useState('');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await processVoiceInput(audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (err) {
      setError('Impossible d\'accéder au micro');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const processVoiceInput = async (audioBlob: Blob) => {
    setProcessingVoice(true);
    setError('');

    try {
      const formData_req = new FormData();
      formData_req.append('audio', audioBlob);
      formData_req.append('contract_type', 'other');

      const response = await fetch('/api/process-voice-contract', {
        method: 'POST',
        body: formData_req,
      });

      if (!response.ok) throw new Error('Erreur lors du traitement vocal');

      const result = await response.json();

      if (result.parsed) {
        setFormData(prev => ({ ...prev, ...result.parsed }));

        // Auto-detect category from voice
        if (result.parsed.contractCategory) {
          setFormData(prev => ({ ...prev, contractCategory: result.parsed.contractCategory }));
        }
      }
    } catch (err) {
      setError('Erreur lors du traitement vocal');
      console.error(err);
    } finally {
      setProcessingVoice(false);
    }
  };

  const generateContract = () => {
    const html = generateOtherContract(formData);
    setContractHtml(html);
    setStep('preview');
  };

  const generateOtherContract = (data: OtherContractFormData): string => {
    const categoryLabels: Record<string, string> = {
      stage: 'CONVENTION DE STAGE',
      freelance: 'CONTRAT DE PRESTATION DE SERVICE FREELANCE',
      temp_work: 'CONTRAT DE TRAVAIL TEMPORAIRE',
      apprenticeship: "CONTRAT D'APPRENTISSAGE",
      professionalization: 'CONTRAT DE PROFESSIONNALISATION',
      other: data.contractTitle.toUpperCase(),
    };

    const title = categoryLabels[data.contractCategory] || data.contractTitle.toUpperCase();

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${data.employeeFirstName} ${data.employeeLastName}</title>
  <style>
    body { font-family: 'Arial', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; }
    h1 { color: #1D9E75; text-align: center; margin-bottom: 30px; font-size: 22px; }
    h2 { color: #333; margin-top: 25px; margin-bottom: 12px; font-size: 16px; border-bottom: 2px solid #1D9E75; padding-bottom: 4px; }
    .section { margin-bottom: 18px; }
    .field { margin-bottom: 10px; }
    .label { font-weight: bold; color: #555; }
    .value { color: #333; }
    .signature-area { margin-top: 40px; display: flex; justify-content: space-between; }
    .signature-box { width: 45%; height: 120px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <h1>${title}</h1>

  <div class="section">
    <h2>Article 1 - Parties</h2>
    <div class="field">
      <span class="label">Entreprise :</span>
      <span class="value">${data.companyName} - ${data.companyAddress} - SIRET: ${data.companySiret}</span>
    </div>
    <div class="field">
      <span class="label">Représentée par :</span>
      <span class="value">${data.employerName}</span>
    </div>
    <div class="field">
      <span class="label">Et :</span>
      <span class="value">${data.employeeFirstName} ${data.employeeLastName} - ${data.employeeAddress}</span>
    </div>
  </div>

  <div class="section">
    <h2>Article 2 - Objet</h2>
    <div class="field">
      <span class="label">Intitulé :</span>
      <span class="value">${data.contractTitle || title}</span>
    </div>
    ${data.speciality ? `
    <div class="field">
      <span class="label">Spécialité :</span>
      <span class="value">${data.speciality}</span>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <h2>Article 3 - Durée</h2>
    <div class="field">
      <span class="label">Date de début :</span>
      <span class="value">${data.startDate}</span>
    </div>
    <div class="field">
      <span class="label">Date de fin :</span>
      <span class="value">${data.endDate || 'Non déterminée'}</span>
    </div>
    <div class="field">
      <span class="label">Durée :</span>
      <span class="value">${data.durationWeeks || 'Non spécifiée'}</span>
    </div>
  </div>

  <div class="section">
    <h2>Article 4 - Tâches et Objectifs</h2>
    ${data.tasks ? `
    <div class="field">
      <span class="label">Missions principales :</span>
      <span class="value">${data.tasks}</span>
    </div>
    ` : '<p>Le stagiaire/freelance effectuera les missions confiées par l\'entreprise.</p>'}

    ${data.objectives ? `
    <div class="field">
      <span class="label">Objectifs pédagogiques :</span>
      <span class="value">${data.objectives}</span>
    </div>
    ` : ''}
  </div>

  ${data.contractCategory === 'stage' && data.tutorName ? `
  <div class="section">
    <h2>Article 5 - Tuteur de Stage</h2>
    <div class="field">
      <span class="label">Nom du tuteur :</span>
      <span class="value">${data.tutorName}</span>
    </div>
  </div>
  ` : ''}

  ${data.schoolName ? `
  <div class="section">
    <h2>Article 6 - Établissement d'Enseignement</h2>
    <div class="field">
      <span class="label">École / Université :</span>
      <span class="value">${data.schoolName}</span>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <h2>Article ${data.contractCategory === 'stage' ? '7' : '5'} - Rémunération</h2>
    <div class="field">
      <span class="label">Montant :</span>
      <span class="value">${data.salaryAmount || 'Non rémunéré'} ${data.salaryAmount ? '€' : ''} ${data.salaryFrequency !== 'flat_rate' ? `/ ${data.salaryFrequency === 'monthly' ? 'mois' : data.salaryFrequency === 'weekly' ? 'semaine' : 'heure'}` : ''}</span>
    </div>
  </div>

  <div class="signature-area">
    <div class="signature-box">Signature Employeur</div>
    <div class="signature-box">Signature ${data.contractCategory === 'stage' ? 'Stagiaire' : 'Prestateur'}</div>
  </div>
</body>
</html>`;
  };

  const saveContract = async () => {
    setLoading(true);
    setError('');

    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { error } = await supabase
        .from('contracts_other')
        .insert({
          user_id: user.id,
          contract_category: formData.contractCategory,
          contract_title: formData.contractTitle,
          duration_weeks: parseInt(formData.durationWeeks) || null,
          start_date: formData.startDate,
          end_date: formData.endDate || null,
          employee_first_name: formData.employeeFirstName,
          employee_last_name: formData.employeeLastName,
          employee_address: formData.employeeAddress,
          employee_postal_code: formData.employeePostalCode,
          employee_city: formData.employeeCity,
          employee_email: formData.employeeEmail,
          employee_phone: formData.employeePhone,
          employee_birth_date: formData.employeeBirthDate,
          employee_social_security: formData.employeeSocialSecurity,
          employee_nationality: formData.employeeNationality,
          company_name: formData.companyName,
          company_address: formData.companyAddress,
          company_postal_code: formData.companyPostalCode,
          company_city: formData.companyCity,
          company_siret: formData.companySiret,
          employer_name: formData.employerName,
          employer_title: formData.employerTitle,
          salary_amount: parseFloat(formData.salaryAmount) || null,
          salary_frequency: formData.salaryFrequency,
          tutor_name: formData.tutorName || null,
          school_name: formData.schoolName || null,
          speciality: formData.speciality || null,
          objectives: formData.objectives || null,
          tasks: formData.tasks || null,
          job_title: formData.jobTitle,
          work_location: formData.workLocation,
          work_schedule: formData.workSchedule,
          working_hours: formData.workingHours,
          collective_agreement: formData.collectiveAgreement,
          statut: formData.statut,
          document_status: 'draft',
        });

      if (error) throw error;
      setStep('success');
    } catch (err) {
      setError('Erreur lors de la sauvegarde');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendByEmail = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/send-contract-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formData.employeeEmail,
          contractType: formData.contractCategory,
          employeeName: `${formData.employeeFirstName} ${formData.employeeLastName}`,
          html: contractHtml,
        }),
      });

      if (!response.ok) throw new Error('Erreur lors de l\'envoi');
      setStep('success');
    } catch (err) {
      setError('Erreur lors de l\'envoi du contrat');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    const blob = new Blob([contractHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrat_${formData.contractCategory}_${formData.employeeLastName}_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Autres Contrats de Travail
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Stages, freelance, intérim, apprentissage, etc.
          </p>
        </motion.div>

        {/* Type Selection Step */}
        {step === 'type-select' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-8"
          >
            <div className="text-center mb-8">
              <FileText className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Quel type de contrat souhaitez-vous créer ?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Sélectionnez le type de contrat correspondant à votre besoin
              </p>
            </div>

            <div className="max-w-2xl mx-auto mb-8">
              <MagicSelect
                options={CONTRACT_OTHER_TYPES}
                value={formData.contractCategory}
                onChange={(value) => {
                  setFormData({ ...formData, contractCategory: value as any });
                }}
                placeholder="Sélectionner le type de contrat..."
                label="Type de contrat"
                icon={FileText}
                variant="contract"
                searchable
              />
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => {
                  if (formData.contractCategory) {
                    setStep('edit');
                  }
                }}
                disabled={!formData.contractCategory}
                className={`px-8 py-4 rounded-xl font-semibold transition-all ${
                  formData.contractCategory
                    ? 'bg-gradient-to-r from-primary to-purple-600 text-white hover:shadow-lg hover:scale-105'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continuer vers la création du contrat →
              </button>
            </div>

            {/* Voice Input for Category Selection */}
            <div className="border-t border-gray-200 dark:border-white/10 pt-8 mt-8">
              <div className="text-center mb-4">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Ou dites le type de contrat à voix haute
                </p>
                <button
                  onClick={recording ? stopRecording : startRecording}
                  disabled={processingVoice}
                  className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all ${
                    recording
                      ? 'bg-red-500 text-white'
                      : 'bg-primary text-white hover:bg-primary/90'
                  } ${processingVoice ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {recording ? (
                    <>
                      <X className="w-5 h-5" />
                      Arrêter l'enregistrement
                    </>
                  ) : processingVoice ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      Dicter le type de contrat
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center gap-3 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Edit Step */}
        {step === 'edit' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Voice/Text Input */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Mic className="w-5 h-5 text-primary" />
                Complétez par voix ou par texte
              </h3>

              <div className="flex gap-3 mb-4">
                <button
                  onClick={recording ? stopRecording : startRecording}
                  disabled={processingVoice}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                    recording
                      ? 'bg-red-500 text-white'
                      : 'bg-primary text-white hover:bg-primary/90'
                  } ${processingVoice ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {recording ? (
                    <>
                      <X className="w-5 h-5" />
                      Arrêter
                    </>
                  ) : processingVoice ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      Enregistrer
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>

            {/* Selected Category Display */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Type de contrat : <span className="font-semibold text-primary">{CONTRACT_OTHER_TYPES.find(c => c.value === formData.contractCategory)?.label}</span>
              </p>
            </div>

            {/* Form Sections */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Contract Info */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Informations du contrat
                </h3>

                <div className="space-y-4">
                  <input
                    placeholder="Titre du contrat"
                    value={formData.contractTitle}
                    onChange={(e) => setFormData({ ...formData, contractTitle: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />

                  <MagnificentDatePicker
                    value={formData.startDate}
                    onChange={(value) => setFormData({ ...formData, startDate: value })}
                    placeholder="Date de début du contrat"
                    label="Date de début"
                  />

                  <MagnificentDatePicker
                    value={formData.endDate}
                    onChange={(value) => setFormData({ ...formData, endDate: value })}
                    placeholder="Date de fin du contrat"
                    label="Date de fin"
                    minDate={formData.startDate}
                  />

                  <input
                    type="number"
                    placeholder="Durée (semaines)"
                    value={formData.durationWeeks}
                    onChange={(e) => setFormData({ ...formData, durationWeeks: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />

                  <input
                    placeholder="Spécialité / Domaine"
                    value={formData.speciality}
                    onChange={(e) => setFormData({ ...formData, speciality: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />

                  {formData.contractCategory === 'stage' && (
                    <input
                      placeholder="Nom du tuteur de stage"
                      value={formData.tutorName}
                      onChange={(e) => setFormData({ ...formData, tutorName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />
                  )}

                  {(formData.contractCategory === 'stage' || formData.contractCategory === 'apprentissage' || formData.contractCategory === 'professionnalisation') && (
                    <input
                      placeholder="Nom de l'école / établissement"
                      value={formData.schoolName}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />
                  )}

                  <textarea
                    placeholder="Objectifs pédagogiques / missions"
                    value={formData.objectives}
                    onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    rows={3}
                  />

                  <textarea
                    placeholder="Tâches principales"
                    value={formData.tasks}
                    onChange={(e) => setFormData({ ...formData, tasks: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    rows={3}
                  />
                </div>
              </div>

              {/* Employee Info */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  {formData.contractCategory === 'stage' ? 'Stagiaire' : formData.contractCategory === 'freelance' ? 'Freelance' : 'Salarié'}
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="Prénom"
                      value={formData.employeeFirstName}
                      onChange={(e) => setFormData({ ...formData, employeeFirstName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />
                    <input
                      placeholder="Nom"
                      value={formData.employeeLastName}
                      onChange={(e) => setFormData({ ...formData, employeeLastName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />
                  </div>

                  <input
                    placeholder="Adresse"
                    value={formData.employeeAddress}
                    onChange={(e) => setFormData({ ...formData, employeeAddress: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />

                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.employeeEmail}
                    onChange={(e) => setFormData({ ...formData, employeeEmail: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />

                  <input
                    type="tel"
                    placeholder="Téléphone"
                    value={formData.employeePhone}
                    onChange={(e) => setFormData({ ...formData, employeePhone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="Code postal"
                      value={formData.employeePostalCode}
                      onChange={(e) => setFormData({ ...formData, employeePostalCode: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />
                    <input
                      placeholder="Ville"
                      value={formData.employeeCity}
                      onChange={(e) => setFormData({ ...formData, employeeCity: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />
                  </div>

                  <MagnificentDatePicker
                    value={formData.employeeBirthDate}
                    onChange={(value) => setFormData({ ...formData, employeeBirthDate: value })}
                    placeholder="Date de naissance"
                    label="Date de naissance"
                    maxDate={new Date().toISOString().split('T')[0]}
                  />

                  <input
                    placeholder="Numéro Sécurité Sociale"
                    value={formData.employeeSocialSecurity}
                    onChange={(e) => setFormData({ ...formData, employeeSocialSecurity: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />

                  <input
                    placeholder="Nationalité"
                    value={formData.employeeNationality}
                    onChange={(e) => setFormData({ ...formData, employeeNationality: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              {/* Company Info */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-6 md:col-span-2">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Entreprise
                </h3>

                <div className="space-y-4">
                  <SireneAutocomplete
                    onCompanySelect={(company) => {
                      setFormData({
                        ...formData,
                        companyName: company.name,
                        companyAddress: company.address,
                        companyPostalCode: company.postalCode,
                        companyCity: company.city,
                        companySiret: company.siret
                      });
                    }}
                    initialCompanyName={formData.companyName}
                    placeholder="Rechercher ou saisir le nom de l'entreprise..."
                    label="Nom de l'entreprise"
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      placeholder="Adresse (pré-rempli automatiquement)"
                      value={formData.companyAddress}
                      onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />

                    <input
                      placeholder="SIRET (pré-rempli automatiquement)"
                      value={formData.companySiret}
                      onChange={(e) => setFormData({ ...formData, companySiret: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-mono"
                    />

                    <input
                      placeholder="Code postal"
                      value={formData.companyPostalCode}
                      onChange={(e) => setFormData({ ...formData, companyPostalCode: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />

                    <input
                      placeholder="Ville"
                      value={formData.companyCity}
                      onChange={(e) => setFormData({ ...formData, companyCity: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />

                    <input
                      placeholder="Nom de l'employeur / signataire"
                      value={formData.employerName}
                      onChange={(e) => setFormData({ ...formData, employerName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />

                    <input
                      placeholder="Titre de l'employeur"
                      value={formData.employerTitle}
                      onChange={(e) => setFormData({ ...formData, employerTitle: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Info */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-6 md:col-span-2">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Euro className="w-5 h-5 text-primary" />
                  Rémunération
                </h3>

                <div className="grid md:grid-cols-3 gap-4">
                  <input
                    type="number"
                    placeholder="Montant"
                    value={formData.salaryAmount}
                    onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />

                  <MagicSelect
                    options={[
                      { value: 'monthly', label: 'Mensuel', description: 'Salaire mensuel' },
                      { value: 'weekly', label: 'Hebdomadaire', description: 'Par semaine' },
                      { value: 'hourly', label: 'Horaire', description: 'Tarif horaire' },
                      { value: 'flat_rate', label: 'Forfait', description: 'Prix forfaitaire' }
                    ]}
                    value={formData.salaryFrequency}
                    onChange={(value) => setFormData({ ...formData, salaryFrequency: value as any })}
                    placeholder="Fréquence de paiement"
                    label="Fréquence"
                    variant="default"
                  />

                  <input
                    placeholder="Intitulé du poste"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />

                  <input
                    placeholder="Lieu de travail"
                    value={formData.workLocation}
                    onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />

                  <input
                    placeholder="Horaires de travail"
                    value={formData.workSchedule}
                    onChange={(e) => setFormData({ ...formData, workSchedule: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />

                  <input
                    placeholder="Heures hebdomadaires"
                    value={formData.workingHours}
                    onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />

                  <input
                    placeholder="Convention collective"
                    value={formData.collectiveAgreement}
                    onChange={(e) => setFormData({ ...formData, collectiveAgreement: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />

                  <MagicSelect
                    options={[
                      { value: 'non_cadre', label: 'Non-cadre', description: 'Statut employé' },
                      { value: 'cadre', label: 'Cadre', description: 'Statut cadre' },
                      { value: 'alternance', label: 'Alternance', description: 'Contrat alternance' }
                    ]}
                    value={formData.statut}
                    onChange={(value) => setFormData({ ...formData, statut: value as any })}
                    placeholder="Statut du salarié"
                    label="Statut"
                    variant="default"
                  />
                </div>
              </div>
            </div>

            {/* Validation légale */}
            <div className="md:col-span-2">
              <ContractValidator
                contractType={formData.contractCategory as any}
                contractData={formData}
                onValidationChange={(isValid, errors) => {
                  console.log('Validation:', isValid, errors);
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setStep('type-select')}
                className="px-6 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                ← Retour
              </button>
              <button
                onClick={generateContract}
                className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Générer le contrat
              </button>
            </div>
          </motion.div>
        )}

        {/* Preview Step */}
        {step === 'preview' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Validation légale compacte */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-primary" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Validation légale</h3>
              </div>
              <ContractValidator
                contractType={formData.contractCategory as any}
                contractData={formData}
                compact={false}
              />
            </div>

            {/* Aperçu du contrat */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Eye className="w-7 h-7 text-primary" />
                Aperçu du contrat
              </h2>

              <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 mb-6 overflow-auto max-h-[600px]">
                <div dangerouslySetInnerHTML={{ __html: contractHtml }} />
              </div>
            </div>

            {/* Bulletin de paie estimé (pour les contrats rémunérés) */}
            {formData.salaryAmount && formData.contractCategory !== 'stage' && (
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Calculator className="w-6 h-6 text-primary" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Estimation rémunération</h3>
                  </div>
                  <button
                    onClick={() => {
                      const periodeDebut = formData.startDate || new Date().toISOString().split('T')[0];
                      const periodeFin = formData.endDate || new Date(new Date(periodeDebut).setMonth(new Date(periodeDebut).getMonth() + 1)).toISOString().split('T')[0];
                      const bulletinData = creerBulletinDepuisContrat(formData, periodeDebut, periodeFin);
                      ouvrirBulletinPaie(bulletinData);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-semibold hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Générer bulletin de paie
                  </button>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Montant brut</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {parseFloat(formData.salaryAmount || '0').toFixed(2)} €
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Estimation net</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {(parseFloat(formData.salaryAmount || '0') * 0.77).toFixed(2)} €
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Coût employeur</p>
                      <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {(parseFloat(formData.salaryAmount || '0') * 1.45).toFixed(2)} €
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Fréquence</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formData.salaryFrequency === 'monthly' ? 'Mensuel' : formData.salaryFrequency === 'weekly' ? 'Hebdomadaire' : formData.salaryFrequency === 'hourly' ? 'Horaire' : 'Forfait'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
                    <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Info className="w-3 h-3" />
                      Estimation basée sur les taux de cotisation 2024. Valeurs données à titre indicatif.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Signature numérique */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-6">
              <ContractSigning
                contractType={formData.contractCategory}
                contractHtml={contractHtml}
                onSave={(signedContract) => {
                  console.log('Contract signed:', signedContract);
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => setStep('edit')}
                className="px-6 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                ← Modifier
              </button>
              <button
                onClick={downloadPDF}
                className="px-6 py-3 bg-primary/10 text-primary rounded-xl font-semibold hover:bg-primary/20 transition-colors flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Télécharger
              </button>
              <button
                onClick={saveContract}
                disabled={loading}
                className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-5 h-5" />
                    Sauvegarder
                  </>
                )}
              </button>
              <button
                onClick={sendByEmail}
                disabled={loading}
                className="px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Envoyer par email
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-12 text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Contrat créé avec succès !
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Le contrat a été sauvegardé et est disponible dans vos documents.
            </p>
            <button
              onClick={() => {
                setFormData(initialFormData);
                setContractHtml('');
                setStep('type-select');
              }}
              className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              Créer un autre contrat
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

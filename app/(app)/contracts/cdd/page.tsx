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
  Calendar,
  Euro,
  User,
  Building2,
  FileCheck,
  X,
  Shield,
  Calculator,
  Info,
  Sparkles
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { MagicSelect, CONTRACT_CDD_REASONS, BENEFIT_OPTIONS, CONTRACT_CDI_TYPES } from '@/components/ui/MagicSelect';
import { SireneAutocomplete } from '@/components/ui/SireneAutocomplete';
import { MagnificentDatePicker } from '@/components/ui/MagnificentDatePicker';
import { ContractValidator } from '@/components/labor-law/ContractValidator';
import { ContractSigning } from '@/components/labor-law/SignaturePad';
import { creerBulletinDepuisContrat, ouvrirBulletinPaie } from '@/lib/labor-law/bulletin-paie';

interface CDDFormData {
  // Employee info
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

  // Contract details
  contractStartDate: string;
  contractEndDate: string;
  trialPeriodDays: string;
  jobTitle: string;
  workLocation: string;
  workSchedule: string;
  salaryAmount: string;
  salaryFrequency: 'monthly' | 'hourly';
  contractReason: string;
  replacedEmployeeName: string;

  // Company info
  companyName: string;
  companyAddress: string;
  companyPostalCode: string;
  companyCity: string;
  companySiret: string;
  employerName: string;
  employerTitle: string;

  // Benefits
  hasTransport: boolean;
  hasMeal: boolean;
  hasHealth: boolean;
  hasOther: boolean;
  otherBenefits: string;

  // Signatures (base64)
  employerSignature?: string;
  employeeSignature?: string;
}

const initialFormData: CDDFormData = {
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
  contractStartDate: '',
  contractEndDate: '',
  trialPeriodDays: '',
  jobTitle: '',
  workLocation: '',
  workSchedule: '35h hebdomadaires',
  salaryAmount: '',
  salaryFrequency: 'monthly',
  contractReason: '',
  replacedEmployeeName: '',
  companyName: '',
  companyAddress: '',
  companyPostalCode: '',
  companyCity: '',
  companySiret: '',
  employerName: '',
  employerTitle: '',
  hasTransport: false,
  hasMeal: false,
  hasHealth: false,
  hasOther: false,
  otherBenefits: '',
  employerSignature: undefined,
  employeeSignature: undefined,
};

export default function CDDContractPage() {
  const { profile } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'edit' | 'preview' | 'success'>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CDDFormData>(initialFormData);
  const [contractHtml, setContractHtml] = useState('');
  const [error, setError] = useState('');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    await analyzeFiles(selectedFiles);
  };

  const analyzeFiles = async (uploadedFiles: File[]) => {
    setAnalyzing(true);
    setError('');

    try {
      const analysisPromises = uploadedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', profile?.id || '');

        const response = await fetch('/api/analyze-contract-file', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Erreur lors de l\'analyse');
        return await response.json();
      });

      const results = await Promise.all(analysisPromises);

      // Merge all analysis results into form data
      results.forEach(result => {
        if (result.extractedData) {
          setFormData(prev => ({
            ...prev,
            ...result.extractedData
          }));
        }
      });

      setStep('edit');
    } catch (err) {
      setError('Erreur lors de l\'analyse des documents');
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(chunks, { type: mimeType });
        await processVoiceInput(audioBlob, mimeType);
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

  const processVoiceInput = async (audioBlob: Blob, mimeType?: string) => {
    setProcessingVoice(true);
    setError('');

    try {
      const ext = (mimeType || audioBlob.type).includes('mp4') ? 'mp4' : (mimeType || audioBlob.type).includes('ogg') ? 'ogg' : 'webm';
      const formData = new FormData();
      formData.append('audio', audioBlob, `recording.${ext}`);
      formData.append('contract_type', 'cdd');

      const response = await fetch('/api/process-voice-contract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Erreur lors du traitement vocal');

      const result = await response.json();

      if (result.parsed) {
        setFormData(prev => ({
          ...prev,
          ...result.parsed
        }));
      }
    } catch (err) {
      setError('Erreur lors du traitement vocal');
      console.error(err);
    } finally {
      setProcessingVoice(false);
    }
  };

  const handleTextSubmit = async () => {
    setProcessingVoice(true);
    setError('');

    try {
      const response = await fetch('/api/process-text-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: formData.employeeFirstName + ' ' + formData.employeeLastName,
          contract_type: 'cdd'
        }),
      });

      if (!response.ok) throw new Error('Erreur lors de l\'analyse');

      const result = await response.json();

      if (result.parsed) {
        setFormData(prev => ({
          ...prev,
          ...result.parsed
        }));
      }
    } catch (err) {
      setError('Erreur lors de l\'analyse');
      console.error(err);
    } finally {
      setProcessingVoice(false);
    }
  };

  const generateContract = () => {
    const html = generateCDDContract(formData);
    setContractHtml(html);
    setStep('preview');
  };

  const generateCDDContract = (data: CDDFormData): string => {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrat CDD - ${data.employeeFirstName} ${data.employeeLastName}</title>
  <style>
    body { font-family: 'Arial', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; }
    h1 { color: #1D9E75; text-align: center; margin-bottom: 30px; }
    h2 { color: #333; margin-top: 30px; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #1D9E75; padding-bottom: 5px; }
    .section { margin-bottom: 20px; }
    .field { margin-bottom: 10px; }
    .label { font-weight: bold; color: #555; }
    .value { color: #333; }
    .signature-area { margin-top: 50px; display: flex; justify-content: space-between; }
    .signature-box { width: 45%; height: 150px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #999; }
  </style>
</head>
<body>
  <h1>CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE</h1>

  <div class="section">
    <h2>Article 1 - Engagement</h2>
    <p>Le présent contrat est soumis aux dispositions des articles L. 1242-1 et suivants du Code du travail.</p>
  </div>

  <div class="section">
    <h2>Article 2 - Durée du contrat</h2>
    <div class="field">
      <span class="label">Date de début :</span>
      <span class="value">${data.contractStartDate}</span>
    </div>
    <div class="field">
      <span class="label">Date de fin :</span>
      <span class="value">${data.contractEndDate}</span>
    </div>
    <div class="field">
      <span class="label">Motif de recours au CDD :</span>
      <span class="value">${data.contractReason}</span>
    </div>
    ${data.replacedEmployeeName ? `
    <div class="field">
      <span class="label">Salarié remplacé :</span>
      <span class="value">${data.replacedEmployeeName}</span>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <h2>Article 3 - Période d'essai</h2>
    <div class="field">
      <span class="value">Une période d'essai de ${data.trialPeriodDays} jours est prévue.</span>
    </div>
  </div>

  <div class="section">
    <h2>Article 4 - Désignation du poste</h2>
    <div class="field">
      <span class="label">Intitulé du poste :</span>
      <span class="value">${data.jobTitle}</span>
    </div>
    <div class="field">
      <span class="label">Lieu de travail :</span>
      <span class="value">${data.workLocation}</span>
    </div>
  </div>

  <div class="section">
    <h2>Article 5 - Durée du travail</h2>
    <div class="field">
      <span class="value">${data.workSchedule}</span>
    </div>
  </div>

  <div class="section">
    <h2>Article 6 - Rémunération</h2>
    <div class="field">
      <span class="label">Salaire :</span>
      <span class="value">${data.salaryAmount} € ${data.salaryFrequency === 'monthly' ? 'brut mensuel' : 'brut par heure'}</span>
    </div>
  </div>

  <div class="section">
    <h2>Article 7 - Avantages</h2>
    <ul>
      ${data.hasTransport ? '<li>Titres de transport</li>' : ''}
      ${data.hasMeal ? '<li>Titres restaurant</li>' : ''}
      ${data.hasHealth ? '<li>Complémentaire santé</li>' : ''}
      ${data.hasOther && data.otherBenefits ? `<li>${data.otherBenefits}</li>` : ''}
    </ul>
  </div>

  <div class="section">
    <h2>Article 8 - Congés payés</h2>
    <p>Le salarié bénéficiera des mêmes droits à congés payés que les autres salariés de l'entreprise.</p>
  </div>

  <div class="signature-area">
    <div class="signature-box">Signature Employeur</div>
    <div class="signature-box">Signature Salarié</div>
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
        .from('contracts_cdd')
        .insert({
          user_id: user.id,
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
          contract_start_date: formData.contractStartDate,
          contract_end_date: formData.contractEndDate,
          trial_period_days: parseInt(formData.trialPeriodDays) || null,
          job_title: formData.jobTitle,
          work_location: formData.workLocation,
          work_schedule: formData.workSchedule,
          salary_amount: parseFloat(formData.salaryAmount) || null,
          salary_frequency: formData.salaryFrequency,
          contract_reason: formData.contractReason,
          replaced_employee_name: formData.replacedEmployeeName || null,
          company_name: formData.companyName,
          company_address: formData.companyAddress,
          company_postal_code: formData.companyPostalCode,
          company_city: formData.companyCity,
          company_siret: formData.companySiret,
          employer_name: formData.employerName,
          employer_title: formData.employerTitle,
          has_transport: formData.hasTransport,
          has_meal: formData.hasMeal,
          has_health: formData.hasHealth,
          has_other: formData.hasOther,
          other_benefits: formData.otherBenefits || null,
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
          contractType: 'CDD',
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

  const downloadPDF = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/contracts/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract: {
            ...formData,
            contractType: 'cdd' as const,
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la génération du PDF');
      }

      const pdfBlob = await response.blob();
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CDD_${formData.employeeLastName}_${formData.employeeFirstName}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
      console.error(err);
    } finally {
      setLoading(false);
    }
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
            Contrat à Durée Déterminée (CDD)
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Créez et gérez vos contrats CDD conformes à la législation française
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {['upload', 'edit', 'preview'].map((s, i) => (
            <React.Fragment key={s}>
              <motion.div
                animate={{
                  scale: step === s ? 1.1 : 1,
                  backgroundColor: step === s ? '#1D9E75' : '#E5E7EB'
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
              >
                {i + 1}
              </motion.div>
              {i < 2 && (
                <div className={`w-16 h-1 rounded ${['upload', 'edit', 'preview'].indexOf(step) > i ? 'bg-primary' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Upload Step */}
        {step === 'upload' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-8"
          >
            <div className="text-center mb-8">
              <FileText className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Importez vos documents
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Carte d'identité, pièces d'entreprise, etc.
              </p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all bg-white/50 dark:bg-slate-800/50 border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-primary/50"
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Cliquez ou glissez vos fichiers ici
              </p>
              <p className="text-sm text-gray-500">
                PDF, JPG, PNG, DOC, DOCX
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />

            {files.length > 0 && (
              <div className="mt-6 space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl">
                    <FileCheck className="w-5 h-5 text-primary" />
                    <span className="flex-1 text-sm truncate">{file.name}</span>
                  </div>
                ))}
              </div>
            )}

            {analyzing && (
              <div className="mt-6 flex items-center justify-center gap-3 text-primary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analyse en cours...</span>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setStep('edit')}
                className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
              >
                Sauter l'import →
              </button>
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

                <button
                  onClick={handleTextSubmit}
                  disabled={processingVoice}
                  className="px-6 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  Analyser le texte
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </div>

            {/* Form Sections */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Employee Info */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Salarié
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

                  <MagicSelect
                    options={[
                      { value: 'Française', label: 'Française', description: 'Ressortissant français' },
                      { value: 'Européenne', label: 'Européenne (UE)', description: 'Citoyen de l\'Union Européenne' },
                      { value: 'Hors UE', label: 'Hors Union Européenne', description: 'Ressortissant non-UE' }
                    ]}
                    value={formData.employeeNationality}
                    onChange={(value) => setFormData({ ...formData, employeeNationality: value })}
                    placeholder="Sélectionner la nationalité"
                    label="Nationalité"
                    variant="default"
                  />
                </div>
              </div>

              {/* Contract Details */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Détails du contrat
                </h3>

                <div className="space-y-4">
                  <MagnificentDatePicker
                    value={formData.contractStartDate}
                    onChange={(value) => setFormData({ ...formData, contractStartDate: value })}
                    placeholder="Date de début du contrat"
                    label="Date de début"
                  />

                  <MagnificentDatePicker
                    value={formData.contractEndDate}
                    onChange={(value) => setFormData({ ...formData, contractEndDate: value })}
                    placeholder="Date de fin du contrat"
                    label="Date de fin"
                    minDate={formData.contractStartDate}
                  />

                  <input
                    type="number"
                    placeholder="Durée période d'essai (jours)"
                    value={formData.trialPeriodDays}
                    onChange={(e) => setFormData({ ...formData, trialPeriodDays: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />

                  <MagicSelect
                    options={CONTRACT_CDD_REASONS}
                    value={formData.contractReason}
                    onChange={(value) => setFormData({ ...formData, contractReason: value })}
                    placeholder="Sélectionner le motif du CDD..."
                    label="Motif du CDD"
                    icon={FileText}
                    variant="contract"
                    searchable
                  />

                  {formData.contractReason === 'remplacement' && (
                    <input
                      placeholder="Nom du salarié remplacé"
                      value={formData.replacedEmployeeName}
                      onChange={(e) => setFormData({ ...formData, replacedEmployeeName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />
                  )}

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

                  <MagicSelect
                    options={[
                      { value: '35h hebdomadaires', label: '35h hebdomadaires', description: 'Durée légale du travail' },
                      { value: '39h hebdomadaires', label: '39h hebdomadaires', description: 'Avec heures supplémentaires' },
                      { value: 'Temps partiel', label: 'Temps partiel', description: 'Moins de 24h par semaine' },
                      { value: 'Horaires variables', label: 'Horaires variables', description: 'Horaires aménagés' },
                      { value: 'Horaires de nuit', label: 'Horaires de nuit', description: 'Travail de nuit (21h-6h)' }
                    ]}
                    value={formData.workSchedule}
                    onChange={(value) => setFormData({ ...formData, workSchedule: value })}
                    placeholder="Sélectionner les horaires"
                    label="Horaires de travail"
                    variant="default"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      placeholder="Salaire"
                      value={formData.salaryAmount}
                      onChange={(e) => setFormData({ ...formData, salaryAmount: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />
                    <MagicSelect
                      options={[
                        { value: 'monthly', label: 'Mensuel', description: 'Salaire mensuel' },
                        { value: 'hourly', label: 'Horaire', description: 'Tarif horaire' }
                      ]}
                      value={formData.salaryFrequency}
                      onChange={(value) => setFormData({ ...formData, salaryFrequency: value as any })}
                      placeholder="Fréquence"
                      variant="default"
                    />
                  </div>
                </div>
              </div>

              {/* Company Info */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-6">
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

                  <input
                    placeholder="Adresse (pré-rempli automatiquement)"
                    value={formData.companyAddress}
                    onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                  />

                  <div className="grid grid-cols-2 gap-3">
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
                  </div>

                  <input
                    placeholder="SIRET (pré-rempli automatiquement)"
                    value={formData.companySiret}
                    onChange={(e) => setFormData({ ...formData, companySiret: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-mono"
                  />

                  <input
                    placeholder="Nom de l'employeur"
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

              {/* Benefits */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Euro className="w-5 h-5 text-primary" />
                  Avantages
                </h3>

                <div className="space-y-3">
                  {BENEFIT_OPTIONS.map((benefit) => {
                    const benefitKey = benefit.value === 'transport' ? 'hasTransport' :
                                     benefit.value === 'meal' ? 'hasMeal' :
                                     benefit.value === 'health' ? 'hasHealth' : null;
                    if (!benefitKey) return null;

                    return (
                      <motion.label
                        key={benefit.value}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`
                          relative flex items-center gap-3 p-3 rounded-xl cursor-pointer
                          transition-all duration-200 border-2
                          ${(formData as any)[benefitKey]
                            ? 'bg-gradient-to-r from-primary/20 to-purple-600/20 border-primary/30'
                            : 'bg-white/50 dark:bg-slate-800/50 border-transparent hover:border-gray-200 dark:hover:border-white/10'
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={(formData as any)[benefitKey]}
                          onChange={(e) => setFormData({ ...formData, [benefitKey]: e.target.checked })}
                          className="sr-only"
                        />
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${benefit.color}`}>
                          <benefit.icon size={18} className="text-white" />
                        </div>
                        <span className="flex-1 font-medium text-sm text-gray-900 dark:text-white">{benefit.label}</span>
                        {(formData as any)[benefitKey] && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0"
                          >
                            <Check size={14} className="text-white" />
                          </motion.div>
                        )}
                      </motion.label>
                    );
                  })}

                  <motion.label
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`
                      relative flex items-center gap-3 p-3 rounded-xl cursor-pointer
                      transition-all duration-200 border-2
                      ${formData.hasOther
                        ? 'bg-gradient-to-r from-violet-500/20 to-purple-600/20 border-violet-500/30'
                        : 'bg-white/50 dark:bg-slate-800/50 border-transparent hover:border-gray-200 dark:hover:border-white/10'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={formData.hasOther}
                      onChange={(e) => setFormData({ ...formData, hasOther: e.target.checked })}
                      className="sr-only"
                    />
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-violet-500 to-purple-600">
                      <Sparkles size={18} className="text-white" />
                    </div>
                    <span className="flex-1 font-medium text-sm text-gray-900 dark:text-white">Autres avantages</span>
                    {formData.hasOther && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0"
                      >
                        <Check size={14} className="text-white" />
                      </motion.div>
                    )}
                  </motion.label>

                  {formData.hasOther && (
                    <motion.input
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      placeholder="Précisez les autres avantages"
                      value={formData.otherBenefits}
                      onChange={(e) => setFormData({ ...formData, otherBenefits: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Validation légale */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-6">
              <ContractValidator
                contractType="cdd"
                contractData={formData}
                onValidationChange={(isValid, errors) => {
                  // Vous pouvez stocker l'état de validation pour bloquer la génération si invalide
                  console.log('Validation:', isValid, errors);
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => setStep('upload')}
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
                contractType="cdd"
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

            {/* Bulletin de paie estimé */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Calculator className="w-6 h-6 text-primary" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Estimation salaire net</h3>
                </div>
                <button
                  onClick={() => {
                    const periodeDebut = formData.contractStartDate || new Date().toISOString().split('T')[0];
                    const periodeFin = formData.contractEndDate || new Date().toISOString().split('T')[0];
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
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Salaire brut</p>
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
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Statut</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formData.salaryFrequency === 'monthly' ? 'Mensuel' : 'Horaire'}
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

            {/* Signature numérique */}
            <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/30 dark:border-white/10 shadow-lg rounded-3xl p-6">
              <ContractSigning
                contractType="CDD"
                contractHtml={contractHtml}
                onSave={(signedContract) => {
                  // Extract signatures from signed contract
                  if (signedContract.signatures && signedContract.signatures.length > 0) {
                    const employerSig = signedContract.signatures.find(s => s.name.includes('Employeur'));
                    const employeeSig = signedContract.signatures.find(s => s.name.includes('Salarie'));

                    if (employerSig) {
                      setFormData(prev => ({ ...prev, employerSignature: employerSig.data }));
                    }
                    if (employeeSig) {
                      setFormData(prev => ({ ...prev, employeeSignature: employeeSig.data }));
                    }
                  }
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
              Le contrat CDD a été sauvegardé et est disponible dans vos documents.
            </p>
            <button
              onClick={() => {
                setFormData(initialFormData);
                setFiles([]);
                setContractHtml('');
                setStep('upload');
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

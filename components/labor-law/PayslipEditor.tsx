'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Download, Sparkles, Loader2, AlertCircle,
  User, Building2, Euro, Calendar, FileText, ChevronDown, ChevronUp,
  Heart, Gift, Plane, Activity, Clock, Truck
} from 'lucide-react';
import { toast } from 'sonner';
import type { BulletinPaieData } from '@/lib/labor-law/bulletin-paie';
import { genererBulletinPaieHTML } from '@/lib/labor-law/bulletin-paie';

interface PayslipEditorProps {
  initialData: BulletinPaieData;
  onClose: () => void;
}

export function PayslipEditor({ initialData, onClose }: PayslipEditorProps) {
  const [data, setData] = useState<BulletinPaieData>(initialData);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [openSection, setOpenSection] = useState<string>('salaire');

  const update = (field: keyof BulletinPaieData, value: any) =>
    setData(prev => ({ ...prev, [field]: value }));

  const handleAiModify = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiWarnings([]);
    try {
      const res = await fetch('/api/lia/payslip-modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPayslip: data, requestedChanges: aiPrompt }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur IA');
      const result = await res.json();
      if (result.modifiedPayslip) {
        setData(prev => ({ ...prev, ...result.modifiedPayslip }));
        setAiWarnings(result.warnings || []);
        toast.success('Bulletin modifié par l\'IA');
        setAiPrompt('');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la modification IA');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch('/api/payslips/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payslip: data }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur PDF');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const period = new Date(data.periodeDebut).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      a.download = `Bulletin_Paie_${data.nom}_${data.prenom}_${period.replace(/ /g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Bulletin de paie téléchargé');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    } finally {
      setPdfLoading(false);
    }
  };

  const Section = ({ id, title, icon: Icon, children }: { id: string; title: string; icon: any; children: React.ReactNode }) => (
    <div className="border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpenSection(openSection === id ? '' : id)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-primary" />
          <span className="font-semibold text-gray-900 dark:text-white">{title}</span>
        </div>
        {openSection === id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      <AnimatePresence>
        {openSection === id && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const Field = ({ label, value, onChange, type = 'text', readOnly = false }: {
    label: string; value: string | number; onChange?: (v: string) => void; type?: string; readOnly?: boolean;
  }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        className={`w-full px-3 py-2 text-sm rounded-xl border-2 outline-none transition-all
          ${readOnly
            ? 'bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-white/5 text-gray-500 cursor-not-allowed'
            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/20'
          }`}
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-3xl my-4 border border-gray-200 dark:border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10 bg-gradient-to-r from-primary/5 to-purple-500/5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Bulletin de paie — {data.prenom} {data.nom}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Modifiez manuellement ou avec l'IA, puis téléchargez en PDF
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* AI Modify */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="font-semibold text-purple-900 dark:text-purple-100">Modifier avec l'IA</span>
            </div>
            <div className="flex gap-2">
              <input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAiModify()}
                placeholder="Ex: Ajoute 200€ de prime exceptionnelle, recalcule les cotisations..."
                className="flex-1 px-4 py-2.5 text-sm rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-800 focus:border-purple-400 focus:ring-2 focus:ring-purple-200/30 outline-none transition-all"
              />
              <button
                onClick={handleAiModify}
                disabled={aiLoading || !aiPrompt.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {aiLoading ? 'En cours...' : 'Modifier'}
              </button>
            </div>
            {aiWarnings.length > 0 && (
              <div className="mt-3 space-y-1">
                {aiWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Editable sections */}
          <Section id="salarie" title="Salarié" icon={User}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom" value={data.nom} onChange={(v) => update('nom', v)} />
              <Field label="Prénom" value={data.prenom} onChange={(v) => update('prenom', v)} />
            </div>
            <Field label="Adresse" value={data.adresse} onChange={(v) => update('adresse', v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Code postal" value={data.codePostal} onChange={(v) => update('codePostal', v)} />
              <Field label="Ville" value={data.ville} onChange={(v) => update('ville', v)} />
            </div>
            <Field label="NIR (Séc. Sociale - 15 chiffres)" value={data.nir} onChange={(v) => update('nir', v)} />
            <Field label="Date de naissance" value={data.dateNaissance} onChange={(v) => update('dateNaissance', v)} type="date" />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Situation familiale</label>
                <select value={data.situationFamiliale} onChange={(e) => update('situationFamiliale', e.target.value as any)} className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 focus:border-primary/50 outline-none">
                  <option value="celibataire">Célibataire</option>
                  <option value="marie">Marié(e)</option>
                  <option value="divorce">Divorcé(e)</option>
                  <option value="veuf">Veuf/Veuve</option>
                </select>
              </div>
              <Field label="Nombre d'enfants à charge" value={data.nombreEnfants} onChange={(v) => update('nombreEnfants', parseInt(v) || 0)} type="number" />
            </div>
          </Section>

          <Section id="salaire" title="Rémunération de base" icon={Euro}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Salaire brut (€)" value={data.salaireBrut} onChange={(v) => update('salaireBrut', parseFloat(v) || 0)} type="number" />
              <Field label="Salaire brut annuel (€)" value={data.salaireBrutAnnuel} onChange={(v) => update('salaireBrutAnnuel', parseFloat(v) || 0)} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Heures mensuelles" value={data.heuresMensuelles} onChange={(v) => update('heuresMensuelles', parseFloat(v) || 0)} type="number" />
              <Field label="Taux horaire (€)" value={data.tauxHoraire ?? ''} onChange={(v) => update('tauxHoraire', parseFloat(v) || undefined)} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Statut</label>
                <select value={data.statut} onChange={(e) => update('statut', e.target.value as any)} className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 focus:border-primary/50 outline-none">
                  <option value="cadre">Cadre</option>
                  <option value="non_cadre">Non cadre</option>
                  <option value="alternance">Alternance</option>
                </select>
              </div>
              <Field label="Classification / Poste" value={data.classification} onChange={(v) => update('classification', v)} />
            </div>
            <Field label="Convention collective" value={data.conventionCollective} onChange={(v) => update('conventionCollective', v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Coefficient" value={data.coef} onChange={(v) => update('coef', parseFloat(v) || 0)} type="number" />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Temps partiel</label>
                <div className="flex items-center gap-3 h-10">
                  <input type="checkbox" checked={!!data.tempsPartiel} onChange={(e) => update('tempsPartiel', e.target.checked)} className="w-4 h-4 accent-primary" />
                  {data.tempsPartiel && <Field label="%" value={data.pourcentageTempsPartiel ?? ''} onChange={(v) => update('pourcentageTempsPartiel', parseFloat(v) || undefined)} type="number" />}
                </div>
              </div>
            </div>
          </Section>

          <Section id="heures" title="Heures & Présence" icon={Clock}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Heures supp. à 25% (h)" value={data.heuresSupp25 ?? ''} onChange={(v) => update('heuresSupp25', parseFloat(v) || undefined)} type="number" />
              <Field label="Heures supp. à 50% (h)" value={data.heuresSupp50 ?? ''} onChange={(v) => update('heuresSupp50', parseFloat(v) || undefined)} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Heures absence non payées (h)" value={data.heuresAbsenceNonPayees ?? ''} onChange={(v) => update('heuresAbsenceNonPayees', parseFloat(v) || undefined)} type="number" />
              <Field label="Jours ouvrés du mois" value={data.nombreJoursOuvres} onChange={(v) => update('nombreJoursOuvres', parseInt(v) || 0)} type="number" />
            </div>
          </Section>

          <Section id="primes" title="Primes & Gratifications" icon={Gift}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prime exceptionnelle (€)" value={data.primeExceptionnelle ?? ''} onChange={(v) => update('primeExceptionnelle', parseFloat(v) || undefined)} type="number" />
              <Field label="Prime 13e mois (€)" value={data.prime13Mois ?? ''} onChange={(v) => update('prime13Mois', parseFloat(v) || undefined)} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prime de performance (€)" value={data.primePerformance ?? ''} onChange={(v) => update('primePerformance', parseFloat(v) || undefined)} type="number" />
              <Field label="Prime d'ancienneté (€)" value={data.primeAnciennete ?? ''} onChange={(v) => update('primeAnciennete', parseFloat(v) || undefined)} type="number" />
            </div>
            <Field label="Autres primes (€)" value={data.autresPrimes ?? ''} onChange={(v) => update('autresPrimes', parseFloat(v) || undefined)} type="number" />
          </Section>

          <Section id="conges" title="Congés & Absences" icon={Plane}>
            <div className="grid grid-cols-3 gap-3">
              <Field label="CP acquis (j)" value={data.congesPayesAcquis ?? ''} onChange={(v) => update('congesPayesAcquis', parseFloat(v) || undefined)} type="number" />
              <Field label="CP pris (j)" value={data.congesPayesPris ?? ''} onChange={(v) => update('congesPayesPris', parseFloat(v) || undefined)} type="number" />
              <Field label="Solde CP (j)" value={data.congesPayesSolde ?? ''} onChange={(v) => update('congesPayesSolde', parseFloat(v) || undefined)} type="number" />
            </div>
            <Field label="Indemnité congés payés (€)" value={data.indemniteCongesPayes ?? ''} onChange={(v) => update('indemniteCongesPayes', parseFloat(v) || undefined)} type="number" />
          </Section>

          <Section id="maladie" title="Maladie & Arrêts de travail" icon={Activity}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Jours de maladie" value={data.joursMaladie ?? ''} onChange={(v) => update('joursMaladie', parseFloat(v) || undefined)} type="number" />
              <Field label="Jours d'absence non justifiée" value={data.joursAbsenceNonJustifiee ?? ''} onChange={(v) => update('joursAbsenceNonJustifiee', parseFloat(v) || undefined)} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="IJ Sécurité Sociale (€)" value={data.indemnitesJournalieresSS ?? ''} onChange={(v) => update('indemnitesJournalieresSS', parseFloat(v) || undefined)} type="number" />
              <Field label="Maintien salaire maladie (€)" value={data.maintienSalaireMaladie ?? ''} onChange={(v) => update('maintienSalaireMaladie', parseFloat(v) || undefined)} type="number" />
            </div>
          </Section>

          <Section id="avantages" title="Avantages sociaux & Mutuelle" icon={Heart}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mutuelle — Part employeur (€)" value={data.mutuellePartEmployeur ?? ''} onChange={(v) => update('mutuellePartEmployeur', parseFloat(v) || undefined)} type="number" />
              <Field label="Mutuelle — Part salarié (€)" value={data.mutuellePartSalarie ?? ''} onChange={(v) => update('mutuellePartSalarie', parseFloat(v) || undefined)} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prévoyance — Part employeur (€)" value={data.prevoyancePartEmployeur ?? ''} onChange={(v) => update('prevoyancePartEmployeur', parseFloat(v) || undefined)} type="number" />
              <Field label="Prévoyance — Part salarié (€)" value={data.prevoyancePartSalarie ?? ''} onChange={(v) => update('prevoyancePartSalarie', parseFloat(v) || undefined)} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tickets restaurant (nb)" value={data.ticketRestaurantNombre ?? ''} onChange={(v) => update('ticketRestaurantNombre', parseFloat(v) || undefined)} type="number" />
              <Field label="TR — Part employeur (€/ticket)" value={data.ticketRestaurantMontantEmployeur ?? ''} onChange={(v) => update('ticketRestaurantMontantEmployeur', parseFloat(v) || undefined)} type="number" />
            </div>
          </Section>

          <Section id="indemnites" title="Frais & Indemnités" icon={Truck}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Remboursement transport (€)" value={data.indemnitesTransport ?? ''} onChange={(v) => update('indemnitesTransport', parseFloat(v) || undefined)} type="number" />
              <Field label="Indemnité déplacement véhicule (€)" value={data.indemniteDeplacementVehicule ?? ''} onChange={(v) => update('indemniteDeplacementVehicule', parseFloat(v) || undefined)} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Avantages en nature — repas (€)" value={data.avantagesEnNatureNourriture ?? ''} onChange={(v) => update('avantagesEnNatureNourriture', parseFloat(v) || undefined)} type="number" />
              <Field label="Frais professionnels (€)" value={data.fraisProfessionnels ?? ''} onChange={(v) => update('fraisProfessionnels', parseFloat(v) || undefined)} type="number" />
            </div>
            <Field label="Autres indemnités (€)" value={data.autresIndemnites ?? ''} onChange={(v) => update('autresIndemnites', parseFloat(v) || undefined)} type="number" />
          </Section>

          <Section id="periode" title="Période & Contrat" icon={Calendar}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Début de période" value={data.periodeDebut} onChange={(v) => update('periodeDebut', v)} type="date" />
              <Field label="Fin de période" value={data.periodeFin} onChange={(v) => update('periodeFin', v)} type="date" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Type de contrat</label>
                <select value={data.typeContrat} onChange={(e) => update('typeContrat', e.target.value as any)} className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 focus:border-primary/50 outline-none">
                  <option value="cdd">CDD</option>
                  <option value="cdi">CDI</option>
                  <option value="apprentissage">Apprentissage</option>
                  <option value="professionnalisation">Professionnalisation</option>
                </select>
              </div>
              <Field label="Date de début du contrat" value={data.dateDebut} onChange={(v) => update('dateDebut', v)} type="date" />
            </div>
          </Section>

          <Section id="entreprise" title="Entreprise" icon={Building2}>
            <Field label="Raison sociale" value={data.raisonSociale} onChange={(v) => update('raisonSociale', v)} />
            <Field label="SIRET (14 chiffres)" value={data.siret} onChange={(v) => update('siret', v)} />
            <Field label="Adresse entreprise" value={data.adresseEntreprise} onChange={(v) => update('adresseEntreprise', v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Code postal" value={data.codePostalEntreprise} onChange={(v) => update('codePostalEntreprise', v)} />
              <Field label="Ville" value={data.villeEntreprise} onChange={(v) => update('villeEntreprise', v)} />
            </div>
            <Field label="URSSAF (SIRET)" value={data.urssaf} onChange={(v) => update('urssaf', v)} />
          </Section>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-white/10 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
          >
            Fermer
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => {
                const html = genererBulletinPaieHTML(data);
                const w = window.open('', '_blank');
                if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 250); }
              }}
              className="px-5 py-2.5 bg-gray-100 dark:bg-slate-700 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Imprimer
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {pdfLoading ? 'Génération...' : 'Télécharger PDF'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

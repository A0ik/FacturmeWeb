'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Download, Sparkles, Loader2, AlertCircle,
  User, Building2, Euro, Calendar, FileText, ChevronDown, ChevronUp,
  Heart, Gift, Plane, Activity, Clock, Truck, Utensils, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import type { BulletinPaieData } from '@/lib/labor-law/bulletin-paie';
import { genererBulletinPaieHTML } from '@/lib/labor-law/bulletin-paie';
import { getConventionConfig, CONVENTION_LABELS, type ConventionType, getTauxATOptions } from '@/lib/labor-law/conventions-collectives';

// ─── Module-level components (prevent remount on parent re-render = fixes focus bug) ───

const PayslipField = React.memo(function PayslipField({
  label, value, onChange, type = 'text', readOnly = false, step,
}: {
  label: string; value: string | number; onChange?: (v: string) => void; type?: string; readOnly?: boolean; step?: string;
}) {
  const safeValue = typeof value === 'number' && isNaN(value) ? '' : value;
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
      <input
        type={type}
        value={safeValue}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        step={step}
        className={`w-full px-3 py-2 text-sm rounded-xl border-2 outline-none transition-all
          ${readOnly
            ? 'bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-white/5 text-gray-500 cursor-not-allowed'
            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/20'
          }`}
      />
    </div>
  );
});

const PayslipSection = React.memo(function PayslipSection({
  id, title, icon: Icon, openSection, onToggle, children,
}: {
  id: string; title: string; icon: any; openSection: string; onToggle: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => onToggle(id)}
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
});

// ─── Main component ───────────────────────────────────────────────────────────

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

  const update = useCallback(<K extends keyof BulletinPaieData>(field: K, value: BulletinPaieData[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleToggle = useCallback((id: string) => {
    setOpenSection(prev => prev === id ? '' : id);
  }, []);

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
      const res = await fetch('/api/payslips/html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payslip: data }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur HTML');
      }
      const htmlContent = await res.text();
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        setTimeout(() => {
          newWindow.print();
        }, 500);
      } else {
        throw new Error('Impossible d\'ouvrir une nouvelle fenêtre. Veuillez autoriser les popups.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du téléchargement');
    } finally {
      setPdfLoading(false);
    }
  };

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
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
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

          {/* Sections */}
          <PayslipSection id="salarie" title="Salarié" icon={User} openSection={openSection} onToggle={handleToggle}>
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Nom" value={data.nom} onChange={(v) => update('nom', v)} />
              <PayslipField label="Prénom" value={data.prenom} onChange={(v) => update('prenom', v)} />
            </div>
            <PayslipField label="Adresse" value={data.adresse} onChange={(v) => update('adresse', v)} />
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Code postal" value={data.codePostal} onChange={(v) => update('codePostal', v)} />
              <PayslipField label="Ville" value={data.ville} onChange={(v) => update('ville', v)} />
            </div>
            <PayslipField label="NIR (Séc. Sociale — 15 chiffres)" value={data.nir} onChange={(v) => update('nir', v)} />
            <PayslipField label="Date de naissance" value={data.dateNaissance} onChange={(v) => update('dateNaissance', v)} type="date" />
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
              <PayslipField label="Enfants à charge" value={data.nombreEnfants} onChange={(v) => update('nombreEnfants', parseInt(v) || 0)} type="number" />
            </div>
          </PayslipSection>

          <PayslipSection id="salaire" title="Rémunération de base" icon={Euro} openSection={openSection} onToggle={handleToggle}>
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Salaire brut (€)" value={data.salaireBrut} onChange={(v) => update('salaireBrut', parseFloat(v) || 0)} type="number" />
              <PayslipField label="Salaire brut annuel (€)" value={data.salaireBrutAnnuel} onChange={(v) => update('salaireBrutAnnuel', parseFloat(v) || 0)} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Heures mensuelles" value={data.heuresMensuelles} onChange={(v) => update('heuresMensuelles', parseFloat(v) || 0)} type="number" />
              <PayslipField label="Taux horaire (€)" value={data.tauxHoraire ?? ''} onChange={(v) => update('tauxHoraire', parseFloat(v) || undefined)} type="number" />
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
              <PayslipField label="Classification / Poste" value={data.classification} onChange={(v) => update('classification', v)} />
            </div>
            <PayslipField label="Convention collective" value={data.conventionCollective} onChange={(v) => update('conventionCollective', v)} />
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Coefficient" value={data.coef} onChange={(v) => update('coef', parseFloat(v) || 0)} type="number" />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Temps partiel</label>
                <div className="flex items-center gap-3 pt-2">
                  <input type="checkbox" checked={!!data.tempsPartiel} onChange={(e) => update('tempsPartiel', e.target.checked)} className="w-4 h-4 accent-primary" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Temps partiel</span>
                  {data.tempsPartiel && <PayslipField label="%" value={data.pourcentageTempsPartiel ?? ''} onChange={(v) => update('pourcentageTempsPartiel', parseFloat(v) || undefined)} type="number" />}
                </div>
              </div>
            </div>
          </PayslipSection>

          <PayslipSection id="convention" title="Convention Collective & Config" icon={Settings} openSection={openSection} onToggle={handleToggle}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Convention Collective</label>
                <select
                  value={(data as any).conventionCollectiveId || 'default'}
                  onChange={(e) => {
                    const conventionId = e.target.value as ConventionType;
                    update('conventionCollectiveId' as any, conventionId);
                    const config = getConventionConfig(conventionId);
                    // Ne PAS écraser le taux AT si l'utilisateur en a déjà défini un
                    if (!(data as any).tauxAccidentTravail || (data as any).tauxAccidentTravail === 0.70) {
                      update('tauxAccidentTravail' as any, config.tauxAccidentTravail);
                    }
                    // Appliquer automatiquement la séparation Fillon (optionnel)
                    update('separationFillonUrssafRetraite' as any, config.reductionFillon?.separationUrssafRetraite || false);
                    // Mettre à jour le nom de la convention
                    update('conventionCollective', config.nom);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-xl border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 focus:border-primary/50 outline-none"
                >
                  {Object.entries(CONVENTION_LABELS).map(([id, label]) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between">
                    <span>Taux AT personnalisé (%)</span>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-normal">Modifiable</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={(data as any).tauxAccidentTravail ?? 0.70}
                      onChange={(e) => update('tauxAccidentTravail' as any, parseFloat(e.target.value) || 0.70)}
                      className="w-full px-3 py-2 text-sm rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 focus:border-amber-400 focus:ring-2 focus:ring-amber-200/30 outline-none transition-all font-semibold"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Valeur actuelle: <strong>{((data as any).tauxAccidentTravail ?? 0.70).toFixed(2)}%</strong>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    💡 Taux moyen: 0.70% | Restaurants: 1.20% | BTP: 2.50%
                  </div>
                </div>
                <div className="col-span-2 mt-2">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-primary hover:text-primary/80 font-medium mb-2">
                      📖 Voir tous les taux AT par secteur
                    </summary>
                    <div className="grid grid-cols-2 gap-2 mt-2 p-2 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
                      {getTauxATOptions().map((option) => (
                        <button
                          key={option.valeur}
                          type="button"
                          onClick={() => update('tauxAccidentTravail' as any, option.valeur)}
                          className={`text-left p-2 rounded-lg transition-all ${
                            (data as any).tauxAccidentTravail === option.valeur
                              ? 'bg-primary text-white'
                              : 'bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600'
                          }`}
                        >
                          <div className="font-semibold">{option.valeur.toFixed(2)}%</div>
                          <div className="text-xs opacity-80">{option.description}</div>
                          <div className="text-xs opacity-60">Ex: {option.exemple}</div>
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Séparer Fillon URSSAF/Retraite</label>
                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      checked={!!(data as any).separationFillonUrssafRetraite}
                      onChange={(e) => update('separationFillonUrssafRetraite' as any, e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Activer la séparation</span>
                  </div>
                  {(data as any).separationFillonUrssafRetraite && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      URSSAF: 85.9% | Retraite: 14.1%
                    </div>
                  )}
                </div>
              </div>

              {/* Paniers repas (visible si restaurants ou personnalisé) */}
              {(data as any).conventionCollectiveId === 'restaurants' || (data as any).paniersRepasNombre ? (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Utensils className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-semibold text-amber-900 dark:text-amber-100 text-sm">Paniers Repas</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <PayslipField
                      label="Nombre de paniers"
                      value={(data as any).paniersRepasNombre ?? ''}
                      onChange={(v) => update('paniersRepasNombre' as any, parseFloat(v) || undefined)}
                      type="number"
                    />
                    <PayslipField
                      label="Montant employeur/panier (€)"
                      value={(data as any).paniersRepasMontantEmployeur ?? ''}
                      onChange={(v) => {
                        const val = parseFloat(v) || undefined;
                        update('paniersRepasMontantEmployeur' as any, val);
                        // Recalculer le total
                        const nombre = (data as any).paniersRepasNombre || 0;
                        if (val && nombre) {
                          update('paniersRepasTotal' as any, val * nombre);
                        }
                      }}
                      type="number"
                      step="0.01"
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    Total: {((data as any).paniersRepasTotal || 0).toFixed(2)} €
                  </div>
                </div>
              ) : null}
            </div>
          </PayslipSection>

          <PayslipSection id="heures" title="Heures & Présence" icon={Clock} openSection={openSection} onToggle={handleToggle}>
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Heures supp. à 25% (h)" value={data.heuresSupp25 ?? ''} onChange={(v) => update('heuresSupp25', parseFloat(v) || undefined)} type="number" />
              <PayslipField label="Heures supp. à 50% (h)" value={data.heuresSupp50 ?? ''} onChange={(v) => update('heuresSupp50', parseFloat(v) || undefined)} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Heures absence non payées (h)" value={data.heuresAbsenceNonPayees ?? ''} onChange={(v) => update('heuresAbsenceNonPayees', parseFloat(v) || undefined)} type="number" />
              <PayslipField label="Jours ouvrés du mois" value={data.nombreJoursOuvres} onChange={(v) => update('nombreJoursOuvres', parseInt(v) || 0)} type="number" />
            </div>
          </PayslipSection>

          <PayslipSection id="primes" title="Primes & Gratifications" icon={Gift} openSection={openSection} onToggle={handleToggle}>
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Prime exceptionnelle (€)" value={data.primeExceptionnelle ?? ''} onChange={(v) => update('primeExceptionnelle', parseFloat(v) || undefined)} type="number" />
              <PayslipField label="Prime 13e mois (€)" value={data.prime13Mois ?? ''} onChange={(v) => update('prime13Mois', parseFloat(v) || undefined)} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Prime de performance (€)" value={data.primePerformance ?? ''} onChange={(v) => update('primePerformance', parseFloat(v) || undefined)} type="number" />
              <PayslipField label="Prime d'ancienneté (€)" value={data.primeAnciennete ?? ''} onChange={(v) => update('primeAnciennete', parseFloat(v) || undefined)} type="number" />
            </div>
            <PayslipField label="Autres primes (€)" value={data.autresPrimes ?? ''} onChange={(v) => update('autresPrimes', parseFloat(v) || undefined)} type="number" />
          </PayslipSection>

          <PayslipSection id="conges" title="Congés & Absences" icon={Plane} openSection={openSection} onToggle={handleToggle}>
            <div className="grid grid-cols-3 gap-3">
              <PayslipField label="CP acquis (j)" value={data.congesPayesAcquis ?? ''} onChange={(v) => update('congesPayesAcquis', parseFloat(v) || undefined)} type="number" />
              <PayslipField label="CP pris (j)" value={data.congesPayesPris ?? ''} onChange={(v) => update('congesPayesPris', parseFloat(v) || undefined)} type="number" />
              <PayslipField label="Solde CP (j)" value={data.congesPayesSolde ?? ''} onChange={(v) => update('congesPayesSolde', parseFloat(v) || undefined)} type="number" />
            </div>
            <PayslipField label="Indemnité congés payés (€)" value={data.indemniteCongesPayes ?? ''} onChange={(v) => update('indemniteCongesPayes', parseFloat(v) || undefined)} type="number" />
          </PayslipSection>

          <PayslipSection id="maladie" title="Maladie & Arrêts de travail" icon={Activity} openSection={openSection} onToggle={handleToggle}>
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Jours de maladie" value={data.joursMaladie ?? ''} onChange={(v) => update('joursMaladie', parseFloat(v) || undefined)} type="number" />
              <PayslipField label="Jours absence non justifiée" value={data.joursAbsenceNonJustifiee ?? ''} onChange={(v) => update('joursAbsenceNonJustifiee', parseFloat(v) || undefined)} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="IJ Sécurité Sociale (€)" value={data.indemnitesJournalieresSS ?? ''} onChange={(v) => update('indemnitesJournalieresSS', parseFloat(v) || undefined)} type="number" />
              <PayslipField label="Maintien salaire maladie (€)" value={data.maintienSalaireMaladie ?? ''} onChange={(v) => update('maintienSalaireMaladie', parseFloat(v) || undefined)} type="number" />
            </div>
          </PayslipSection>

          <PayslipSection id="avantages" title="Avantages sociaux & Mutuelle" icon={Heart} openSection={openSection} onToggle={handleToggle}>
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Mutuelle — Part employeur (€)" value={data.mutuellePartEmployeur ?? ''} onChange={(v) => update('mutuellePartEmployeur', parseFloat(v) || undefined)} type="number" />
              <PayslipField label="Mutuelle — Part salarié (€)" value={data.mutuellePartSalarie ?? ''} onChange={(v) => update('mutuellePartSalarie', parseFloat(v) || undefined)} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Prévoyance — Part employeur (€)" value={data.prevoyancePartEmployeur ?? ''} onChange={(v) => update('prevoyancePartEmployeur', parseFloat(v) || undefined)} type="number" />
              <PayslipField label="Prévoyance — Part salarié (€)" value={data.prevoyancePartSalarie ?? ''} onChange={(v) => update('prevoyancePartSalarie', parseFloat(v) || undefined)} type="number" />
            </div>
            <div className="border-t border-gray-200 dark:border-white/10 pt-3 mt-3">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Tickets Restaurant</div>
              <div className="grid grid-cols-2 gap-3">
                <PayslipField label="Tickets restaurant (nb)" value={data.ticketRestaurantNombre ?? ''} onChange={(v) => update('ticketRestaurantNombre', parseFloat(v) || undefined)} type="number" />
                <PayslipField label="TR — Part employeur (€/ticket)" value={data.ticketRestaurantMontantEmployeur ?? ''} onChange={(v) => update('ticketRestaurantMontantEmployeur', parseFloat(v) || undefined)} type="number" />
              </div>
            </div>
            {(data as any).paniersRepasNombre && (
              <div className="border-t border-gray-200 dark:border-white/10 pt-3 mt-3">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                  <Utensils className="w-4 h-4" />
                  Paniers Repas
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <PayslipField label="Nombre" value={(data as any).paniersRepasNombre ?? ''} onChange={(v) => update('paniersRepasNombre' as any, parseFloat(v) || undefined)} type="number" />
                  <PayslipField label="Part employeur/panier (€)" value={(data as any).paniersRepasMontantEmployeur ?? ''} onChange={(v) => {
                    const val = parseFloat(v) || undefined;
                    update('paniersRepasMontantEmployeur' as any, val);
                    const nombre = (data as any).paniersRepasNombre || 0;
                    if (val && nombre) {
                      update('paniersRepasTotal' as any, val * nombre);
                    }
                  }} type="number" step="0.01" />
                  <PayslipField label="Total (€)" value={(data as any).paniersRepasTotal ?? ''} readOnly type="number" />
                </div>
              </div>
            )}
          </PayslipSection>

          <PayslipSection id="indemnites" title="Frais & Indemnités" icon={Truck} openSection={openSection} onToggle={handleToggle}>
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Remboursement transport (€)" value={data.indemnitesTransport ?? ''} onChange={(v) => update('indemnitesTransport', parseFloat(v) || undefined)} type="number" />
              <PayslipField label="Indemnité déplacement véhicule (€)" value={data.indemniteDeplacementVehicule ?? ''} onChange={(v) => update('indemniteDeplacementVehicule', parseFloat(v) || undefined)} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Avantages en nature — repas (€)" value={data.avantagesEnNatureNourriture ?? ''} onChange={(v) => update('avantagesEnNatureNourriture', parseFloat(v) || undefined)} type="number" />
              <PayslipField label="Frais professionnels (€)" value={data.fraisProfessionnels ?? ''} onChange={(v) => update('fraisProfessionnels', parseFloat(v) || undefined)} type="number" />
            </div>
            <PayslipField label="Autres indemnités (€)" value={data.autresIndemnites ?? ''} onChange={(v) => update('autresIndemnites', parseFloat(v) || undefined)} type="number" />
          </PayslipSection>

          <PayslipSection id="periode" title="Période & Contrat" icon={Calendar} openSection={openSection} onToggle={handleToggle}>
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Début de période" value={data.periodeDebut} onChange={(v) => update('periodeDebut', v)} type="date" />
              <PayslipField label="Fin de période" value={data.periodeFin} onChange={(v) => update('periodeFin', v)} type="date" />
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
              <PayslipField label="Date de début du contrat" value={data.dateDebut} onChange={(v) => update('dateDebut', v)} type="date" />
            </div>
          </PayslipSection>

          <PayslipSection id="entreprise" title="Entreprise" icon={Building2} openSection={openSection} onToggle={handleToggle}>
            <PayslipField label="Raison sociale" value={data.raisonSociale} onChange={(v) => update('raisonSociale', v)} />
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="SIRET (14 chiffres)" value={data.siret} onChange={(v) => update('siret', v)} />
              <PayslipField label="Code APE/NAF" value={(data as any).codeAPE ?? ''} onChange={(v) => update('codeAPE' as any, v || undefined)} />
            </div>
            <PayslipField label="Adresse entreprise" value={data.adresseEntreprise} onChange={(v) => update('adresseEntreprise', v)} />
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Code postal" value={data.codePostalEntreprise} onChange={(v) => update('codePostalEntreprise', v)} />
              <PayslipField label="Ville" value={data.villeEntreprise} onChange={(v) => update('villeEntreprise', v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="URSSAF (SIRET)" value={data.urssaf} onChange={(v) => update('urssaf', v)} />
              <PayslipField label="Date de paiement" value={(data as any).datePaiement ?? ''} onChange={(v) => update('datePaiement' as any, v || undefined)} type="date" />
            </div>
          </PayslipSection>

          <PayslipSection id="cumuls" title="Cumuls annuels & PAS (obligatoires)" icon={Euro} openSection={openSection} onToggle={handleToggle}>
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Cumul salaire brut annuel (€)" value={(data as any).cumulsAnnuelsBrut ?? data.salaireBrutAnnuel ?? ''} onChange={(v) => update('cumulsAnnuelsBrut' as any, parseFloat(v) || undefined)} type="number" />
              <PayslipField label="Cumul net annuel (€)" value={(data as any).cumulsAnnuelsNet ?? ''} onChange={(v) => update('cumulsAnnuelsNet' as any, parseFloat(v) || undefined)} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PayslipField label="Taux PAS (%)" value={(data as any).tauxPAS ?? ''} onChange={(v) => update('tauxPAS' as any, parseFloat(v) || undefined)} type="number" />
              <PayslipField label="Montant PAS prélevé (€)" value={(data as any).montantPAS ?? ''} onChange={(v) => update('montantPAS' as any, parseFloat(v) || undefined)} type="number" />
            </div>
          </PayslipSection>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-slate-800/50">
          <button onClick={onClose} className="px-5 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-white/10 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors">
            Fermer
          </button>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/payslips/html', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payslip: data }),
                  });
                  if (!res.ok) throw new Error('Erreur génération HTML');
                  const html = await res.text();
                  const w = window.open('', '_blank');
                  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 250); }
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Erreur lors de la génération');
                }
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

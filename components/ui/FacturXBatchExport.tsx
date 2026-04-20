'use client';

import { useState } from 'react';
import { Download, Loader2, FileText, CheckCircle, XCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Invoice {
  id: string;
  number: string;
  document_type: string;
}

interface FacturXBatchExportProps {
  selectedInvoices: Invoice[];
  onClear?: () => void;
  className?: string;
  variant?: 'button' | 'card';
}

/**
 * FacturXBatchExport - Export en masse Factur-X
 *
 * Permet d'exporter plusieurs factures au format Factur-X dans un fichier ZIP
 *
 * @param selectedInvoices - Factures sélectionnées pour l'export
 * @param onClear - Callback pour vider la sélection après export
 * @param className - Classes CSS additionnelles
 * @param variant - 'button' (bouton simple) ou 'card' (carte avec détails)
 */
export function FacturXBatchExport({
  selectedInvoices,
  onClear,
  className,
  variant = 'button',
}: FacturXBatchExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Filtrer uniquement les factures (pas devis/avoirs)
  const eligibleInvoices = selectedInvoices.filter(inv => inv.document_type === 'invoice');
  const eligibleCount = eligibleInvoices.length;
  const totalCount = selectedInvoices.length;

  // Calculer les inéligibles
  const ineligibleCount = totalCount - eligibleCount;

  const handleExport = async () => {
    if (eligibleCount === 0 || isExporting) return;

    setIsExporting(true);
    setProgress(0);

    try {
      const invoiceIds = eligibleInvoices.map(inv => inv.id);

      const response = await fetch('/api/export/facturx/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceIds }),
      });

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        clearInterval(progressInterval);

        if (response.status === 403) {
          toast.error('Fonctionnalité réservée aux abonnements Pro et Business', {
            description: 'L\'export en masse Factur-X nécessite un abonnement supérieur.',
            action: {
              label: 'Voir les plans',
              onClick: () => (window.location.href = '/paywall'),
            },
          });
          return;
        }

        throw new Error(error.error || error.details || 'Erreur lors de l\'export');
      }

      // Télécharger le ZIP
      const blob = await response.blob();
      clearInterval(progressInterval);
      setProgress(100);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facturx-export-${new Date().toISOString().slice(0, 10)}.zip`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);

      // Récupérer les stats
      const successCount = response.headers.get('X-FacturX-Success');
      const failureCount = response.headers.get('X-FacturX-Failure');

      toast.success('Export Factur-X terminé !', {
        description: `${successCount || eligibleCount} facture(s) exportée(s) avec succès${failureCount && parseInt(failureCount) > 0 ? `, ${failureCount} échec(s)` : ''}.`,
        duration: 5000,
      });

      // Vider la sélection si demandé
      if (onClear) {
        onClear();
      }

    } catch (error) {
      console.error('[FacturXBatchExport] Erreur:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors de l\'export en masse',
        {
          description: 'Vérifiez que les factures contiennent toutes les informations requises.',
          duration: 8000,
        }
      );
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  };

  // Variant button - Bouton simple
  if (variant === 'button') {
    return (
      <button
        onClick={handleExport}
        disabled={eligibleCount === 0 || isExporting}
        className={cn(
          'group relative overflow-hidden',
          'flex items-center justify-center gap-2.5',
          'px-5 py-3 rounded-2xl',
          'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600',
          'bg-[length:200%_100%]',
          'hover:bg-[position:100%_0]',
          'hover:shadow-lg hover:shadow-indigo-500/25',
          'text-white font-bold text-sm',
          'transition-all duration-500',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[position:0%_0]',
          className
        )}
      >
        {/* Background animation */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

        {/* Icon */}
        {isExporting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>{progress > 0 ? `${progress}%` : 'Génération...'}</span>
          </>
        ) : (
          <>
            <FileText size={18} />
            <span>Factur-X ({eligibleCount})</span>
          </>
        )}

        {/* Badge si inéligibles */}
        {ineligibleCount > 0 && !isExporting && (
          <span className="relative hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
            +{ineligibleCount} exclu(s)
          </span>
        )}
      </button>
    );
  }

  // Variant card - Carte avec détails
  return (
    <div className={cn(
      'bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6',
      className
    )}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Export Factur-X</h3>
            <p className="text-sm text-gray-600">
              Export en masse au format EN 16931
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle size={16} className="text-emerald-500" />
            <span className="text-xs font-bold text-gray-500">Éligibles</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{eligibleCount}</p>
          <p className="text-xs text-gray-400">facture(s)</p>
        </div>
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={16} className={ineligibleCount > 0 ? 'text-red-500' : 'text-gray-300'} />
            <span className="text-xs font-bold text-gray-500">Exclus</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{ineligibleCount}</p>
          <p className="text-xs text-gray-400">devis/avoirs</p>
        </div>
      </div>

      {/* Progress bar */}
      {isExporting && (
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">{progress}%</p>
        </div>
      )}

      {/* Info message si inéligibles */}
      {ineligibleCount > 0 && !isExporting && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
          <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            <span className="font-bold">Note :</span> Les devis et avoirs ne sont pas inclus dans l'export Factur-X.
            Seules les factures sont concernées.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleExport}
          disabled={eligibleCount === 0 || isExporting}
          className={cn(
            'flex-1 flex items-center justify-center gap-2',
            'px-4 py-3 rounded-xl',
            'bg-gradient-to-r from-indigo-600 to-purple-600',
            'text-white font-bold text-sm',
            'hover:opacity-90 transition-opacity',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isExporting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>{progress > 0 ? `${progress}%` : 'Génération...'}</span>
            </>
          ) : (
            <>
              <Download size={18} />
              <span>Télécharger le ZIP</span>
            </>
          )}
        </button>

        {onClear && eligibleCount > 0 && !isExporting && (
          <button
            onClick={onClear}
            className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-sm transition-colors"
          >
            Annuler
          </button>
        )}
      </div>

      {/* Help link */}
      <a
        href="/help/factur-x"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 text-xs text-indigo-600 hover:underline block text-center"
      >
        En savoir plus sur Factur-X →
      </a>
    </div>
  );
}

/**
 * FacturXBatchInfoBadge - Badge d'information pour l'export en masse
 */
export function FacturXBatchInfoBadge({
  selectedCount,
  eligibleCount,
}: {
  selectedCount: number;
  eligibleCount: number;
}) {
  const ineligibleCount = selectedCount - eligibleCount;

  if (eligibleCount === 0) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 text-sm">
      <FileText size={14} className="text-indigo-500" />
      <span className="font-semibold text-indigo-700">
        {eligibleCount} facture(s) éligible(s)
      </span>
      {ineligibleCount > 0 && (
        <span className="text-gray-400">
          (+{ineligibleCount} autre(s))
        </span>
      )}
    </div>
  );
}

export default FacturXBatchExport;

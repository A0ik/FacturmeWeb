'use client';

import { useState } from 'react';
import { Download, FileText, Loader2, Sparkles, Info, HelpCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FacturXButtonProps {
  invoiceId: string;
  invoiceNumber: string;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'compact';
  warnings?: string[];
}

/**
 * FacturXButton - Bouton de téléchargement Factur-X
 *
 * Format de facture électronique conforme à la réforme française 2026+
 * Profil EN 16931 (ZUGFeRD 2.2)
 *
 * @see https://fnfe-mpe.org/factur-x/
 */
export function FacturXButton({
  invoiceId,
  invoiceNumber,
  disabled = false,
  className,
  variant = 'primary',
  warnings = [],
}: FacturXButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleDownload = async () => {
    // Afficher la modal de confirmation s'il y a des avertissements
    if (warnings && warnings.length > 0) {
      setShowConfirmModal(true);
      return;
    }

    // Pas d'avertissements, télécharger directement
    performDownload();
  };

  const performDownload = async () => {
    setIsDownloading(true);
    setShowConfirmModal(false);
    try {
      console.log('[FacturXButton] Téléchargement Factur-X pour facture:', invoiceId);

      const response = await fetch(`/api/download/facturx/${invoiceId}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error('[FacturXButton] Erreur réponse:', error);

        if (response.status === 403) {
          // Besoin d'upgrade
          toast.error('Fonctionnalité réservée aux abonnements Pro et Business', {
            description: 'Le format Factur-X nécessite un abonnement supérieur.',
            action: {
              label: 'Voir les plans',
              onClick: () => (window.location.href = '/paywall'),
            },
          });
          return;
        }
        throw new Error(error.error || error.details || 'Erreur lors de la génération Factur-X');
      }

      // Vérifier que le contenu est bien un PDF
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/pdf')) {
        console.error('[FacturXButton] Type de contenu invalide:', contentType);
        throw new Error('Le serveur n\'a pas retourné un fichier PDF valide');
      }

      // Télécharger le PDF
      const blob = await response.blob();
      console.log('[FacturXButton] Blob reçu, taille:', blob.size, 'octets');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber.replace(/\//g, '-')}-facturx.pdf`;
      a.style.display = 'none';
      document.body.appendChild(a);

      // Trigger le téléchargement
      a.click();

      // Nettoyage
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      toast.success('Facture Factur-X téléchargée !', {
        description: 'PDF conforme au profil EN 16931 (réforme 2026+)',
        duration: 5000,
      });

    } catch (error) {
      console.error('[FacturXButton] Erreur téléchargement Factur-X:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors du téléchargement',
        {
          description: 'Vérifiez que la facture contient toutes les informations requises.',
          duration: 8000,
        }
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // Variant primary - Bouton principal mis en avant
  let buttonElement: React.ReactNode = null;

  if (variant === 'primary') {
    buttonElement = (
      <button
        onClick={handleDownload}
        disabled={disabled || isDownloading}
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
        {isDownloading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <div className="relative">
            <FileText size={18} />
            <Sparkles size={10} className="absolute -top-1 -right-1 text-yellow-300" />
          </div>
        )}

        {/* Text */}
        <span className="relative">
          {isDownloading ? 'Génération...' : 'Factur-X'}
        </span>

        {/* Badge "Conforme" */}
        <span className="relative hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
          EN 16931
        </span>
      </button>
    );
  }

  // Variant secondary - Bouton secondaire avec icône
  else if (variant === 'secondary') {
    buttonElement = (
      <button
        onClick={handleDownload}
        disabled={disabled || isDownloading}
        className={cn(
          'group relative',
          'flex items-center gap-2',
          'px-4 py-2.5 rounded-xl',
          'bg-gradient-to-br from-indigo-50 to-purple-50',
          'border-2 border-indigo-100',
          'hover:border-indigo-300 hover:shadow-md',
          'text-indigo-700 font-semibold text-sm',
          'transition-all duration-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
      >
        {isDownloading ? (
          <Loader2 size={16} className="animate-spin text-indigo-500" />
        ) : (
          <FileText size={16} className="text-indigo-500" />
        )}
        <span>Factur-X</span>
        {!isDownloading && (
          <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
            EN 16931
          </span>
        )}
      </button>
    );
  }

  // Variant compact - Version compacte pour menus déroulants
  else {
    buttonElement = (
    <button
      onClick={handleDownload}
      disabled={disabled || isDownloading}
      className={cn(
        'group relative flex items-center gap-3 w-full px-4 py-3 text-sm',
        'text-indigo-700 hover:bg-indigo-50',
        'transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      {isDownloading ? (
        <Loader2 size={16} className="animate-spin text-indigo-500" />
      ) : (
        <FileText size={16} className="text-indigo-500" />
      )}
      <div className="flex-1 text-left">
        <div className="font-semibold">Télécharger Factur-X</div>
        <div className="text-xs text-gray-400">Format EN 16931 (réforme 2026+)</div>
      </div>
    </button>
    );
  }

  // Return final du composant
  return (
    <>
      {buttonElement}

      {/* Modal de confirmation avec avertissements */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-indigo-600" />
              </div>
              <h2 className="text-xl font-black text-gray-900">Avertissements Factur-X</h2>
              <p className="text-sm text-gray-500 mt-2">
                Certains champs recommandés pour la conformité Factur-X sont manquants.
              </p>
            </div>

            {warnings && warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <h3 className="text-sm font-bold text-amber-800">Champs manquants ou non conformes :</h3>
                </div>
                <ul className="space-y-1.5">
                  {warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm text-amber-700 flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Note :</strong> Le PDF sera généré mais pourrait ne pas être 100% conforme au standard Factur-X. Pour une conformité optimale, ajoutez les informations manquantes.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={performDownload}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold hover:opacity-90 transition-all"
              >
                <Download size={16} />
                Télécharger quand même
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * FacturXInfoBadge - Badge d'information Factur-X
 */
export function FacturXInfoBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100',
        className
      )}
    >
      <Sparkles size={12} className="text-indigo-500" />
      <span className="text-xs font-semibold text-indigo-700">Factur-X</span>
      <span className="hidden sm:inline text-xs text-gray-500">• EN 16931</span>
    </div>
  );
}

/**
 * FacturXInfoTooltip - Tooltip d'information Factur-X
 */
export function FacturXInfoTooltip({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-2 text-xs text-gray-500', className)}>
      <Info size={14} className="flex-shrink-0 mt-0.5 text-indigo-400" />
      <div className="space-y-0.5">
        <p className="font-medium text-gray-700">Qu'est-ce que Factur-X ?</p>
        <p>
          Format de facture électronique hybride (PDF + XML) conforme à la{' '}
          <span className="font-semibold text-indigo-600">réforme 2026+</span>.
        </p>
        <a
          href="https://fnfe-mpe.org/factur-x/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:underline"
        >
          En savoir plus →
        </a>
      </div>
    </div>
  );
}

export default FacturXButton;

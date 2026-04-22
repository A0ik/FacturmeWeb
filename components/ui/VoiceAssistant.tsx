'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Sparkles, X, Check, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VoiceAssistantProps {
  onResult: (data: VoiceAnalysisResult) => void;
  onClose: () => void;
  isPro: boolean;
  mode: 'product' | 'recurring';
}

export interface VoiceAnalysisResult {
  name?: string;
  description?: string;
  reference?: string;
  price?: number;
  quantity?: number;
  vatRate?: number;
  unit?: string;
  client?: string;
  frequency?: string;
  notes?: string;
  startDate?: string; // Pour les récurrentes: date de première génération
}

export function VoiceAssistant({ onResult, onClose, isPro, mode }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognizedData, setRecognizedData] = useState<VoiceAnalysisResult>({});
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || !isPro) return;

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'fr-FR';

    recognitionRef.current.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        setTranscript(interimTranscript);
        // Analyse en temps réel
        analyzeVoice(interimTranscript);
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        analyzeVoice(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Accès au micro refusé. Veuillez autoriser l\'accès.');
      } else {
        toast.error('Erreur de reconnaissance vocale');
      }
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isPro]);

  const startListening = () => {
    if (!isPro) {
      toast.error('La reconnaissance vocale est disponible avec les abonnements Pro et Business');
      return;
    }
    if (recognitionRef.current) {
      setTranscript('');
      setRecognizedData({});
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const analyzeVoice = (text: string) => {
    const lowerText = text.toLowerCase();

    const result: VoiceAnalysisResult = {};

    // Extraction du prix (patterns améliorés)
    const pricePatterns = [
      /(\d+[\s,]*(?:euros?|€|eur))\b/i,
      /(\d+[\s,]*\.\d+[\s,]*(?:euros?|€|eur))\b/i,
      /(\d+)[\s,]*(?:euros?|€|eur)\b/i,
      /prix\s*[:=]\s*(\d+(?:[\s,]*\d+)?)\s*(?:euros?|€|eur)?/i,
      /coût\s*[:=]\s*(\d+(?:[\s,]*\d+)?)\s*(?:euros?|€|eur)?/i,
      /(\d+)\s*(?:euros?|€|eur)\s*ht/i,
    ];

    for (const pattern of pricePatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        const priceStr = match[1].replace(/[\s,]/g, '').replace(',', '.');
        result.price = parseFloat(priceStr);
        break;
      }
    }

    // Extraction de l'unité (patterns améliorés)
    const unitPatterns = [
      { pattern: /(?:à\s*)?l['']?heure|par\s*heure|heure|heures?/i, value: 'hour' },
      { pattern: /(?:par\s*)?jour|journalier|jours?/i, value: 'day' },
      { pattern: /(?:par\s*)?mois|mensuel|mois/i, value: 'month' },
      { pattern: /kilogramme|kg|kilo(?:gramme)?s?/i, value: 'kg' },
      { pattern: /kilomètre|km|kilo(?:mètre)?s?/i, value: 'km' },
      { pattern: /forfait|forfaits?/i, value: 'forfait' },
      { pattern: /unité|unit|pièce?/i, value: 'unit' },
    ];

    for (const { pattern, value } of unitPatterns) {
      if (pattern.test(text)) {
        result.unit = value;
        break;
      }
    }

    // Extraction de la quantité
    const quantityPatterns = [
      /(\d+)\s*(?:unités?|units?|pièces?|articles?|exemplaires?)\b/i,
      /quantité\s*[:=]\s*(\d+)/i,
      /(\d+)\s*(?:exemplaires|copies|instances)/i,
    ];

    for (const pattern of quantityPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.quantity = parseInt(match[1]);
        break;
      }
    }

    // Extraction de la TVA (patterns améliorés)
    const tvaPatterns = [
      /(\d+\.?\d*)\s*%\s*(?:tva|de\s*tva)/i,
      /tva\s*[:=]\s*(\d+\.?\d*)/i,
      /tva\s*(\d+\.?\d*)/i,
    ];

    for (const pattern of tvaPatterns) {
      const match = text.match(pattern);
      if (match) {
        const tva = parseFloat(match[1]);
        if ([0, 2.1, 5.5, 10, 20].includes(tva)) {
          result.vatRate = tva;
          break;
        }
      }
    }

    // Si prix détecté mais pas de TVA, auto-déduire selon le prix
    if (result.price && !result.vatRate) {
      if (result.price < 1000) {
        result.vatRate = 20; // TVA standard
      } else {
        result.vatRate = 20; // Toujours 20% par défaut
      }
    }

    // Extraction de la référence
    const refPatterns = [
      /réf\s*[:=]\s*([a-zA-Z0-9-]+)/i,
      /référence\s*[:=]\s*([a-zA-Z0-9-]+)/i,
      /ref\s*[:=]\s*([a-zA-Z0-9-]+)/i,
      /(?:article|produit)\s*([a-zA-Z0-9-]+)\s*(?:à|pour)/i,
    ];

    for (const pattern of refPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.reference = match[1].toUpperCase();
        break;
      }
    }

    // Extraction de la fréquence (pour les récurrentes)
    if (mode === 'recurring') {
      const freqPatterns = [
        { pattern: /hebdomadaire|chaque\s*semaine|toutes?\s*les\s*semaines/i, value: 'hebdomadaire' },
        { pattern: /mensuel|tous?\s*les\s*mois|chaque\s*mois/i, value: 'mensuel' },
        { pattern: /trimestrielle?|tous?\s*les\s*3\s*mois|tous?\s*les?\s*trimestres/i, value: 'trimestrielle' },
        { pattern: /annuel|chaque\s*année|tous?\s*les\s*ans/i, value: 'annuelle' },
      ];

      for (const { pattern, value } of freqPatterns) {
        if (pattern.test(text)) {
          result.frequency = value;
          break;
        }
      }
    }

    // Extraction du client (pour les récurrentes)
    if (mode === 'recurring') {
      const clientPatterns = [
        /client\s*[:=]\s*([^\s,]+(?:\s+[^\s,]+)*)/i,
        /pour\s+([^\s,]+(?:\s+[^\s,]+)*)/i,
      ];

      for (const pattern of clientPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const clientName = match[1].trim();
          const excludedWords = ['le', 'la', 'un', 'une', 'les', 'des', 'mes', 'ses', 'cette', 'ce', 'cet', 'mon', 'ton', 'son'];
          if (!excludedWords.includes(clientName.toLowerCase())) {
            result.client = clientName;
            break;
          }
        }
      }
    }

    // Extraction de la date de première génération (pour les récurrentes)
    if (mode === 'recurring') {
      const datePatterns = [
        /(?:commencer?|départ|début|première?\s*génération)\s*(?:le\s*)?((?:\d{1,4})[-/](?:\d{1,2})[-/](?:\d{1,4})|(?:\d{1,2})[-/](?:\d{1,2})[-/](?:\d{2,4}))/i,
        /à\s*partir\s*du\s*((?:\d{1,4})[-/](?:\d{1,2})[-/](?:\d{1,4})|(?:\d{1,2})[-/](?:\d{1,2})[-/](?:\d{2,4}))/i,
        /le\s*((?:\d{1,2})[/\-](?:\d{1,2})[/\-](?:\d{2,4}))/i,
      ];

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          // Normaliser la date au format YYYY-MM-DD
          const dateStr = match[1].replace(/\//g, '-');
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            // Déterminer le format (DD-MM-YYYY ou MM-DD-YYYY ou YYYY-MM-DD)
            let year: string, month: string, day: string;
            if (parts[0].length === 4) {
              [year, month, day] = parts;
            } else if (parseInt(parts[0]) > 31) {
              [month, day, year] = parts;
            } else {
              [day, month, year] = parts;
            }
            // S'assurer que l'année a 4 chiffres
            if (year.length === 2) {
              year = '20' + year;
            }
            result.startDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            break;
          }
        }
      }
    }

    // Extraction du nom (ce qui reste)
    let workingText = text;

    // Retirer les patterns déjà extraits
    workingText = workingText.replace(/réf\s*[:=]\s*[a-zA-Z0-9-]+/gi, '');
    workingText = workingText.replace(/référence\s*[:=]\s*[a-zA-Z0-9-]+/gi, '');
    workingText = workingText.replace(/client\s*[:=]\s*[^\s]+(?:\s+[^\s]+)*/gi, '');
    workingText = workingText.replace(/pour\s+[^\s]+(?:\s+[^\s]+)*/gi, '');
    workingText = workingText.replace(pricePatterns[0], '');
    workingText = workingText.replace(pricePatterns[1], '');
    workingText = workingText.replace(pricePatterns[2], '');
    workingText = workingText.replace(/quantité\s*[:=]\s*\d+/gi, '');
    workingText = workingText.replace(/\d+\.?\d*\s*%\s*(?:tva|de\s*tva)/gi, '');
    workingText = workingText.replace(/ajouter\s*(?:un|une|le|la)?/gi, '');
    workingText = workingText.replace(/créer\s*(?:un|une|le|la)?/gi, '');
    workingText = workingText.replace(/facture\s*récurrente/gi, '');
    workingText = workingText.replace(/pour\s*le\s*client/gi, '');

    // Nettoyer
    workingText = workingText.trim()
      .replace(/^[,\s]+/, '')
      .replace(/[,\s]+$/, '')
      .substring(0, 100); // Max 100 caractères pour le nom

    if (workingText && workingText.length > 2) {
      // Mettre la première lettre en majuscule
      result.name = workingText.charAt(0).toUpperCase() + workingText.slice(1).toLowerCase();
    }

    setRecognizedData(result);
  };

  const handleConfirm = () => {
    if (recognizedData.name || recognizedData.price) {
      onResult(recognizedData);
      onClose();
    } else {
      toast.error('Aucune information reconnue. Veuillez réessayer.');
    }
  };

  const isSupported = typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  if (!isSupported) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">La reconnaissance vocale n'est pas supportée par ce navigateur.</p>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
          <Sparkles size={32} className="text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Disponible avec Pro
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          L'assistant vocal est disponible avec les abonnements Pro et Business
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Fermer
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            {isListening ? (
              <Mic size={24} className="text-white animate-pulse" />
            ) : (
              <Mic size={24} className="text-white" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {isListening ? 'Je vous écoute...' : 'Assistant vocal'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isListening ? 'Décrivez votre article...' : 'Cliquez pour commencer'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5">
          <X size={20} className="text-gray-500" />
        </button>
      </div>

      {/* Voice input */}
      <div className="mb-6">
        <div className={cn(
          'relative min-h-[120px] rounded-2xl border-2 p-4 transition-all duration-300',
          isListening
            ? 'border-primary bg-gradient-to-br from-primary/10 to-purple-600/10 animate-pulse'
            : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-slate-800/50'
        )}>
          {transcript && (
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce mt-2" />
              <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 italic">
                "{transcript}"
              </p>
            </div>
          )}
          {!transcript && !isListening && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
              {mode === 'product'
                ? 'Décrivez : "Ajouter un site web 500 euros HT"'
                : 'Décrivez : "Créer une facture mensuelle pour client Dupont à 1000€"'
              }
            </p>
          )}
        </div>
      </div>

      {/* Recognized data */}
      {Object.keys(recognizedData).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800"
        >
          <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide mb-3">
            Informations reconnues
          </p>
          <div className="space-y-2">
            {recognizedData.name && (
              <div className="flex items-center gap-2 text-sm">
                <Check size={16} className="text-green-600" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Nom:</strong> {recognizedData.name}
                </span>
              </div>
            )}
            {recognizedData.price && (
              <div className="flex items-center gap-2 text-sm">
                <Check size={16} className="text-green-600" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Prix:</strong> {recognizedData.price}€
                </span>
              </div>
            )}
            {recognizedData.vatRate && (
              <div className="flex items-center gap-2 text-sm">
                <Check size={16} className="text-green-600" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>TVA:</strong> {recognizedData.vatRate}%
                </span>
              </div>
            )}
            {recognizedData.quantity && (
              <div className="flex items-center gap-2 text-sm">
                <Check size={16} className="text-green-600" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Quantité:</strong> {recognizedData.quantity}
                </span>
              </div>
            )}
            {recognizedData.reference && (
              <div className="flex items-center gap-2 text-sm">
                <Check size={16} className="text-green-600" />
                <span className="text-gray-700 dark:text-gray-300">
                  <strong>Réf:</strong> {recognizedData.reference}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!isListening ? (
          <button
            onClick={startListening}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Mic size={20} />
            Commencer
          </button>
        ) : (
          <button
            onClick={stopListening}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <MicOff size={20} />
            Arrêter
          </button>
        )}

        {Object.keys(recognizedData).length > 0 && (
          <button
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Check size={20} />
            Confirmer
          </button>
        )}
      </div>

      {/* Tips */}
      <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>💡 Astuces:</strong> Dites{" "}
          <span className="italic">"Ajouter un site vitrine 850 euros HT"</span> ou{" "}
          <span className="italic">"Créer une facture mensuelle pour Martin à 2000€"</span>
        </p>
      </div>
    </div>
  );
}

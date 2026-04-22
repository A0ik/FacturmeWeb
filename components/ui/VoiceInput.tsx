'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  variant?: 'button' | 'inline';
  language?: string;
  isPro?: boolean;
}

export function VoiceInput({
  onTranscript,
  placeholder = 'Parlez pour dicter...',
  disabled = false,
  className,
  variant = 'button',
  language = 'fr-FR',
  isPro = true,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Vérifier si l'API Web Speech est disponible
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
        return;
      }

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language;

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

        setTranscript(interimTranscript || finalTranscript);
      };

      recognitionRef.current.onend = () => {
        if (transcript) {
          onTranscript(transcript);
          setTranscript('');
        }
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, onTranscript]);

  const toggleListening = () => {
    if (!isSupported || !isPro) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  if (!isSupported) {
    return null;
  }

  if (!isPro) {
    return (
      <div className="relative group">
        <button
          disabled
          className={cn(
            "relative flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
            "bg-gradient-to-r from-gray-200 to-gray-300 text-gray-500 cursor-not-allowed",
            className
          )}
          title="Disponible avec les abonnements Pro et Business"
        >
          <Mic size={16} />
          <span>Voice</span>
        </button>
        {/* Upgrade tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            <span className="flex items-center gap-1">
              <Sparkles size={10} />
              Disponible avec Pro
            </span>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="border-4 border-transparent border-t-purple-600" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="relative">
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute -top-16 left-0 right-0 z-50 bg-gradient-to-r from-primary/10 to-purple-600/10 backdrop-blur-xl border border-primary/30 rounded-2xl p-4 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-purple-600 flex items-center justify-center">
                    <Mic size={18} className="text-white animate-pulse" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-purple-600 animate-ping opacity-30" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 font-medium">Écoute en cours...</p>
                  <p className="text-sm font-semibold text-gray-900">{transcript || placeholder}</p>
                </div>
                <button
                  onClick={toggleListening}
                  className="p-2 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <MicOff size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={toggleListening}
        disabled={disabled || !isPro}
        className={cn(
          'relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300',
          'hover:shadow-lg active:scale-95',
          isListening
            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-300'
            : isPro
            ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-primary/30 hover:shadow-primary/50'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed',
          (!isPro || disabled) && 'cursor-not-allowed hover:shadow-none active:scale-100',
          className
        )}
        title={!isPro ? 'Disponible avec Pro' : isListening ? 'Arrêter l\'écoute' : 'Dicter par voix'}
      >
        {isListening ? (
          <>
            <div className="relative">
              <MicOff size={16} className="animate-pulse" />
              <div className="absolute inset-0 bg-white/30 rounded-full animate-ping" />
            </div>
            <span className="hidden sm:inline">Écoute...</span>
          </>
        ) : (
          <>
            <Mic size={16} />
            <span className="hidden sm:inline">Dictée vocale</span>
          </>
        )}
      </button>

      {/* Animated sound waves when listening */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -top-2 -right-2 z-10"
          >
            <div className="flex items-end gap-0.5 h-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  className="w-0.5 bg-gradient-to-t from-primary to-purple-600 rounded-full"
                  style={{ height: 4 }}
                  animate={{
                    height: [4, 12, 6, 14, 8, 16, 4],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

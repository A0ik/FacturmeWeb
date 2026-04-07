'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CircleCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProgressIndicatorProps {
  totalSteps?: number;
  initialStep?: number;
  onComplete?: () => void;
  onNext?: (step: number) => void;
  onBack?: (step: number) => void;
}

const ProgressIndicator = ({
  totalSteps = 3,
  initialStep = 1,
  onComplete,
  onNext,
  onBack,
}: ProgressIndicatorProps) => {
  const [step, setStep] = useState(initialStep);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleContinue = () => {
    if (step < totalSteps) {
      const next = step + 1;
      setStep(next);
      setIsExpanded(false);
      onNext?.(next);
    } else {
      onComplete?.();
    }
  };

  const handleBack = () => {
    if (step === 2) setIsExpanded(true);
    if (step > 1) {
      const prev = step - 1;
      setStep(prev);
      onBack?.(prev);
    }
  };

  const dots = Array.from({ length: totalSteps }, (_, i) => i + 1);

  /* Progress bar width based on current step */
  const progressWidths: Record<number, string> = {
    1: '24px',
  };
  /* Dynamically compute: step 1 = 24px, last step ≈ all dots + gaps */
  const baseWidth = 24;
  const perStep = 36; /* roughly dot(8px) + gap(24px) + dot(8px) = ... tuned visually */
  const progressWidth = step === 1 ? baseWidth : baseWidth + (step - 1) * perStep;

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      {/* Dots progress */}
      <div className="flex items-center gap-6 relative">
        {dots.map((dot) => (
          <div
            key={dot}
            className={cn(
              "w-2 h-2 rounded-full relative z-10",
              dot <= step ? "bg-white" : "bg-gray-300"
            )}
          />
        ))}
        <motion.div
          initial={{ width: `${baseWidth}px`, x: 0 }}
          animate={{ width: `${progressWidth}px`, x: 0 }}
          className="absolute -left-[8px] -top-[8px] h-[32px] bg-green-500 rounded-full"
          transition={{ type: "spring", stiffness: 300, damping: 20, mass: 0.8 }}
        />
      </div>

      {/* Buttons */}
      <div className="w-full max-w-sm">
        <motion.div
          className="flex items-center gap-1"
          animate={{ justifyContent: isExpanded ? 'stretch' : 'space-between' }}
        >
          {!isExpanded && (
            <motion.button
              initial={{ opacity: 0, width: 0, scale: 0.8 }}
              animate={{ opacity: 1, width: '64px', scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, mass: 0.8 }}
              onClick={handleBack}
              className="px-4 py-3 text-black flex items-center justify-center bg-gray-100 font-semibold rounded-full hover:bg-gray-50 transition-colors flex-1 w-16 text-sm"
            >
              Retour
            </motion.button>
          )}
          <motion.button
            onClick={handleContinue}
            animate={{ flex: isExpanded ? 1 : 'inherit' }}
            className={cn(
              "px-4 py-3 rounded-full text-white bg-primary transition-colors flex-1 w-56",
              !isExpanded && 'w-44'
            )}
          >
            <div className="flex items-center font-[600] justify-center gap-2 text-sm">
              {step === totalSteps && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15, mass: 0.5 }}
                >
                  <CircleCheck size={16} />
                </motion.div>
              )}
              {step === totalSteps ? 'Terminer' : 'Continuer'}
            </div>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default ProgressIndicator;

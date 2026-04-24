'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenTool, Download, Share2, Check, X, Trash2, Plus, Loader2, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Signature {
  id: string;
  data: string; // Base64 image data
  date: Date;
  name: string;
}

interface SignaturePadProps {
  onSave?: (signature: Signature) => void;
  onClear?: () => void;
  height?: number;
  label?: string;
}

export function SignaturePad({ onSave, onClear, height = 200, label = 'Signature' }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = height;

    // Set default styles
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Handle resize
    const handleResize = () => {
      const tempImage = canvas.toDataURL();
      canvas.width = canvas.offsetWidth;
      canvas.height = height;
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (hasSignature) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = tempImage;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height, hasSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.closePath();
    setIsDrawing(false);

    // Auto-save
    if (onSave && hasSignature) {
      const signatureData: Signature = {
        id: crypto.randomUUID(),
        data: canvas.toDataURL('image/png'),
        date: new Date(),
        name: `Signature_${new Date().toISOString().split('T')[0]}`
      };
      onSave(signatureData);
    }
  };

  // Touch support
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleTouchEnd = () => {
    stopDrawing();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    if (onClear) onClear();
  };

  return (
    <div ref={containerRef} className="w-full">
      {label && (
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
          <PenTool size={14} className="text-primary" />
          {label}
        </label>
      )}

      <div className="relative group">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-white/10 rounded-2xl cursor-crosshair touch-none"
          style={{ height: `${height}px` }}
        />

        {/* Placeholder text */}
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Signez ici à la souris ou au doigt
            </p>
          </div>
        )}

        {/* Clear button */}
        {hasSignature && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={clearCanvas}
            className="absolute top-2 right-2 p-2 rounded-lg bg-white dark:bg-slate-700 shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
            title="Effacer la signature"
          >
            <Trash2 size={16} className="text-gray-500" />
          </motion.button>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        {hasSignature && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check size={12} />
            Signé
          </span>
        )}
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Appuyez et déplacez pour signer
        </span>
      </div>
    </div>
  );
}

// Composant de document avec signature
interface SignableDocumentProps {
  title: string;
  contractHtml: string;
  onSignatureComplete?: (signatures: Signature[]) => void;
}

export function SignableDocument({ title, contractHtml, onSignatureComplete }: SignableDocumentProps) {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentSigner, setCurrentSigner] = useState<'employer' | 'employee' | null>(null);
  const [downloading, setDownloading] = useState(false);

  const employerSignature = signatures.find(s => s.name.includes('Employeur'));
  const employeeSignature = signatures.find(s => s.name.includes('Salarie'));

  const handleSignatureSave = (signature: Signature) => {
    const newSignature = {
      ...signature,
      name: `${currentSigner === 'employer' ? 'Employeur' : 'Salarie'} - ${signature.name}`
    };

    const updatedSignatures = [...signatures, newSignature];
    setSignatures(updatedSignatures);

    if (onSignatureComplete) {
      onSignatureComplete(updatedSignatures);
    }

    setShowSignatureModal(false);
    setCurrentSigner(null);
  };

  const removeSignature = (id: string) => {
    const updatedSignatures = signatures.filter(s => s.id !== id);
    setSignatures(updatedSignatures);
    if (onSignatureComplete) {
      onSignatureComplete(updatedSignatures);
    }
  };

  const downloadDocument = async () => {
    setDownloading(true);
    try {
      // Create a complete HTML with signatures embedded
      const completeHtml = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
            .signature-section { margin-top: 60px; page-break-inside: avoid; }
            .signature-box { width: 45%; min-height: 100px; border: 1px dashed #ccc; margin-bottom: 20px; }
            .signature-img { max-height: 80px; }
          </style>
        </head>
        <body>
          ${contractHtml}
          <div class="signature-section">
            <h3>Signatures</h3>
            <div style="display: flex; justify-content: space-between;">
              <div class="signature-box">
                <small>Signature de l'employeur</small>
                ${employerSignature ? `<img src="${employerSignature.data}" class="signature-img" alt="Signature employeur" />` : '<br><br><br>'}
              </div>
              <div class="signature-box">
                <small>Signature du salarié</small>
                ${employeeSignature ? `<img src="${employeeSignature.data}" class="signature-img" alt="Signature salarié" />` : '<br><br><br>'}
              </div>
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 30px;">
              Document signé numériquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}<br>
              Conformément à l'article 1366 du Code civil, la signature numériquement a la même valeur juridique que la signature manuscrite.
            </p>
          </div>
        </body>
        </html>
      `;

      // Download as HTML file (can be converted to PDF)
      const blob = new Blob([completeHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}_${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const isFullySigned = employerSignature && employeeSignature;

  return (
    <div className="space-y-6">
      {/* Document preview */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-white/10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText size={20} className="text-primary" />
              {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Document prêt à être signé
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadDocument}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Télécharger
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Lien copié dans le presse-papier');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              <Share2 size={16} />
              Partager
            </button>
          </div>
        </div>

        {/* Signatures status */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Signatures requises</h4>

          {/* Employer signature */}
          <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl mb-2">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                employerSignature ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {employerSignature ? (
                  <Check size={18} className="text-green-600" />
                ) : (
                  <AlertCircle size={18} className="text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Employeur</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {employerSignature ? `Signé le ${new Date(employerSignature.date).toLocaleDateString('fr-FR')}` : 'En attente de signature'}
                </p>
              </div>
            </div>
            {employerSignature ? (
              <button
                onClick={() => removeSignature(employerSignature.id)}
                className="p-2 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                title="Supprimer la signature"
              >
                <X size={16} />
              </button>
            ) : (
              <button
                onClick={() => {
                  setCurrentSigner('employer');
                  setShowSignatureModal(true);
                }}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Signer
              </button>
            )}
          </div>

          {/* Employee signature */}
          <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                employeeSignature ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {employeeSignature ? (
                  <Check size={18} className="text-green-600" />
                ) : (
                  <AlertCircle size={18} className="text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Salarié</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {employeeSignature ? `Signé le ${new Date(employeeSignature.date).toLocaleDateString('fr-FR')}` : 'En attente de signature'}
                </p>
              </div>
            </div>
            {employeeSignature ? (
              <button
                onClick={() => removeSignature(employeeSignature.id)}
                className="p-2 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                title="Supprimer la signature"
              >
                <X size={16} />
              </button>
            ) : (
              <button
                onClick={() => {
                  setCurrentSigner('employee');
                  setShowSignatureModal(true);
                }}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Signer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Signature status */}
      {isFullySigned && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3"
        >
          <Check size={20} className="text-green-600 dark:text-green-400" />
          <div>
            <p className="text-sm font-semibold text-green-900 dark:text-green-100">Document entièrement signé</p>
            <p className="text-xs text-green-700 dark:text-green-300">Les deux parties ont signé le contrat</p>
          </div>
        </motion.div>
      )}

      {/* Signature Modal */}
      <AnimatePresence>
        {showSignatureModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowSignatureModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-white/10"
            >
              <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Signature - {currentSigner === 'employer' ? 'Employeur' : 'Salarié'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Signez dans le cadre ci-dessous
                  </p>
                </div>
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <div className="p-6">
                <SignaturePad
                  onSave={handleSignatureSave}
                  height={250}
                  label="Apposez votre signature"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Composant principal pour les contrats signables
interface ContractSigningProps {
  contractType: string;
  contractHtml: string;
  onSave?: (signedContract: { html: string; signatures: Signature[] }) => void;
}

export function ContractSigning({ contractType, contractHtml, onSave }: ContractSigningProps) {
  const [signatures, setSignatures] = useState<Signature[]>([]);

  const handleSignaturesComplete = (newSignatures: Signature[]) => {
    setSignatures(newSignatures);
    if (onSave) {
      onSave({
        html: contractHtml,
        signatures: newSignatures
      });
    }
  };

  return (
    <SignableDocument
      title={contractType}
      contractHtml={contractHtml}
      onSignatureComplete={handleSignaturesComplete}
    />
  );
}

export default SignaturePad;

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, File, Download, X } from 'lucide-react';

interface ExportFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportPDF: () => void;
  onExportDOCX: () => void;
  loading?: boolean;
}

export function ExportFormatModal({ isOpen, onClose, onExportPDF, onExportDOCX, loading }: ExportFormatModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Exporter le contrat
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Choisissez le format d'export
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    onExportPDF();
                    onClose();
                  }}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-white/10 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all group disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                      PDF (Document Portable)
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Format standard, non modifiable
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onExportDOCX();
                    onClose();
                  }}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 dark:border-white/10 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all group disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <File className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                      DOCX (Word Modifiable)
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Format modifiable, compatible Word/LibreOffice
                    </p>
                  </div>
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                <button
                  onClick={onClose}
                  className="w-full py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

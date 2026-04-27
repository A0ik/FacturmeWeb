'use client';

import React from 'react';
import { ContractHtmlData, generateContractHTML } from '@/lib/contract-html-generator';

interface ContractPreviewNewDesignProps {
  contractData: ContractHtmlData;
  onClose?: () => void;
}

/**
 * Component to preview contract with NEW elegant design
 * Allows printing/saving as PDF via browser print dialog
 */
export function ContractPreviewNewDesign({ contractData, onClose }: ContractPreviewNewDesignProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    // Generate HTML and load into iframe
    const html = generateContractHTML(contractData);
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
    }
  }, [contractData]);

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-6xl max-h-[95vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Aperçu du contrat</h2>
            <p className="text-sm text-gray-500">
              {contractData.employeeFirstName} {contractData.employeeLastName} — {contractData.contractType.toUpperCase()}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Télécharger PDF
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Fermer
              </button>
            )}
          </div>
        </div>

        {/* Content - iframe with contract */}
        <div className="flex-1 overflow-auto bg-gray-100">
          <iframe
            ref={iframeRef}
            title="Contract Preview"
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-gray-50 text-center text-sm text-gray-500">
          Astuce : Dans la fenêtre d'impression, choisissez "Enregistrer au format PDF" comme destination
        </div>
      </div>
    </div>
  );
}

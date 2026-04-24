'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function NewInvoiceRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const type = searchParams.get('type');
    const clientId = searchParams.get('clientId');
    const clientName = searchParams.get('clientName');

    // Build the correct URL based on document type
    let targetPath = '/documents/factures/new'; // default

    switch (type) {
      case 'invoice':
        targetPath = '/documents/factures/new';
        break;
      case 'quote':
        targetPath = '/documents/devis/new';
        break;
      case 'purchase_order':
        targetPath = '/documents/commandes/new';
        break;
      case 'delivery_note':
        targetPath = '/documents/livraisons/new';
        break;
      case 'deposit':
        targetPath = '/documents/acomptes/new';
        break;
      case 'credit_note':
        targetPath = '/documents/avoirs/new';
        break;
      default:
        targetPath = '/documents/factures/new';
    }

    // Preserve clientId and clientName params if present
    if (clientId || clientName) {
      const params = new URLSearchParams();
      if (clientId) params.set('clientId', clientId);
      if (clientName) params.set('clientName', clientName);
      targetPath += `?${params.toString()}`;
    }

    router.push(targetPath);
  }, [router, searchParams]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Redirection...</p>
      </div>
    </div>
  );
}
